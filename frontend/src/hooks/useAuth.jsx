import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { supabase } from '../lib/supabase';
import { api } from '../api/client';

// Only log in development
const isDev = import.meta.env.DEV;
const log = (...args) => isDev && console.log(...args);

const AuthContext = createContext(null);

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

// Determine redirect URI based on platform
const getRedirectUri = () => {
    if (Capacitor.isNativePlatform()) {
        return 'simplebaby://callback';
    }
    return import.meta.env.VITE_REDIRECT_URI || window.location.origin + '/callback';
};

const REDIRECT_URI = getRedirectUri();

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

// Refresh token function using Supabase
async function refreshAccessToken() {
    if (!SUPABASE_URL) {
        return null;
    }

    try {
        const { data, error } = await supabase.auth.refreshSession();

        if (error || !data.session) {
            log('[Auth] Token refresh failed:', error);
            await removeToken('auth_token');
            await removeToken('user_email');
            return null;
        }

        const accessToken = data.session.access_token;
        api.setToken(accessToken);
        await saveToken('auth_token', accessToken);

        if (data.session.user?.email) {
            await saveToken('user_email', data.session.user.email);
        }

        log('[Auth] Token refreshed successfully');
        return accessToken;
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

    // Handle OAuth callback - for native apps that receive the URL
    const handleCallback = useCallback(async (url) => {
        if (processingCallback.current) {
            return;
        }
        processingCallback.current = true;

        try {
            log('[Auth] Processing callback URL:', url);

            if (!SUPABASE_URL) {
                // Dev mode
                api.setToken('dev-token');
                setUser({ id: 'dev-user-123', email: 'dev@example.com' });
                return;
            }

            // For native apps, we need to extract the tokens from the URL
            // Supabase uses fragment (#) based tokens for implicit flow
            const hashParams = new URLSearchParams(url.split('#')[1] || '');
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken) {
                // Set session from tokens
                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || '',
                });

                if (error) {
                    throw error;
                }

                if (data.session) {
                    api.setToken(data.session.access_token);
                    await saveToken('auth_token', data.session.access_token);

                    const userData = {
                        id: data.session.user.id,
                        email: data.session.user.email,
                        sub: data.session.user.id, // For backwards compatibility
                    };

                    if (data.session.user.email) {
                        await saveToken('user_email', data.session.user.email);
                    }

                    setUser(userData);
                    log('[Auth] User logged in:', userData.email);
                }
            }

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

    // Initialize auth and listen for Supabase auth changes
    useEffect(() => {
        const initAuth = async () => {
            if (!SUPABASE_URL) {
                // Dev mode - check for dev token
                const devToken = localStorage.getItem('auth_token');
                if (devToken === 'dev-token') {
                    api.setToken('dev-token');
                    setUser({ id: 'dev-user-123', email: 'dev@example.com', sub: 'dev-user-123' });
                }
                setLoading(false);
                return;
            }

            try {
                // Try to recover session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    log('[Auth] Error getting session:', error);
                }

                if (session) {
                    api.setToken(session.access_token);
                    await saveToken('auth_token', session.access_token);

                    const userData = {
                        id: session.user.id,
                        email: session.user.email,
                        sub: session.user.id, // For backwards compatibility
                    };

                    if (session.user.email) {
                        await saveToken('user_email', session.user.email);
                    }

                    setUser(userData);
                    log('[Auth] Session restored for:', userData.email);
                } else {
                    // Try to recover from IndexedDB (iOS Safari ITP workaround)
                    const idbToken = await getFromIndexedDB('auth_token');
                    if (idbToken && idbToken !== 'dev-token') {
                        log('[Auth] Found token in IndexedDB, attempting refresh...');
                        const newToken = await refreshAccessToken();
                        if (newToken) {
                            const { data: { session: refreshedSession } } = await supabase.auth.getSession();
                            if (refreshedSession) {
                                const userData = {
                                    id: refreshedSession.user.id,
                                    email: refreshedSession.user.email,
                                    sub: refreshedSession.user.id,
                                };
                                setUser(userData);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[Auth] Init error:', e);
            }

            setLoading(false);
        };

        initAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            log('[Auth] Auth state changed:', event);

            if (event === 'SIGNED_IN' && session) {
                api.setToken(session.access_token);
                await saveToken('auth_token', session.access_token);

                const userData = {
                    id: session.user.id,
                    email: session.user.email,
                    sub: session.user.id,
                };

                if (session.user.email) {
                    await saveToken('user_email', session.user.email);
                }

                setUser(userData);
            } else if (event === 'SIGNED_OUT') {
                api.setToken(null);
                await removeToken('auth_token');
                await removeToken('user_email');
                setUser(null);
            } else if (event === 'TOKEN_REFRESHED' && session) {
                api.setToken(session.access_token);
                await saveToken('auth_token', session.access_token);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Native URL handling for OAuth callback
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        log('[Auth] Setting up native URL listener');

        const handleAppUrlOpen = async (event) => {
            const { url } = event;
            log('[Auth] App URL opened:', url);

            if (url && url.startsWith('simplebaby://callback')) {
                await handleCallback(url);
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
    }, [handleCallback]);

    const login = async () => {
        if (!SUPABASE_URL) {
            // Dev mode
            api.setToken('dev-token');
            localStorage.setItem('auth_token', 'dev-token');
            setUser({ id: 'dev-user-123', email: 'dev@example.com', sub: 'dev-user-123' });
            return;
        }

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: REDIRECT_URI,
                    skipBrowserRedirect: Capacitor.isNativePlatform(),
                },
            });

            if (error) {
                console.error('[Auth] Login error:', error);
                return;
            }

            if (Capacitor.isNativePlatform() && data?.url) {
                // Open in-app browser for native
                await Browser.open({ url: data.url });
            }
            // For web, Supabase handles the redirect automatically
        } catch (error) {
            console.error('[Auth] Login error:', error);
        }
    };

    const logout = async () => {
        api.setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_email');

        // Also clear IndexedDB
        await Promise.all([
            removeFromIndexedDB('auth_token'),
            removeFromIndexedDB('user_email'),
        ]).catch(e => console.warn('[Auth] IndexedDB clear failed:', e));

        setUser(null);

        if (SUPABASE_URL) {
            try {
                await supabase.auth.signOut();

                if (Capacitor.isNativePlatform()) {
                    // Native app - no need to redirect
                } else {
                    // Web - redirect to login
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('[Auth] Logout error:', error);
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
