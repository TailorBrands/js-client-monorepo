import { STATSIG_STABLE_ID_KEY, StableID } from '../StableID';
import { MockLocalStorage } from './MockLocalStorage';

export const UUID_V4_REGEX =
  /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}/;

async function getStableIDFromIsolatedModule(): Promise<string> {
  let result: string | null = null;
  await jest.isolateModulesAsync(async () => {
    const s = (await import('../StableID')).StableID;
    result = await s.get();
  });

  return result ?? 'error';
}

describe('StableID', () => {
  let storageMock: MockLocalStorage;

  beforeAll(() => {
    storageMock = MockLocalStorage.enabledMockStorage();
  });

  describe('when storage is empty', () => {
    let stableID: string;

    beforeAll(async () => {
      storageMock.clear();
      stableID = await getStableIDFromIsolatedModule();
    });

    it('generates a new ID when none is set in storage', async () => {
      expect(stableID).toMatch(UUID_V4_REGEX);
    });

    it('persists to storage', () => {
      expect(JSON.parse(storageMock.data[STATSIG_STABLE_ID_KEY])).toBe(
        stableID,
      );
    });

    it('returns the same value when queried again', async () => {
      const again = await StableID.get();
      expect(again).toBe(stableID);
    });
  });

  describe('when storage has a stable id', () => {
    const existingStableID = '860e7083-d9ee-4d1a-bc71-e671ad522e0f';

    let stableID: string;

    beforeAll(async () => {
      storageMock.clear();
      storageMock.data[STATSIG_STABLE_ID_KEY] =
        JSON.stringify(existingStableID);

      stableID = await getStableIDFromIsolatedModule();
    });

    it('matches what is in storage', async () => {
      expect(stableID).toEqual(existingStableID);
    });

    it('still has the same value in storage', () => {
      expect(JSON.parse(storageMock.data[STATSIG_STABLE_ID_KEY])).toBe(
        existingStableID,
      );
    });

    it('returns the same value when queried again', async () => {
      const again = await getStableIDFromIsolatedModule();
      expect(again).toBe(existingStableID);
    });
  });

  it('generates random ids', async () => {
    const first = await getStableIDFromIsolatedModule();
    storageMock.clear();
    const second = await getStableIDFromIsolatedModule();

    expect(first).not.toBe(second);
  });
});