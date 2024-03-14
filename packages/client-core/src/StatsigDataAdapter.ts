import { StatsigOptionsCommon } from './StatsigOptionsCommon';
import { StatsigUser } from './StatsigUser';

export type DataSource =
  | 'Uninitialized'
  | 'Loading'
  | 'NoValues'
  | 'Cache'
  | 'Network'
  | 'NetworkNotModified'
  | 'Bootstrap'
  | 'Prefetch';

export type StatsigDataAdapterResult = {
  readonly source: DataSource;
  readonly data: string;
  readonly receivedAt: number;
};

export const DataAdapterCachePrefix = 'statsig.cached';

/**
 * Describes a type that is used during intialize/update operations of a Statsig client.
 *
 * See below to find the default adapters, but know that it is possible to create your
 * own StatsigDataAdapter and provide it via {@link StatsigOptionsCommon.dataAdapter}.
 *
 * Defaults:
 *
 * - {@link StatsigClient} uses {@link EvaluationsDataAdapter}
 *
 * - {@link StatsigOnDeviceEvalClient} uses {@link SpecsDataAdapter}
 */
export type StatsigDataAdapter = {
  readonly _setInMemoryCache: (
    cache: Record<string, StatsigDataAdapterResult>,
  ) => void;

  /**
   * Called when the StatsigDataAdapter is attached to the Statsig client instance during construction.
   * @param {string} sdkKey The SDK key being used by the Statsig client.
   * @param {StatsigOptionsCommon | null} options The StatsigOptions being used by the Statsig client.
   */
  readonly attach: (
    sdkKey: string,
    options: StatsigOptionsCommon | null,
  ) => void;

  /**
   * Synchronously get data for the given user (if any). Called during initializeSync and/or updateUserSync.
   * It is also called during async update operations before StatsigDataAdapter.getDataAsync is called.
   * @param {StatsigUser | undefined} user The StatsigUser to get data for.
   * @returns {StatsigDataAdapterResult | null} The data that was found for the given StatsigUser.
   */
  readonly getDataSync: (user?: StatsigUser) => StatsigDataAdapterResult | null;

  /**
   * Asynchronously get data for the given user (if any). Called during initializeAsync and/or updateUserAsync.
   * @param {StatsigUser | undefined} user The StatsigUser to get data for.
   * @returns {StatsigDataAdapterResult | null} The data that was found for the given StatsigUser.
   */
  readonly getDataAsync: (
    current: StatsigDataAdapterResult | null,
    user?: StatsigUser,
  ) => Promise<StatsigDataAdapterResult | null>;
};