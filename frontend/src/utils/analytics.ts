import * as Sentry from '@sentry/react';
import mixpanel from 'mixpanel-browser';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN || '';
const IS_PROD = import.meta.env.PROD;

let mixpanelReady = false;

/**
 * Initialize Sentry + Mixpanel. Call once at app startup.
 */
export function initAnalytics() {
  // Sentry — error monitoring
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: IS_PROD ? 'production' : 'development',
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
      ],
      tracesSampleRate: IS_PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: IS_PROD ? 1.0 : 0,
    });
  }

  // Mixpanel — product analytics
  if (MIXPANEL_TOKEN) {
    mixpanel.init(MIXPANEL_TOKEN, {
      track_pageview: false, // we track manually for SPA
      persistence: 'localStorage',
      ignore_dnt: false, // respect Do Not Track
    });
    mixpanelReady = true;
  }
}

/**
 * Identify the current user (call after login).
 */
export function identifyUser(userId: string, email?: string) {
  if (SENTRY_DSN) {
    Sentry.setUser({ id: userId, email });
  }
  if (mixpanelReady) {
    mixpanel.identify(userId);
    if (email) {
      mixpanel.people.set({ $email: email });
    }
  }
}

/**
 * Clear user identity (call on logout).
 */
export function resetUser() {
  if (SENTRY_DSN) {
    Sentry.setUser(null);
  }
  if (mixpanelReady) {
    mixpanel.reset();
  }
}

/**
 * Track a product event.
 */
export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (mixpanelReady) {
    mixpanel.track(name, properties);
  }
}

/**
 * Track a page view.
 */
export function trackPageView(pageName: string) {
  if (mixpanelReady) {
    mixpanel.track('Page View', { page: pageName });
  }
}

/**
 * Set user properties (e.g., baby count, premium status).
 */
export function setUserProperties(props: Record<string, unknown>) {
  if (mixpanelReady) {
    mixpanel.people.set(props);
  }
}

/**
 * Capture an exception in Sentry.
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

// Re-export Sentry ErrorBoundary for React
export const SentryErrorBoundary = Sentry.ErrorBoundary;
