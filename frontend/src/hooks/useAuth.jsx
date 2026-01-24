import { useState, useEffect, createContext, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

// Only log in development
const isDev = import.meta.env.DEV;
const log = (...args) => isDev && console.log(...args);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            log('[Auth] Initial session check:', session ? 'logged in' : 'not logged in');
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            log('[Auth] Auth state changed:', _event);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async () => {
        // Dev mode bypass
        if (!import.meta.env.VITE_SUPABASE_URL) {
            setUser({ id: 'dev-user-123', email: 'dev@example.com' });
            setSession({ access_token: 'dev-token' });
            return;
        }

        const redirectTo = Capacitor.isNativePlatform()
            ? 'simplebaby://callback'
            : `${window.location.origin}/callback`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
            },
        });

        if (error) {
            console.error('[Auth] Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            // Ignore "Auth session missing" error - user is already logged out
            if (error && !error.message?.includes('Auth session missing')) {
                throw error;
            }
        } catch (error) {
            console.warn('[Auth] Logout warning:', error.message);
        }
        // Always clear local state regardless of signOut result
        setUser(null);
        setSession(null);
    };

    // Get access token for API calls
    const getAccessToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            login,
            logout,
            getAccessToken,
        }}>
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
