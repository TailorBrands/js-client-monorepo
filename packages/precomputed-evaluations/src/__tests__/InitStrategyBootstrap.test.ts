import fetchMock from 'jest-fetch-mock';

import { getUserStorageKey } from '@statsig/client-core';

import PrecomputedEvaluationsClient from '../PrecomputedEvaluationsClient';
import { BootstrapEvaluationsDataProvider } from '../data-providers/BootstrapEvaluationsDataProvider';
import { LocalStorageCacheEvaluationsDataProvider } from '../data-providers/LocalStorageCacheEvaluationsDataProvider';
import { DelayedNetworkEvaluationsDataProvider } from '../data-providers/NetworkEvaluationsDataProvider';
import { MockLocalStorage } from './MockLocalStorage';
import InitializeResponse from './initialize.json';

describe('Init Strategy - Bootstrap', () => {
  const sdkKey = 'client-key';
  const user = { userID: 'a-user' };
  const cacheKey = getUserStorageKey(sdkKey, user);

  const bootstrap = new BootstrapEvaluationsDataProvider();
  bootstrap.addDataForUser(sdkKey, JSON.stringify(InitializeResponse), user);

  const options = {
    dataProviders: [
      new LocalStorageCacheEvaluationsDataProvider(),
      bootstrap,
      DelayedNetworkEvaluationsDataProvider.create(),
    ],
  };

  let client: PrecomputedEvaluationsClient;
  let storageMock: MockLocalStorage;

  beforeAll(async () => {
    storageMock = MockLocalStorage.enabledMockStorage();
    storageMock.clear();

    fetchMock.enableMocks();
    fetchMock.mockResponse(JSON.stringify(InitializeResponse));

    client = new PrecomputedEvaluationsClient(sdkKey, user, options);

    // Purposely not awaiting
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    client.initialize();
  });

  afterAll(() => {
    MockLocalStorage.disableMockStorage();
  });

  it('is ready after initialize', () => {
    expect(client.loadingStatus).toBe('Ready');
  });

  it('reports source as "Bootstrap"', () => {
    const gate = client.getFeatureGate('a_gate');
    expect(gate.source).toBe('Bootstrap');
  });

  it('writes the updated values to cache', () => {
    expect(storageMock.data[cacheKey]).toBeDefined();
  });

  describe('the next session', () => {
    beforeAll(async () => {
      fetchMock.mockClear();

      client = new PrecomputedEvaluationsClient(sdkKey, user, options);

      // Purposely not awaiting
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      client.initialize();
    });

    it('is ready after initialize', () => {
      expect(client.loadingStatus).toBe('Ready');
    });

    it('reports source as "Cache"', () => {
      const gate = client.getFeatureGate('a_gate');
      expect(gate.source).toBe('Cache');
    });
  });
});