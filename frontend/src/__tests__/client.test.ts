import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

// Mock offlineStorage
vi.mock('../utils/offlineStorage', () => ({
  isOnline: vi.fn(() => true),
  cacheBabies: vi.fn(),
  getCachedBabies: vi.fn().mockResolvedValue([]),
  cacheFeedings: vi.fn(),
  getCachedFeedings: vi.fn().mockResolvedValue([]),
  cacheSleeps: vi.fn(),
  getCachedSleeps: vi.fn().mockResolvedValue([]),
  cacheDiapers: vi.fn(),
  getCachedDiapers: vi.fn().mockResolvedValue([]),
  cachePumpings: vi.fn(),
  getCachedPumpings: vi.fn().mockResolvedValue([]),
  addCachedFeeding: vi.fn(),
  addCachedSleep: vi.fn(),
  addCachedDiaper: vi.fn(),
  addCachedPumping: vi.fn(),
  cacheActivities: vi.fn(),
  getCachedActivities: vi.fn().mockResolvedValue([]),
  addCachedActivity: vi.fn(),
  queueForSync: vi.fn(),
  cacheDoctorVisits: vi.fn(),
  getCachedDoctorVisits: vi.fn().mockResolvedValue([]),
  cacheVaccinations: vi.fn(),
  getCachedVaccinations: vi.fn().mockResolvedValue([]),
  cacheMedications: vi.fn(),
  getCachedMedications: vi.fn().mockResolvedValue([]),
  cacheMilestones: vi.fn(),
  getCachedMilestones: vi.fn().mockResolvedValue([]),
  cacheGrowthRecords: vi.fn(),
  getCachedGrowthRecords: vi.fn().mockResolvedValue([]),
}));

import { api } from '../api/client';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('adds auth headers to requests', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ id: 1, name: 'Luna' }]),
    });

    await api.getBabies();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/babies/'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('throws on 401 response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    await expect(api.getBaby(1)).rejects.toThrow('Unauthorized');
  });

  it('throws on non-OK response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Server error' }),
    });

    await expect(api.getBaby(1)).rejects.toThrow('Server error');
  });

  it('returns null for 204 responses', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const result = await api.deleteBaby(1);
    expect(result).toBeNull();
  });

  it('creates baby with POST', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, name: 'Luna' }),
    });

    const result = await api.createBaby({ name: 'Luna' });
    expect(result).toEqual({ id: 1, name: 'Luna' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/babies/'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('caches babies after fetching', async () => {
    const babies = [{ id: 1, name: 'Luna' }];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(babies),
    });

    await api.getBabies();
    const { cacheBabies } = require('../utils/offlineStorage');
    expect(cacheBabies).toHaveBeenCalledWith(babies);
  });
});
