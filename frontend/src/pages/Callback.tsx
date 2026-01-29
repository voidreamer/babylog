/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export default function Callback() {
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

        // Check if there's a hash fragment (OAuth response)
        const hashParams = window.location.hash;
        if (hashParams && hashParams.includes('access_token')) {
            // Supabase should auto-detect and process the hash
            // Wait for onAuthStateChange to fire
            console.log('[Callback] OAuth hash detected, waiting for Supabase to process...');
        }

        // Give Supabase time to process the OAuth response
        // Then check session directly
        const checkSession = async () => {
            // Small delay to let Supabase process the hash
            await new Promise(resolve => setTimeout(resolve, 500));

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('[Callback] Session error:', sessionError);
                setError(sessionError.message);
                setProcessing(false);
                return;
            }

            if (session) {
                console.log('[Callback] Session found, redirecting to home');
                navigate('/', { replace: true });
            } else {
                console.log('[Callback] No session found after processing');
                setProcessing(false);
            }
        };

        checkSession();
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
                <h2>Authentication Error</h2>
                <p style={{ color: 'red' }}>{error}</p>
                <button onClick={() => navigate('/login')}>Back to Login</button>
            </div>
        );
    }

    return (
        <div className="loading" style={{ minHeight: '100vh' }}>
            <div className="spinner"></div>
        </div>
    );
}
