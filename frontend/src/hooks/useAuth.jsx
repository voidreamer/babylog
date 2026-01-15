import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { api } from '../api/client';

// Only log in development
const isDev = import.meta.env.DEV;
const log = (...args) => isDev && console.log(...args);

const AuthContext = createContext(null);

// Cognito configuration
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || '';
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

// Determine redirect URI based on platform
const getRedirectUri = () => {
    if (Capacitor.isNativePlatform()) {
        return 'simplebaby://callback';
    }
    return import.meta.env.VITE_REDIRECT_URI || window.location.origin + '/callback';
};

const REDIRECT_URI = getRedirectUri();

// Token exchange function (standalone, not dependent on component state)
async function exchangeCodeForTokens(code) {
    log('[Auth] Exchanging code for tokens...');

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: COGNITO_CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
    });

    const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${errorText}`);
    }

    const data = await response.json();
    log('[Auth] Tokens received successfully');

    // Store tokens (will be saved to both localStorage and IndexedDB after helpers are defined)
    api.setToken(data.access_token);
    localStorage.setItem('auth_token', data.access_token);

    if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
    }

    // Parse user info from id_token
    const payload = JSON.parse(atob(data.id_token.split('.')[1]));
    if (payload.email) {
        localStorage.setItem('user_email', payload.email);
    }

    // Also save to IndexedDB for iOS persistence (async, non-blocking)
    Promise.all([
        saveToIndexedDB('auth_token', data.access_token),
        data.refresh_token ? saveToIndexedDB('refresh_token', data.refresh_token) : Promise.resolve(),
        payload.email ? saveToIndexedDB('user_email', payload.email) : Promise.resolve(),
    ]).catch(e => console.warn('[Auth] IndexedDB backup save failed:', e));

    return payload;
}

// IndexedDB helpers for more persistent storage on iOS
const DB_NAME = 'simplebaby_auth';
const STORE_NAME = 'tokens';

async function openAuthDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function saveToIndexedDB(key, value) {
    try {
        const db = await openAuthDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(value, key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
            tx.oncomplete = () => db.close();
        });
    } catch (e) {
        console.warn('[Auth] IndexedDB save failed:', e);
    }
}

async function getFromIndexedDB(key) {
    try {
        const db = await openAuthDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            tx.oncomplete = () => db.close();
        });
    } catch (e) {
        console.warn('[Auth] IndexedDB get failed:', e);
        return null;
    }
}

async function removeFromIndexedDB(key) {
    try {
        const db = await openAuthDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
            tx.oncomplete = () => db.close();
        });
    } catch (e) {
        console.warn('[Auth] IndexedDB remove failed:', e);
    }
}

// Dual storage helpers - save to both localStorage and IndexedDB
async function saveToken(key, value) {
    localStorage.setItem(key, value);
    await saveToIndexedDB(key, value);
}

async function getToken(key) {
    // Try localStorage first, fall back to IndexedDB
    let value = localStorage.getItem(key);
    if (!value) {
        value = await getFromIndexedDB(key);
        if (value) {
            // Restore to localStorage if found in IndexedDB
            localStorage.setItem(key, value);
        }
    }
    return value;
}

async function removeToken(key) {
    localStorage.removeItem(key);
    await removeFromIndexedDB(key);
}

// Refresh token function
async function refreshAccessToken() {
    let refreshToken = localStorage.getItem('refresh_token');

    // Try IndexedDB if localStorage is empty (iOS might have cleared it)
    if (!refreshToken) {
        refreshToken = await getFromIndexedDB('refresh_token');
        if (refreshToken) {
            log('[Auth] Recovered refresh token from IndexedDB');
            localStorage.setItem('refresh_token', refreshToken);
        }
    }

    if (!refreshToken || !COGNITO_DOMAIN) {
        return null;
    }

    try {
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: COGNITO_CLIENT_ID,
            refresh_token: refreshToken,
        });

        const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        if (!response.ok) {
            await removeToken('refresh_token');
            await removeToken('auth_token');
            await removeToken('user_email');
            return null;
        }

        const data = await response.json();
        api.setToken(data.access_token);
        await saveToken('auth_token', data.access_token);

        if (data.id_token) {
            const payload = JSON.parse(atob(data.id_token.split('.')[1]));
            if (payload.email) {
                await saveToken('user_email', payload.email);
            }
        }

        log('[Auth] Token refreshed successfully');
        return data.access_token;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}

api.setRefreshFunction(refreshAccessToken);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const processingCallback = useRef(false);
    const browserCloseTimeoutRef = useRef(null);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (browserCloseTimeoutRef.current) {
                clearTimeout(browserCloseTimeoutRef.current);
            }
        };
    }, []);

    // Handle OAuth callback with improved race condition handling
    const handleCallback = useCallback(async (code) => {
        if (processingCallback.current) {
            return;
        }
        processingCallback.current = true;

        try {
            log('[Auth] Processing callback with code:', code.substring(0, 8) + '...');

            if (!COGNITO_DOMAIN) {
                api.setToken('dev-token');
                setUser({ sub: 'dev-user-123', email: 'dev@example.com' });
                return;
            }

            const payload = await exchangeCodeForTokens(code);
            setUser(payload);
            log('[Auth] User logged in:', payload.email);

            // Close browser on native and force reload to refresh UI
            if (Capacitor.isNativePlatform()) {
                try {
                    await Browser.close();
                } catch (e) {
                    // Browser might already be closed
                }
                // Force reload to ensure UI picks up new auth state
                window.location.reload();
            }
        } catch (error) {
            console.error('[Auth] Callback failed:', error);
        } finally {
            processingCallback.current = false;
        }
    }, []);

    // Initialize auth and set up deep link listener
    useEffect(() => {
        const initAuth = async () => {
            let token = api.getToken();
            let lsToken = localStorage.getItem('auth_token');

            // Try IndexedDB if localStorage is empty (iOS Safari ITP might have cleared it)
            if (!lsToken) {
                const idbToken = await getFromIndexedDB('auth_token');
                if (idbToken) {
                    log('[Auth] Recovered auth token from IndexedDB');
                    localStorage.setItem('auth_token', idbToken);
                    lsToken = idbToken;

                    // Also recover other tokens
                    const idbRefresh = await getFromIndexedDB('refresh_token');
                    if (idbRefresh) {
                        localStorage.setItem('refresh_token', idbRefresh);
                    }
                    const idbEmail = await getFromIndexedDB('user_email');
                    if (idbEmail) {
                        localStorage.setItem('user_email', idbEmail);
                    }
                }
            }

            const effectiveToken = token || lsToken;

            if (effectiveToken) {
                try {
                    const payload = JSON.parse(atob(effectiveToken.split('.')[1]));
                    const now = Math.floor(Date.now() / 1000);

                    if (payload.exp && payload.exp < now) {
                        const newToken = await refreshAccessToken();
                        if (newToken) {
                            const newPayload = JSON.parse(atob(newToken.split('.')[1]));
                            setUser(newPayload);
                        } else {
                            api.setToken(null);
                            setUser(null);
                        }
                    } else {
                        setUser(payload);
                        if (!token && lsToken) {
                            api.setToken(lsToken);
                        }
                    }
                } catch (e) {
                    console.error('[Auth] Token parse error:', e);
                    api.setToken(null);
                    localStorage.removeItem('auth_token');
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // Visibility change listener - refresh token when app comes back to foreground
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && user) {
                log('[Auth] App became visible, checking token...');
                const token = api.getToken() || localStorage.getItem('auth_token');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const now = Math.floor(Date.now() / 1000);
                        // Refresh if token expires in less than 5 minutes
                        if (payload.exp && (payload.exp - now) < 300) {
                            log('[Auth] Token expiring soon, refreshing...');
                            const newToken = await refreshAccessToken();
                            if (newToken) {
                                const newPayload = JSON.parse(atob(newToken.split('.')[1]));
                                setUser(newPayload);
                            }
                        }
                    } catch (e) {
                        console.error('[Auth] Visibility check error:', e);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [user]);

    // Periodic token refresh - refresh 5 minutes before expiry
    useEffect(() => {
        if (!user) return;

        const checkAndRefresh = async () => {
            const token = api.getToken() || localStorage.getItem('auth_token');
            if (!token) return;

            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const now = Math.floor(Date.now() / 1000);
                const timeUntilExpiry = payload.exp ? payload.exp - now : 0;

                // Refresh if less than 5 minutes remaining
                if (timeUntilExpiry > 0 && timeUntilExpiry < 300) {
                    log('[Auth] Proactive token refresh...');
                    const newToken = await refreshAccessToken();
                    if (newToken) {
                        const newPayload = JSON.parse(atob(newToken.split('.')[1]));
                        setUser(newPayload);
                    }
                }
            } catch (e) {
                console.error('[Auth] Periodic refresh error:', e);
            }
        };

        // Check every minute
        const intervalId = setInterval(checkAndRefresh, 60000);

        return () => clearInterval(intervalId);
    }, [user]);

    // Separate effect for native URL handling
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        log('[Auth] Setting up native URL listener');

        const handleAppUrlOpen = async (event) => {
            const { url } = event;
            log('[Auth] App URL opened:', url);

            if (url && url.startsWith('simplebaby://callback')) {
                try {
                    // Parse the URL to get the code
                    const queryString = url.split('?')[1];
                    if (queryString) {
                        const params = new URLSearchParams(queryString);
                        const code = params.get('code');
                        if (code) {
                            log('[Auth] Got auth code, processing...');
                            await handleCallback(code);
                        }
                    }
                } catch (error) {
                    console.error('[Auth] Error parsing callback URL:', error);
                }
            }
        };

        CapApp.addListener('appUrlOpen', handleAppUrlOpen);

        // Check if app was opened with a URL (cold start)
        CapApp.getLaunchUrl().then((result) => {
            if (result?.url) {
                log('[Auth] App launched with URL:', result.url);
                handleAppUrlOpen({ url: result.url });
            }
        });

        return () => {
            log('[Auth] Removing URL listener');
            CapApp.removeAllListeners();
        };
    }, []);

    const login = async () => {
        if (!COGNITO_DOMAIN) {
            api.setToken('dev-token');
            setUser({ sub: 'dev-user-123', email: 'dev@example.com' });
            return;
        }

        const params = new URLSearchParams({
            client_id: COGNITO_CLIENT_ID,
            response_type: 'code',
            scope: 'openid email profile',
            redirect_uri: REDIRECT_URI,
        });

        const loginUrl = `${COGNITO_DOMAIN}/login?${params}`;
        log('[Auth] Opening login URL:', loginUrl);

        if (Capacitor.isNativePlatform()) {
            await Browser.open({ url: loginUrl });
        } else {
            window.location.href = loginUrl;
        }
    };

    const logout = async () => {
        api.setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_email');

        // Also clear IndexedDB
        await Promise.all([
            removeFromIndexedDB('auth_token'),
            removeFromIndexedDB('refresh_token'),
            removeFromIndexedDB('user_email'),
        ]).catch(e => console.warn('[Auth] IndexedDB clear failed:', e));

        setUser(null);

        if (COGNITO_DOMAIN) {
            const logoutUrl = `${COGNITO_DOMAIN}/logout?client_id=${COGNITO_CLIENT_ID}&logout_uri=${encodeURIComponent(REDIRECT_URI.replace('/callback', ''))}`;

            if (Capacitor.isNativePlatform()) {
                await Browser.open({ url: logoutUrl });
                // Use ref to track timeout for proper cleanup
                browserCloseTimeoutRef.current = setTimeout(() => Browser.close(), 1000);
            } else {
                window.location.href = logoutUrl;
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, handleCallback }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
