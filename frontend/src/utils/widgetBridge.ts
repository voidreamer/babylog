import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Data contract for iOS WidgetKit / Android Glance widgets
// ---------------------------------------------------------------------------

export interface WidgetData {
  baby_name: string;
  baby_id: number;
  last_updated: string; // ISO 8601 timestamp

  last_feeding: {
    time: string;
    type: string; // formula, breast, bottle, solid
    amount?: string; // "4oz", "120ml"
    minutes_ago: number;
  } | null;

  last_diaper: {
    time: string;
    type: string; // pee, poo, mixed
    minutes_ago: number;
  } | null;

  last_sleep: {
    start_time: string;
    end_time: string | null; // null = currently sleeping
    duration_minutes: number | null;
    is_active: boolean;
  } | null;

  today_summary: {
    feedings: number;
    diapers: number;
    sleep_hours: number;
    last_update: string;
  };
}

const WIDGET_DATA_KEY = 'heybub_widget_data';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WIDGET_SUITE_NAME = 'group.com.heybub.app'; // iOS App Group name

// ---------------------------------------------------------------------------
// Write widget data to shared storage
// ---------------------------------------------------------------------------

/**
 * Write widget data to shared storage.
 *
 * - iOS: writes to UserDefaults via Capacitor Preferences (requires App Group
 *   configuration in Xcode so the widget extension can read the same store).
 * - Android: writes to SharedPreferences.
 * - Web: writes to localStorage (no widgets, but useful for debugging).
 */
export async function updateWidgetData(data: WidgetData): Promise<void> {
  const json = JSON.stringify(data);

  if (Capacitor.isNativePlatform()) {
    // Preferences plugin writes to UserDefaults (iOS) / SharedPreferences (Android).
    // On iOS the widget extension must share the same App Group suite name to
    // read this data.  See src/widgets/README_WIDGETS_IOS.md for setup steps.
    await Preferences.set({
      key: WIDGET_DATA_KEY,
      value: json,
    });
  } else {
    localStorage.setItem(WIDGET_DATA_KEY, json);
  }
}

// ---------------------------------------------------------------------------
// Build WidgetData from a raw dashboard API response
// ---------------------------------------------------------------------------

/**
 * Build widget data from a dashboard response.
 * Call this after every successful dashboard fetch.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildWidgetData(babyName: string, babyId: number, dashboard: any): WidgetData {
  const now = new Date();

  // --- Last feeding ---
  let lastFeeding: WidgetData['last_feeding'] = null;
  if (dashboard.last_feeding) {
    const feedTime = new Date(dashboard.last_feeding.time);
    const minutesAgo = Math.floor((now.getTime() - feedTime.getTime()) / 60000);
    lastFeeding = {
      time: dashboard.last_feeding.time,
      type: dashboard.last_feeding.type,
      amount: dashboard.last_feeding.amount_ml
        ? `${Math.round(dashboard.last_feeding.amount_ml / 30)}oz`
        : dashboard.last_feeding.duration_minutes
          ? `${dashboard.last_feeding.duration_minutes}min`
          : undefined,
      minutes_ago: minutesAgo,
    };
  }

  // --- Last diaper ---
  let lastDiaper: WidgetData['last_diaper'] = null;
  if (dashboard.last_diaper) {
    const diaperTime = new Date(dashboard.last_diaper.time);
    const minutesAgo = Math.floor((now.getTime() - diaperTime.getTime()) / 60000);
    lastDiaper = {
      time: dashboard.last_diaper.time,
      type: dashboard.last_diaper.type,
      minutes_ago: minutesAgo,
    };
  }

  // --- Last sleep ---
  let lastSleep: WidgetData['last_sleep'] = null;
  if (dashboard.last_sleep) {
    const isActive = !dashboard.last_sleep.end_time;
    lastSleep = {
      start_time: dashboard.last_sleep.start_time,
      end_time: dashboard.last_sleep.end_time,
      duration_minutes: dashboard.last_sleep.duration_minutes,
      is_active: isActive,
    };
  }

  // --- Today summary ---
  const summary = dashboard.daily_summary || {};

  return {
    baby_name: babyName,
    baby_id: babyId,
    last_updated: now.toISOString(),
    last_feeding: lastFeeding,
    last_diaper: lastDiaper,
    last_sleep: lastSleep,
    today_summary: {
      feedings: summary.feeding_count || 0,
      diapers: summary.diaper_count || 0,
      sleep_hours: summary.total_sleep_minutes
        ? Math.round((summary.total_sleep_minutes / 60) * 10) / 10
        : 0,
      last_update: now.toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Request widget timeline reload (iOS WidgetKit)
// ---------------------------------------------------------------------------

/**
 * Ask the OS to refresh widget timelines.
 *
 * On iOS this will eventually call WidgetCenter.shared.reloadAllTimelines()
 * once the native Capacitor plugin bridge is implemented.  Until then this is
 * a no-op; widgets will refresh on their own schedule (every ~15 min).
 */
export async function reloadWidgetTimelines(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // TODO: Call native WidgetCenter.shared.reloadAllTimelines()
    // Requires a small Capacitor plugin bridge (see src/widgets/).
    console.log('[WidgetBridge] Timeline reload requested (native bridge pending)');
  }
}
