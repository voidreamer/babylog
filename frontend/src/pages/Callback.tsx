/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

export default function Callback() {
    const { t } = useTranslation('auth');
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(true);
    const processedRef = useRef(false);

    useEffect(() => {
        // Prevent double processing
        if (processedRef.current) return;
        processedRef.current = true;

        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
            setError(`OAuth error: ${errorParam} - ${errorDescription}`);
            setProcessing(false);
            return;
        }

        const processAuth = async () => {
            // Parse tokens from hash fragment (e.g. #access_token=...&refresh_token=...)
            const hash = window.location.hash.substring(1);
            const hashParams = new URLSearchParams(hash);
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
                // Explicitly set session from hash tokens — required on native
                // where Supabase's detectSessionInUrl has already run before the deep link arrives
                if (import.meta.env.DEV) console.log('[Callback] Setting session from hash tokens');
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (sessionError) {
                    console.error('[Callback] setSession error:', sessionError);
                    setError(sessionError.message);
                    setProcessing(false);
                    return;
                }
                navigate('/', { replace: true });
                return;
            }

            // Fallback: check if Supabase already has a session (web auto-detect)
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('[Callback] Session error:', sessionError);
                setError(sessionError.message);
                setProcessing(false);
                return;
            }

            if (session) {
                if (import.meta.env.DEV) console.log('[Callback] Session found, redirecting to home');
                navigate('/', { replace: true });
            } else {
                if (import.meta.env.DEV) console.log('[Callback] No session found after processing');
                setProcessing(false);
            }
        };

        processAuth();
    }, [navigate, searchParams]);

    // If user becomes available via onAuthStateChange, redirect
    useEffect(() => {
        if (!loading && user) {
            navigate('/', { replace: true });
        }
    }, [user, loading, navigate]);

    // Only show "no session" message after processing is complete
    useEffect(() => {
        if (!processing && !user && !loading) {
            const timeout = setTimeout(() => {
                navigate('/login', { replace: true });
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [processing, user, loading, navigate]);

    if (error) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>{t('callback.authError')}</h2>
                <p style={{ color: 'red' }}>{error}</p>
                <button onClick={() => navigate('/login')}>{t('callback.backToLogin')}</button>
            </div>
        );
    }

    return (
        <div className="loading" style={{ minHeight: '100vh' }}>
            <img src="/icons/loading.png" alt="" className="loading-logo" />
        </div>
    );
}
