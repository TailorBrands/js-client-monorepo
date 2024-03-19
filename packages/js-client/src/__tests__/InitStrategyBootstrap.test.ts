import fetchMock from 'jest-fetch-mock';
import { InitResponseString } from 'statsig-test-helpers';

import {
  DataAdapterCachePrefix,
  getUserStorageKey,
} from '@statsig/client-core';

import StatsigClient from '../StatsigClient';
import { MockLocalStorage } from './MockLocalStorage';

describe('Init Strategy - Bootstrap', () => {
  const sdkKey = 'client-key';
  const user = { userID: 'a-user' };
  const cacheKey = `${DataAdapterCachePrefix}.evaluations.${getUserStorageKey(sdkKey, user)}`;

  let client: StatsigClient;
  let storageMock: MockLocalStorage;

  beforeAll(async () => {
    storageMock = MockLocalStorage.enabledMockStorage();
    storageMock.clear();

    fetchMock.enableMocks();
    fetchMock.mockResponse(InitResponseString);

    client = new StatsigClient(sdkKey, user);
    client.dataAdapter.setData(InitResponseString, user);

    client.initializeSync();
  });

  afterAll(() => {
    MockLocalStorage.disableMockStorage();
  });

  it('is ready after initialize', () => {
    expect(client.loadingStatus).toBe('Ready');
  });

  it('reports source as "Bootstrap"', () => {
    const gate = client.getFeatureGate('a_gate');
    expect(gate.details.reason).toBe('Bootstrap:Recognized');
  });

  it('writes the updated values to cache', () => {
    expect(storageMock.data[cacheKey]).toBeDefined();
  });

  describe('the next session', () => {
    beforeAll(async () => {
      fetchMock.mockClear();

      client = new StatsigClient(sdkKey, user);
      client.initializeSync();
    });

    it('is ready after initialize', () => {
      expect(client.loadingStatus).toBe('Ready');
    });

    it('reports source as "Cache"', () => {
      const gate = client.getFeatureGate('a_gate');
      expect(gate.details.reason).toBe('Cache:Recognized');
    });
  });
});
