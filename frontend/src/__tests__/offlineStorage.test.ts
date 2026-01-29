import { describe, it, expect, vi } from 'vitest';

// Mock idb
const mockStore = new Map<string, any>();
const mockStoreObj = {
  put: vi.fn((val: any) => { mockStore.set(val.id || val.key, val); }),
  get: vi.fn((key: any) => mockStore.get(key)),
  getAll: vi.fn(() => Array.from(mockStore.values())),
  getAllKeys: vi.fn(() => Array.from(mockStore.keys())),
  delete: vi.fn((key: any) => mockStore.delete(key)),
  clear: vi.fn(() => mockStore.clear()),
  count: vi.fn(() => mockStore.size),
  index: vi.fn(() => ({
    getAll: vi.fn(() => Array.from(mockStore.values())),
    getAllKeys: vi.fn(() => Array.from(mockStore.keys())),
  })),
};

const mockTx = {
  objectStore: vi.fn(() => mockStoreObj),
  done: Promise.resolve(),
};

const mockDB = {
  transaction: vi.fn(() => mockTx),
  put: vi.fn((store: string, val: any) => mockStore.set(val.id || val.key, val)),
  get: vi.fn((store: string, key: any) => mockStore.get(key)),
  getAll: vi.fn(() => Array.from(mockStore.values())),
  add: vi.fn((store: string, val: any) => { const id = Date.now(); mockStore.set(id, { ...val, id }); }),
  delete: vi.fn((store: string, key: any) => mockStore.delete(key)),
  count: vi.fn(() => mockStore.size),
  objectStoreNames: { contains: () => true },
};

vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
}));

// Import after mocking
import { isOnline } from '../utils/offlineStorage';

describe('offlineStorage', () => {
  it('isOnline returns navigator.onLine value', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    expect(isOnline()).toBe(true);
  });

  it('isOnline returns false when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    expect(isOnline()).toBe(false);
    // Reset
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  // Test the exported functions exist and are callable
  it('exports cache functions', async () => {
    const mod = await import('../utils/offlineStorage');
    expect(typeof mod.cacheBabies).toBe('function');
    expect(typeof mod.getCachedBabies).toBe('function');
    expect(typeof mod.cacheFeedings).toBe('function');
    expect(typeof mod.getCachedFeedings).toBe('function');
    expect(typeof mod.queueForSync).toBe('function');
    expect(typeof mod.getPendingSyncActions).toBe('function');
    expect(typeof mod.clearAllOfflineData).toBe('function');
  });

  it('exports metadata functions', async () => {
    const mod = await import('../utils/offlineStorage');
    expect(typeof mod.setMetadata).toBe('function');
    expect(typeof mod.getMetadata).toBe('function');
  });

  it('exports cache stats function', async () => {
    const mod = await import('../utils/offlineStorage');
    expect(typeof mod.getCacheStats).toBe('function');
  });
});
