import { _getUserStorageKey } from './CacheKey';
import { _DJB2 } from './Hashing';
import { Log } from './Log';
import { NetworkDefault, NetworkParam } from './NetworkConfig';
import { NetworkCore, RequestArgsWithData } from './NetworkCore';
import { _getCurrentPageUrlSafe, _isServerEnv } from './SafeJs';
import { StatsigClientEmitEventFunc } from './StatsigClientBase';
import { StatsigEventInternal, _isExposureEvent } from './StatsigEvent';
import {
  NetworkConfigCommon,
  StatsigOptionsCommon,
} from './StatsigOptionsCommon';
import {
  Storage,
  _getObjectFromStorage,
  _setObjectInStorage,
} from './StorageProvider';
import { _getOverridableUrl } from './UrlOverrides';
import {
  _isCurrentlyVisible,
  _subscribeToVisiblityChanged,
} from './VisibilityObserving';

const DEFAULT_QUEUE_SIZE = 50;
const DEFAULT_FLUSH_INTERVAL_MS = 10_000;

const MAX_DEDUPER_KEYS = 1000;
const DEDUPER_WINDOW_DURATION_MS = 60_000;
const MAX_FAILED_LOGS = 500;

const QUICK_FLUSH_WINDOW_MS = 200;
const EVENT_LOGGER_MAP: Record<string, EventLogger> = {};

type SendEventsResponse = {
  success: boolean;
};

type StatsigEventExtras = {
  statsigMetadata?: {
    currentPage?: string;
  };
};

type EventQueue = (StatsigEventInternal & StatsigEventExtras)[];

const RetryFailedLogsTrigger = {
  Startup: 'startup',
  GainedFocus: 'gained_focus',
} as const;

type RetryFailedLogsTrigger =
  (typeof RetryFailedLogsTrigger)[keyof typeof RetryFailedLogsTrigger];

export class EventLogger {
  private _queue: EventQueue = [];
  private _flushIntervalId: ReturnType<typeof setInterval> | null | undefined;
  private _lastExposureTimeMap: Record<string, number> = {};
  private _nonExposedChecks: Record<string, number> = {};
  private _maxQueueSize: number;
  private _hasRunQuickFlush = false;
  private _creationTime = Date.now();
  private _isLoggingDisabled: boolean;
  private _logEventUrl: string;

  private static _safeFlushAndForget(sdkKey: string) {
    EVENT_LOGGER_MAP[sdkKey]?.flush().catch(() => {
      // noop
    });
  }

  private static _safeRetryFailedLogs(sdkKey: string) {
    EVENT_LOGGER_MAP[sdkKey]?._retryFailedLogs(
      RetryFailedLogsTrigger.GainedFocus,
    );
  }

  constructor(
    private _sdkKey: string,
    private _emitter: StatsigClientEmitEventFunc,
    private _network: NetworkCore,
    private _options: StatsigOptionsCommon<NetworkConfigCommon> | null,
  ) {
    this._isLoggingDisabled = _options?.disableLogging === true;
    this._maxQueueSize = _options?.loggingBufferMaxSize ?? DEFAULT_QUEUE_SIZE;

    const config = _options?.networkConfig;
    this._logEventUrl = _getOverridableUrl(
      config?.logEventUrl,
      config?.api,
      '/rgstr',
      NetworkDefault.eventsApi,
    );
  }

  setLoggingDisabled(isDisabled: boolean): void {
    this._isLoggingDisabled = isDisabled;
  }

  enqueue(event: StatsigEventInternal): void {
    if (!this._shouldLogEvent(event)) {
      return;
    }
    this._normalizeAndAppendEvent(event);
    this._quickFlushIfNeeded();
    if (this._queue.length > this._maxQueueSize) {
      EventLogger._safeFlushAndForget(this._sdkKey);
    }
  }

  incrementNonExposureCount(name: string): void {
    const current = this._nonExposedChecks[name] ?? 0;
    this._nonExposedChecks[name] = current + 1;
  }

  reset(): void {
    this._lastExposureTimeMap = {};
  }

  start(): void {
    if (_isServerEnv()) {
      return; // do not run in server environments
    }

    EVENT_LOGGER_MAP[this._sdkKey] = this;

    _subscribeToVisiblityChanged((visibility) => {
      if (visibility === 'background') {
        EventLogger._safeFlushAndForget(this._sdkKey);
      } else if (visibility === 'foreground') {
        EventLogger._safeRetryFailedLogs(this._sdkKey);
      }
    });

    this._retryFailedLogs(RetryFailedLogsTrigger.Startup);
    this._startBackgroundFlushInterval();
  }

  async stop(): Promise<void> {
    if (this._flushIntervalId) {
      clearInterval(this._flushIntervalId);
      this._flushIntervalId = null;
    }

    delete EVENT_LOGGER_MAP[this._sdkKey];

    await this.flush();
  }

  async flush(): Promise<void> {
    this._appendAndResetNonExposedChecks();

    if (this._queue.length === 0) {
      return;
    }

    const events = this._queue;
    this._queue = [];

    await this._sendEvents(events);
  }

  /**
   * We 'Quick Flush' following the very first event enqueued
   * within the quick flush window
   */
  private _quickFlushIfNeeded() {
    if (this._hasRunQuickFlush) {
      return;
    }
    this._hasRunQuickFlush = true;

    if (Date.now() - this._creationTime > QUICK_FLUSH_WINDOW_MS) {
      return;
    }

    setTimeout(
      () => EventLogger._safeFlushAndForget(this._sdkKey),
      QUICK_FLUSH_WINDOW_MS,
    );
  }

  private _shouldLogEvent(event: StatsigEventInternal): boolean {
    if (_isServerEnv()) {
      return false; // do not run in server environments
    }

    if (!_isExposureEvent(event)) {
      return true;
    }

    const user = event.user ? event.user : { statsigEnvironment: undefined };
    const userKey = _getUserStorageKey(this._sdkKey, user);

    const metadata = event.metadata ? event.metadata : {};
    const key = [
      event.eventName,
      userKey,
      metadata['gate'],
      metadata['config'],
      metadata['ruleID'],
    ].join('|');
    const previous = this._lastExposureTimeMap[key];
    const now = Date.now();

    if (previous && now - previous < DEDUPER_WINDOW_DURATION_MS) {
      return false;
    }

    if (Object.keys(this._lastExposureTimeMap).length > MAX_DEDUPER_KEYS) {
      this._lastExposureTimeMap = {};
    }

    this._lastExposureTimeMap[key] = now;
    return true;
  }

  private async _sendEvents(events: EventQueue): Promise<boolean> {
    if (this._isLoggingDisabled) {
      this._saveFailedLogsToStorage(events);
      return false;
    }

    try {
      const isInBackground = !_isCurrentlyVisible();

      const shouldUseBeacon =
        isInBackground &&
        this._network.isBeaconSupported() &&
        this._options?.networkConfig?.networkOverrideFunc == null;

      const response = shouldUseBeacon
        ? await this._sendEventsViaBeacon(events)
        : await this._sendEventsViaPost(events);

      if (response.success) {
        this._emitter({
          name: 'logs_flushed',
          events,
        });
        return true;
      } else {
        Log.warn('Failed to flush events.');
        this._saveFailedLogsToStorage(events);
        return false;
      }
    } catch {
      Log.warn('Failed to flush events.');
      return false;
    }
  }

  private async _sendEventsViaPost(
    events: StatsigEventInternal[],
  ): Promise<SendEventsResponse> {
    const result = await this._network.post(this._getRequestData(events));

    const code = result?.code ?? -1;
    return { success: code >= 200 && code < 300 };
  }

  private async _sendEventsViaBeacon(
    events: StatsigEventInternal[],
  ): Promise<SendEventsResponse> {
    return {
      success: await this._network.beacon(this._getRequestData(events)),
    };
  }

  private _getRequestData(events: StatsigEventInternal[]): RequestArgsWithData {
    return {
      sdkKey: this._sdkKey,
      data: {
        events,
      },
      url: this._logEventUrl,
      retries: 3,
      isCompressable: true,
      params: {
        [NetworkParam.EventCount]: String(events.length),
      },
    };
  }

  private _saveFailedLogsToStorage(events: EventQueue) {
    while (events.length > MAX_FAILED_LOGS) {
      events.shift();
    }

    const storageKey = this._getStorageKey();

    try {
      _setObjectInStorage(storageKey, events);
    } catch {
      Log.warn('Unable to save failed logs to storage');
    }
  }

  private _retryFailedLogs(trigger: RetryFailedLogsTrigger) {
    const storageKey = this._getStorageKey();
    (async () => {
      if (!Storage.isReady()) {
        await Storage.isReadyResolver();
      }

      const events = _getObjectFromStorage<EventQueue>(storageKey);
      if (!events) {
        return;
      }

      if (trigger === RetryFailedLogsTrigger.Startup) {
        Storage.removeItem(storageKey);
      }

      const isSuccess = await this._sendEvents(events);
      if (isSuccess && trigger === RetryFailedLogsTrigger.GainedFocus) {
        Storage.removeItem(storageKey);
      }
    })().catch(() => {
      Log.warn('Failed to flush stored logs');
    });
  }

  private _getStorageKey() {
    return `statsig.failed_logs.${_DJB2(this._sdkKey)}`;
  }

  private _normalizeAndAppendEvent(event: StatsigEventInternal) {
    if (event.user) {
      event.user = { ...event.user };
      delete event.user.privateAttributes;
    }

    const extras: StatsigEventExtras = {};
    const currentPage = this._getCurrentPageUrl();
    if (currentPage) {
      extras.statsigMetadata = { currentPage };
    }

    const final = {
      ...event,
      ...extras,
    };

    Log.debug('Enqueued Event:', final);
    this._queue.push(final);
  }

  private _appendAndResetNonExposedChecks() {
    if (Object.keys(this._nonExposedChecks).length === 0) {
      return;
    }

    this._normalizeAndAppendEvent({
      eventName: 'statsig::non_exposed_checks',
      user: null,
      time: Date.now(),
      metadata: {
        checks: { ...this._nonExposedChecks },
      },
    });

    this._nonExposedChecks = {};
  }

  private _getCurrentPageUrl(): string | undefined {
    if (this._options?.includeCurrentPageUrlWithEvents === false) {
      return;
    }

    return _getCurrentPageUrlSafe();
  }

  private _startBackgroundFlushInterval() {
    const flushInterval =
      this._options?.loggingIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;

    const intervalId = setInterval(() => {
      const logger = EVENT_LOGGER_MAP[this._sdkKey];
      if (logger._flushIntervalId !== intervalId) {
        clearInterval(intervalId);
      } else {
        EventLogger._safeFlushAndForget(this._sdkKey);
      }
    }, flushInterval);
    this._flushIntervalId = intervalId;
  }
}
