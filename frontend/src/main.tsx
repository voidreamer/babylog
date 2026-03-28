/* eslint-disable @typescript-eslint/no-explicit-any */
import './i18n';
// Self-hosted fonts — eliminates render-blocking Google Fonts network request
import '@fontsource-variable/nunito';
import '@fontsource-variable/quicksand';
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
    let lastHandledUrl = '';

    const handleDeepLink = async (url: string) => {
        // Deduplicate by URL (same deep link can fire from both getLaunchUrl and appUrlOpen)
        if (url === lastHandledUrl) {
            console.log('[DeepLink] duplicate URL, skipping');
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
                lastHandledUrl = url;
                console.log('[DeepLink] Setting session from tokens');
                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                // Close the Safari overlay after session is set
                Browser.close().catch(() => {});
                if (error) {
                    console.error('[DeepLink] setSession error:', error);
                    lastHandledUrl = '';
                } else {
                    console.log('[DeepLink] Session set successfully, user:', data.user?.email);
                    // Pass session directly to React AuthProvider — avoids async getSession race
                    (window as any).__nativeSession = data.session;
                    window.dispatchEvent(new Event('native-auth-success'));
                }
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
