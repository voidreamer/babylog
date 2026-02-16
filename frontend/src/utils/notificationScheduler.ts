import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import i18next from 'i18next';
import { api } from '../api/client';
import { toast } from 'sonner';

// --- Settings ---

export interface NotificationSettings {
  enabled: boolean;
  appointments: boolean;
  medications: boolean;
  medicationTime: string; // "HH:mm"
}

const SETTINGS_KEY = 'heybub-notification-settings';

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  appointments: true,
  medications: true,
  medicationTime: '09:00',
};

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// --- Permission ---

const isNative = () => Capacitor.isNativePlatform();

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (isNative()) {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    }
    // Web fallback
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.error('requestNotificationPermission failed:', e);
    return false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  try {
    if (isNative()) {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted';
    }
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  } catch (e) {
    console.error('checkNotificationPermission failed:', e);
    return false;
  }
}

export async function sendTestNotification(): Promise<boolean> {
  try {
    if (!isNative()) {
      toast.info('Test notification! Notifications are working.', { duration: 5000 });
      return true;
    }
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      console.warn('No notification permission for test');
      return false;
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 99999,
          title: 'HeyBub Test',
          body: 'Notifications are working!',
          schedule: { at: new Date(Date.now() + 3000) },
        },
      ],
    });
    return true;
  } catch (e) {
    console.error('sendTestNotification failed:', e);
    return false;
  }
}

// --- ID ranges ---
// Visits (day-before): 10000-19999
// Visits (morning-of): 20000-29999
// Vaccinations (day-before): 30000-39999
// Vaccinations (morning-of): 40000-49999
// Medications: 50000+

// --- Scheduling ---

function t(key: string, options?: Record<string, string>): string {
  return i18next.t(key, { ns: 'settings', ...options });
}

function scheduleDateAt(dateStr: string, hours: number, minutes: number): Date {
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function dayBefore(dateStr: string, hours: number, minutes: number): Date {
  const d = scheduleDateAt(dateStr, hours, minutes);
  d.setDate(d.getDate() - 1);
  return d;
}

async function scheduleAppointmentNotifications(babyId: number, babyName: string) {
  const now = new Date();
  const notifications: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date };
    extra: { type: string };
  }> = [];

  try {
    const visits = await api.getDoctorVisits(babyId);
    for (const visit of visits) {
      if (!visit.next_visit_date) continue;
      const idx = visit.id % 10000;

      // Day before at 6 PM
      const dayBeforeDate = dayBefore(visit.next_visit_date, 18, 0);
      if (dayBeforeDate > now) {
        notifications.push({
          id: 10000 + idx,
          title: t('notifications.visitTomorrow', { babyName }),
          body: t('notifications.visitTomorrowBody', { type: visit.visit_type || '' }),
          schedule: { at: dayBeforeDate },
          extra: { type: 'appointment' },
        });
      }

      // Morning of at 8 AM
      const morningOf = scheduleDateAt(visit.next_visit_date, 8, 0);
      if (morningOf > now) {
        notifications.push({
          id: 20000 + idx,
          title: t('notifications.visitToday', { babyName }),
          body: t('notifications.visitTodayBody', { type: visit.visit_type || '' }),
          schedule: { at: morningOf },
          extra: { type: 'appointment' },
        });
      }
    }
  } catch (e) {
    console.warn('Failed to fetch visits for notifications:', e);
  }

  try {
    const vaccinations = await api.getVaccinations(babyId);
    for (const vax of vaccinations) {
      if (!vax.next_due_date) continue;
      const idx = vax.id % 10000;

      // Day before at 6 PM
      const dayBeforeDate = dayBefore(vax.next_due_date, 18, 0);
      if (dayBeforeDate > now) {
        notifications.push({
          id: 30000 + idx,
          title: t('notifications.vaccinationDue', { babyName }),
          body: t('notifications.vaccinationDueBody', {
            vaccine: vax.vaccine_name || '',
            dose: String(vax.dose_number || ''),
          }),
          schedule: { at: dayBeforeDate },
          extra: { type: 'vaccination' },
        });
      }

      // Morning of at 8 AM
      const morningOf = scheduleDateAt(vax.next_due_date, 8, 0);
      if (morningOf > now) {
        notifications.push({
          id: 40000 + idx,
          title: t('notifications.vaccinationDue', { babyName }),
          body: t('notifications.vaccinationDueBody', {
            vaccine: vax.vaccine_name || '',
            dose: String(vax.dose_number || ''),
          }),
          schedule: { at: morningOf },
          extra: { type: 'vaccination' },
        });
      }
    }
  } catch (e) {
    console.warn('Failed to fetch vaccinations for notifications:', e);
  }

  return notifications;
}

async function scheduleMedicationNotifications(babyId: number, babyName: string, medicationTime: string) {
  const notifications: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date; every: 'day' };
    extra: { type: string };
    actionTypeId: string;
  }> = [];

  try {
    // Check if a supplement was already logged today — skip if so
    const supplements = await api.getSupplements(babyId, 10);
    const todayStr = new Date().toISOString().split('T')[0];
    const loggedToday = supplements.some((s: { time?: string }) => s.time?.startsWith(todayStr));
    if (loggedToday) return notifications;

    const medications = await api.getMedications(babyId);
    const activeMeds = medications.filter((m: { is_active?: boolean }) => m.is_active);

    if (activeMeds.length === 0) return notifications;

    const medNames = activeMeds.map((m: { medication_name?: string }) => m.medication_name || '').join(', ');
    const [hours, minutes] = medicationTime.split(':').map(Number);

    // Schedule a daily repeating notification
    const scheduleAt = new Date();
    scheduleAt.setHours(hours, minutes, 0, 0);
    // If the time has already passed today, start tomorrow
    if (scheduleAt <= new Date()) {
      scheduleAt.setDate(scheduleAt.getDate() + 1);
    }

    notifications.push({
      id: 50000,
      title: t('notifications.medicationReminder', { babyName }),
      body: t('notifications.medicationReminderBody', { medications: medNames }),
      schedule: { at: scheduleAt, every: 'day' },
      extra: { type: 'medication' },
      actionTypeId: 'MEDICATION_REMINDER',
    });
  } catch (e) {
    console.warn('Failed to fetch medications for notifications:', e);
  }

  return notifications;
}

export async function rescheduleAll(babyId: number, babyName: string): Promise<void> {
  if (!isNative()) return;

  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;

  // Cancel all existing
  await cancelAll();

  const allNotifications: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date; every?: string };
    extra?: { type: string };
    actionTypeId?: string;
  }> = [];

  if (settings.appointments) {
    const apptNotifs = await scheduleAppointmentNotifications(babyId, babyName);
    allNotifications.push(...apptNotifs);
  }

  if (settings.medications) {
    const medNotifs = await scheduleMedicationNotifications(babyId, babyName, settings.medicationTime);
    allNotifications.push(...medNotifs);
  }

  if (allNotifications.length === 0) return;

  try {
    await LocalNotifications.schedule({
      notifications: allNotifications.map((n) => ({
        title: n.title,
        body: n.body,
        id: n.id,
        schedule: n.schedule as any,
        extra: n.extra,
        actionTypeId: n.actionTypeId,
      })),
    });
  } catch (e) {
    console.warn('Failed to schedule notifications:', e);
  }
}

export async function cancelAll(): Promise<void> {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch (e) {
    console.warn('Failed to cancel notifications:', e);
  }
}

// --- PWA Web Fallback ---

export async function checkAndShowWebReminders(babyId: number, babyName: string): Promise<void> {
  if (isNative()) return;

  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (settings.appointments) {
    try {
      const visits = await api.getDoctorVisits(babyId);
      for (const visit of visits) {
        if (visit.next_visit_date === todayStr) {
          toast.info(t('notifications.visitTodayBody', { type: visit.visit_type || '' }), {
            description: babyName,
            duration: 8000,
          });
        } else if (visit.next_visit_date === tomorrowStr) {
          toast.info(t('notifications.visitTomorrowBody', { type: visit.visit_type || '' }), {
            description: babyName,
            duration: 8000,
          });
        }
      }

      const vaccinations = await api.getVaccinations(babyId);
      for (const vax of vaccinations) {
        if (vax.next_due_date === todayStr || vax.next_due_date === tomorrowStr) {
          toast.info(
            t('notifications.vaccinationDueBody', {
              vaccine: vax.vaccine_name || '',
              dose: String(vax.dose_number || ''),
            }),
            { description: babyName, duration: 8000 }
          );
        }
      }
    } catch {
      // Silently fail for web reminders
    }
  }

  if (settings.medications) {
    try {
      // Check if a supplement was already logged today — skip reminder if so
      const supplements = await api.getSupplements(babyId, 10);
      const loggedToday = supplements.some((s: { time?: string }) => s.time?.startsWith(todayStr));
      if (loggedToday) return;

      const medications = await api.getMedications(babyId);
      const activeMeds = medications.filter((m: { is_active?: boolean }) => m.is_active);
      if (activeMeds.length > 0) {
        const medNames = activeMeds.map((m: { medication_name?: string }) => m.medication_name || '').join(', ');
        toast.info(t('notifications.medicationReminderBody', { medications: medNames }), {
          description: babyName,
          duration: 8000,
        });
      }
    } catch {
      // Silently fail for web reminders
    }
  }
}
