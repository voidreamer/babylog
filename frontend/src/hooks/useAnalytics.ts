import { useCallback, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { isOnline } from '../utils/offlineStorage';

interface AnalyticsEvent {
  event_name: string;
  event_data?: string;
  session_id?: string;
}

const SESSION_KEY = 'heybub-session-id';
const QUEUE_KEY = 'heybub-analytics-queue';
const FLUSH_INTERVAL_MS = 30_000; // 30 seconds
const MAX_QUEUE_SIZE = 100;

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getOfflineQueue(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setOfflineQueue(events: AnalyticsEvent[]) {
  try {
    const trimmed = events.slice(-MAX_QUEUE_SIZE);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full — discard
  }
}

export function useAnalytics() {
  const queueRef = useRef<AnalyticsEvent[]>([]);
  const sessionId = useRef(getSessionId());

  const flush = useCallback(async () => {
    // Merge offline queue with in-memory queue
    const offlineEvents = getOfflineQueue();
    const allEvents = [...offlineEvents, ...queueRef.current];
    queueRef.current = [];
    setOfflineQueue([]);

    if (allEvents.length === 0) return;

    if (!isOnline()) {
      // Put everything back in offline queue
      setOfflineQueue(allEvents);
      return;
    }

    try {
      await api.request('/tracking/events', {
        method: 'POST',
        body: JSON.stringify({ events: allEvents }),
      });
    } catch {
      // Failed to send — re-queue for next flush
      setOfflineQueue(allEvents);
    }
  }, []);

  const track = useCallback((eventName: string, data?: Record<string, unknown>) => {
    const event: AnalyticsEvent = {
      event_name: eventName,
      session_id: sessionId.current,
    };
    if (data) {
      event.event_data = JSON.stringify(data);
    }
    queueRef.current.push(event);

    if (queueRef.current.length >= MAX_QUEUE_SIZE) {
      flush();
    }
  }, [flush]);

  const trackPageView = useCallback((page: string) => {
    track('page_view', { page, language: navigator.language });
  }, [track]);

  useEffect(() => {
    const interval = setInterval(flush, FLUSH_INTERVAL_MS);

    // Flush on page unload
    const handleUnload = () => {
      // Use sendBeacon for reliable delivery
      const offlineEvents = getOfflineQueue();
      const allEvents = [...offlineEvents, ...queueRef.current];
      if (allEvents.length > 0 && isOnline()) {
        const body = JSON.stringify({ events: allEvents });
        const url = `${import.meta.env.VITE_API_URL || ''}/api/tracking/events`;
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        queueRef.current = [];
        setOfflineQueue([]);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [flush]);

  return { track, trackPageView, flush };
}
