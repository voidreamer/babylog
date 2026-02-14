import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock @capacitor/core before importing the module under test
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    schedule: vi.fn().mockResolvedValue(undefined),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
    cancel: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('i18next', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => {
      // Simple mock: return key with interpolated values
      let result = key;
      if (options) {
        Object.entries(options).forEach(([k, v]) => {
          if (k !== 'ns') result = result.replace(`{{${k}}}`, String(v));
        });
      }
      return result;
    },
  },
}));

vi.mock('../api/client', () => ({
  api: {
    getDoctorVisits: vi.fn().mockResolvedValue([]),
    getVaccinations: vi.fn().mockResolvedValue([]),
    getMedications: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  getNotificationSettings,
  saveNotificationSettings,
  rescheduleAll,
  cancelAll,
  checkAndShowWebReminders,
  type NotificationSettings,
} from '../utils/notificationScheduler';
import { api } from '../api/client';
import { toast } from 'sonner';

describe('notificationScheduler', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('settings management', () => {
    it('returns default settings when none saved', () => {
      const settings = getNotificationSettings();
      expect(settings).toEqual({
        enabled: false,
        appointments: true,
        medications: true,
        medicationTime: '09:00',
      });
    });

    it('round-trips settings through save/get', () => {
      const custom: NotificationSettings = {
        enabled: true,
        appointments: false,
        medications: true,
        medicationTime: '14:30',
      };
      saveNotificationSettings(custom);
      const loaded = getNotificationSettings();
      expect(loaded).toEqual(custom);
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('heybub-notification-settings', 'not valid json');
      const settings = getNotificationSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.medicationTime).toBe('09:00');
    });

    it('merges partial saved settings with defaults', () => {
      localStorage.setItem('heybub-notification-settings', JSON.stringify({ enabled: true }));
      const settings = getNotificationSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.appointments).toBe(true);
      expect(settings.medications).toBe(true);
      expect(settings.medicationTime).toBe('09:00');
    });
  });

  describe('rescheduleAll', () => {
    it('does nothing on web (non-native)', async () => {
      saveNotificationSettings({ enabled: true, appointments: true, medications: true, medicationTime: '09:00' });
      await rescheduleAll(1, 'TestBaby');
      // On web, should not call API since isNative() returns false
      expect(api.getDoctorVisits).not.toHaveBeenCalled();
    });

    it('does nothing when notifications are disabled', async () => {
      saveNotificationSettings({ enabled: false, appointments: true, medications: true, medicationTime: '09:00' });
      await rescheduleAll(1, 'TestBaby');
      expect(api.getDoctorVisits).not.toHaveBeenCalled();
    });
  });

  describe('cancelAll', () => {
    it('does nothing on web (non-native)', async () => {
      // Should not throw
      await cancelAll();
    });
  });

  describe('checkAndShowWebReminders', () => {
    it('does nothing when notifications are disabled', async () => {
      saveNotificationSettings({ enabled: false, appointments: true, medications: true, medicationTime: '09:00' });
      await checkAndShowWebReminders(1, 'TestBaby');
      expect(api.getDoctorVisits).not.toHaveBeenCalled();
      expect(toast.info).not.toHaveBeenCalled();
    });

    it('shows toast for visits today when enabled', async () => {
      const today = new Date().toISOString().split('T')[0];
      saveNotificationSettings({ enabled: true, appointments: true, medications: false, medicationTime: '09:00' });
      vi.mocked(api.getDoctorVisits).mockResolvedValueOnce([
        { id: 1, next_visit_date: today, visit_type: 'Checkup' },
      ]);
      vi.mocked(api.getVaccinations).mockResolvedValueOnce([]);

      await checkAndShowWebReminders(1, 'TestBaby');
      expect(toast.info).toHaveBeenCalled();
    });

    it('shows toast for visits tomorrow when enabled', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      saveNotificationSettings({ enabled: true, appointments: true, medications: false, medicationTime: '09:00' });
      vi.mocked(api.getDoctorVisits).mockResolvedValueOnce([
        { id: 2, next_visit_date: tomorrowStr, visit_type: 'Dental' },
      ]);
      vi.mocked(api.getVaccinations).mockResolvedValueOnce([]);

      await checkAndShowWebReminders(1, 'TestBaby');
      expect(toast.info).toHaveBeenCalled();
    });

    it('shows toast for active medications when enabled', async () => {
      saveNotificationSettings({ enabled: true, appointments: false, medications: true, medicationTime: '09:00' });
      vi.mocked(api.getMedications).mockResolvedValueOnce([
        { id: 1, medication_name: 'Vitamin D', is_active: true },
        { id: 2, medication_name: 'Iron', is_active: true },
        { id: 3, medication_name: 'Old Med', is_active: false },
      ]);

      await checkAndShowWebReminders(1, 'TestBaby');
      expect(toast.info).toHaveBeenCalledTimes(1);
    });

    it('skips medications toast when no active meds', async () => {
      saveNotificationSettings({ enabled: true, appointments: false, medications: true, medicationTime: '09:00' });
      vi.mocked(api.getMedications).mockResolvedValueOnce([
        { id: 1, medication_name: 'Old Med', is_active: false },
      ]);

      await checkAndShowWebReminders(1, 'TestBaby');
      expect(toast.info).not.toHaveBeenCalled();
    });

    it('respects appointments toggle off', async () => {
      saveNotificationSettings({ enabled: true, appointments: false, medications: false, medicationTime: '09:00' });
      await checkAndShowWebReminders(1, 'TestBaby');
      expect(api.getDoctorVisits).not.toHaveBeenCalled();
      expect(api.getMedications).not.toHaveBeenCalled();
    });
  });
});
