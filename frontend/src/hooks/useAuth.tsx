import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

const isDev = import.meta.env.DEV;
const log = (...args: unknown[]) => isDev && console.log(...args);

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
            log('[Auth] Auth relay detected, setting session');
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
                    log('[Auth] Auth relay failed:', error);
                } else {
                    log('[Auth] Auth relay success');
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
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            log('[Auth] Initial session check:', session ? 'logged in' : 'not logged in');
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            log('[Auth] Auth state changed:', _event);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async () => {
        if (!import.meta.env.VITE_SUPABASE_URL) {
            setUser({ id: 'dev-user-123', email: 'dev@example.com' } as unknown as SupabaseUser);
            setSession({ access_token: 'dev-token' } as unknown as Session);
            return;
        }

        const redirectTo = Capacitor.isNativePlatform()
            ? 'heybub://callback'
            : `${window.location.origin}/callback`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo },
        });

        if (error) {
            console.error('[Auth] Login error:', error);
            throw error;
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
