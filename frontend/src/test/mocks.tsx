import React, { ReactNode } from 'react';
import { vi } from 'vitest';

// Mock baby data
export const mockBaby = { id: 1, name: 'Luna', birth_date: '2024-06-15T00:00:00Z', gender: 'girl', is_owner: true, shared_with_emails: [] };
export const mockBaby2 = { id: 2, name: 'Max', birth_date: '2024-01-10T00:00:00Z', gender: 'boy', is_owner: true };

export const mockFeeding = {
  id: 1, baby_id: 1, time: new Date(Date.now() - 3600000).toISOString(), type: 'breast' as const,
  duration_minutes: 15, amount_ml: null, notes: null,
};

export const mockDiaper = {
  id: 1, baby_id: 1, time: new Date(Date.now() - 1800000).toISOString(), type: 'pee' as const,
  poo_color: null, poo_consistency: null, poo_amount: null, notes: null,
};

export const mockSleep = {
  id: 1, baby_id: 1, start_time: new Date(Date.now() - 7200000).toISOString(),
  end_time: new Date(Date.now() - 3600000).toISOString(), duration_minutes: 60, notes: null,
};

export const mockCurrentSleep = {
  id: 2, baby_id: 1, start_time: new Date(Date.now() - 1800000).toISOString(),
  end_time: null, duration_minutes: null, notes: null,
};

export const mockDailySummary = {
  total_feedings: 5, total_diapers: 4, total_ml: 200, pee_count: 2, poo_count: 1, mixed_count: 1,
  total_sleep_minutes: 180, sleep_count: 3, pumping_count: 1, total_pumping_ml: 100,
  potty_count: 0, potty_success_count: 0, tummy_count: 1, tummy_minutes: 15, bath_count: 1,
};

export const mockDashboard = {
  last_feeding: mockFeeding, last_diaper: mockDiaper, last_sleep: mockSleep,
  current_sleep: null, last_pumping: null, last_potty: null, last_tummy: null,
  last_bath: null, last_supplement: null, daily_summary: mockDailySummary,
};

export const mockTimelineEvents = [
  { id: 1, event_type: 'feeding', time: new Date(Date.now() - 3600000).toISOString(), details: { type: 'breast', duration_minutes: 15 } },
  { id: 2, event_type: 'diaper', time: new Date(Date.now() - 1800000).toISOString(), details: { type: 'pee' } },
  { id: 3, event_type: 'sleep', time: new Date(Date.now() - 7200000).toISOString(), details: { end_time: new Date(Date.now() - 3600000).toISOString(), duration_minutes: 60 } },
];

// Mock useBaby hook
export const mockUseBaby = {
  babies: [mockBaby, mockBaby2],
  selectedBaby: mockBaby,
  loading: false,
  error: null,
  selectBaby: vi.fn(),
  addBaby: vi.fn(),
  removeBaby: vi.fn(),
  refresh: vi.fn(),
};

// Mock API
export const mockApi = {
  getBabies: vi.fn().mockResolvedValue([mockBaby]),
  createBaby: vi.fn().mockResolvedValue(mockBaby),
  updateBaby: vi.fn().mockResolvedValue(mockBaby),
  deleteBaby: vi.fn().mockResolvedValue(null),
  getDashboard: vi.fn().mockResolvedValue(mockDashboard),
  getFeedings: vi.fn().mockResolvedValue([mockFeeding]),
  createFeeding: vi.fn().mockResolvedValue(mockFeeding),
  deleteFeeding: vi.fn().mockResolvedValue(null),
  getDiapers: vi.fn().mockResolvedValue([mockDiaper]),
  createDiaper: vi.fn().mockResolvedValue(mockDiaper),
  getSleeps: vi.fn().mockResolvedValue([mockSleep]),
  createSleep: vi.fn().mockResolvedValue(mockSleep),
  endSleep: vi.fn().mockResolvedValue({ ...mockCurrentSleep, end_time: new Date().toISOString() }),
  getTimeline: vi.fn().mockResolvedValue(mockTimelineEvents),
  getGrowthRecords: vi.fn().mockResolvedValue([]),
  createGrowthRecord: vi.fn().mockResolvedValue({}),
  getUpcoming: vi.fn().mockResolvedValue({ upcoming: [] }),
  shareBaby: vi.fn().mockResolvedValue({}),
  getPumpings: vi.fn().mockResolvedValue([]),
  createPumping: vi.fn().mockResolvedValue({}),
  getAnalytics: vi.fn().mockResolvedValue({}),
  getSubscriptionStatus: vi.fn().mockResolvedValue({ premium: false }),
};
