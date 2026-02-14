/* eslint-disable @typescript-eslint/no-explicit-any */
import './i18n';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from './lib/supabase';

// Handle deep link redirects from OAuth on native platforms
// When Google OAuth completes, Supabase redirects to heybub://callback#access_token=...
// iOS opens the app — we parse the tokens and set the session directly
if (Capacitor.isNativePlatform()) {
    let handled = false;

    const handleDeepLink = async (url: string) => {
        if (handled) {
            console.log('[DeepLink] already handled, skipping');
            return;
        }
        console.log('[DeepLink] handling:', url);
        const hashIndex = url.indexOf('#');
        if (hashIndex >= 0) {
            const hash = url.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
                handled = true;
                console.log('[DeepLink] Setting session from tokens');
                Browser.close().catch(() => {});
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (!error) {
                    window.location.href = import.meta.env.VITE_BASE_PATH || '/';
                    return;
                }
                console.error('[DeepLink] setSession error:', error);
                handled = false;
            }
        }
    };

    // Cold start: app was launched from a URL scheme
    CapApp.getLaunchUrl().then(result => {
        if (result?.url) {
            handleDeepLink(result.url);
        }
    });

    // Warm start: app was in background and brought to foreground via URL scheme
    CapApp.addListener('appUrlOpen', ({ url }) => {
        handleDeepLink(url);
    });

    // Register iOS notification action buttons
    LocalNotifications.registerActionTypes({
        types: [{
            id: 'MEDICATION_REMINDER',
            actions: [{ id: 'LOG_TAKEN', title: 'Log Taken' }]
        }]
    });

    // Listen for notification taps
    // Buffer the tap data on window for cold starts (React hasn't mounted yet)
    // React will check window.__pendingNotificationTap on mount, then listen for future events
    LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        const detail = {
            id: event.notification.id,
            actionId: event.actionId,
            extra: event.notification.extra
        };
        (window as any).__pendingNotificationTap = detail;
        window.dispatchEvent(new CustomEvent('notification-tap', { detail }));
    });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || '/'}>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
)
