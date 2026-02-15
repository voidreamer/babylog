import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface AuthContextValue {
    user: SupabaseUser | null;
    session: Session | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for auth relay params from cross-app navigation
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('auth_relay');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
            console.log('[Auth] Auth relay detected, setting session');
            // Consume theme param before cleaning URL
            const themeParam = params.get('theme');
            if (themeParam === 'dark' || themeParam === 'light') {
                localStorage.setItem('theme', themeParam);
            }
            // Clean URL immediately
            params.delete('auth_relay');
            params.delete('refresh_token');
            params.delete('theme');
            const cleanUrl = params.toString()
                ? `${window.location.pathname}?${params.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);

            supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            }).then(({ data: { session }, error }) => {
                if (error) {
                    console.error('[Auth] Auth relay failed:', error);
                } else {
                    console.log('[Auth] Auth relay success');
                    setSession(session);
                    setUser(session?.user ?? null);
                }
                setLoading(false);
            });
            return; // Skip normal session check, relay will handle it
        }

        // Check for theme param (even without auth relay)
        const themeParam = params.get('theme');
        if (themeParam === 'dark' || themeParam === 'light') {
            localStorage.setItem('theme', themeParam);
            params.delete('theme');
            const cleanUrl = params.toString()
                ? `${window.location.pathname}?${params.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);
        }

        // Check active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('[Auth] Initial session:', session ? session.user?.email : 'none');
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('[Auth] State change:', _event, session?.user?.email ?? 'no-user');
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for native deep link auth (main.tsx passes session via window global)
        const handleNativeAuth = () => {
            console.log('[Auth] native-auth-success event fired');
            const nativeSession = (window as any).__nativeSession;
            console.log('[Auth] __nativeSession:', nativeSession ? 'exists' : 'missing');
            delete (window as any).__nativeSession;
            if (nativeSession) {
                console.log('[Auth] Setting session from native:', nativeSession.user?.email);
                setSession(nativeSession);
                setUser(nativeSession.user ?? null);
                setLoading(false);
            }
        };
        window.addEventListener('native-auth-success', handleNativeAuth);

        // Fallback for native: re-check session when SFSafariViewController closes.
        // Browser.close() in main.tsx fires 'browserFinished' after setSession succeeds,
        // so getSession() is guaranteed to have the fresh session at this point.
        let browserCleanup: (() => void) | null = null;
        if (Capacitor.isNativePlatform()) {
            Browser.addListener('browserFinished', async () => {
                console.log('[Auth] Browser dismissed, checking session');
                const { data: { session: s } } = await supabase.auth.getSession();
                console.log('[Auth] Session after browser close:', s ? s.user?.email : 'none');
                if (s) {
                    setSession(s);
                    setUser(s.user ?? null);
                    setLoading(false);
                }
            }).then(handle => {
                browserCleanup = () => handle.remove();
            });
        }

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('native-auth-success', handleNativeAuth);
            browserCleanup?.();
        };
    }, []);

    const login = async () => {
        if (!import.meta.env.VITE_SUPABASE_URL) {
            setUser({ id: 'dev-user-123', email: 'dev@example.com' } as unknown as SupabaseUser);
            setSession({ access_token: 'dev-token' } as unknown as Session);
            return;
        }

        const basePath = import.meta.env.VITE_BASE_PATH || '/';
        const redirectTo = Capacitor.isNativePlatform()
            ? 'heybub://callback'
            : `${window.location.origin}${basePath}callback`;

        if (Capacitor.isNativePlatform()) {
            // On native, get the OAuth URL without redirecting the WebView,
            // then open it in SFSafariViewController via the Browser plugin.
            // This keeps the WebView intact and lets the redirect back to
            // heybub://callback fire the appUrlOpen event properly.
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo, skipBrowserRedirect: true },
            });
            if (error) {
                console.error('[Auth] Login error:', error);
                throw error;
            }
            if (data?.url) {
                await Browser.open({ url: data.url });
            }
        } else {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo },
            });
            if (error) {
                console.error('[Auth] Login error:', error);
                throw error;
            }
        }
    };

    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error && !error.message?.includes('Auth session missing')) {
                throw error;
            }
        } catch (error) {
            console.warn('[Auth] Logout warning:', (error as Error).message);
        }
        setUser(null);
        setSession(null);
    };

    const getAccessToken = async (): Promise<string | null> => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, login, logout, getAccessToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
