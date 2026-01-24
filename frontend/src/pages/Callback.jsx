import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Callback() {
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Check for error in URL params
                const params = new URLSearchParams(window.location.search);
                const errorParam = params.get('error');
                const errorDescription = params.get('error_description');

                if (errorParam) {
                    setError(`OAuth error: ${errorParam} - ${errorDescription}`);
                    return;
                }

                // Supabase automatically handles the OAuth callback via detectSessionInUrl
                // We just need to check if a session was established
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    setError(sessionError.message);
                    return;
                }

                if (session) {
                    // Session established, redirect to home
                    navigate('/', { replace: true });
                } else {
                    // No session - might still be processing or failed
                    // Wait a moment and check again
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const { data: { session: retrySession } } = await supabase.auth.getSession();
                    if (retrySession) {
                        navigate('/', { replace: true });
                    } else {
                        // Still no session, redirect to login
                        navigate('/login', { replace: true });
                    }
                }
            } catch (err) {
                setError(err.message);
            }
        };

        handleCallback();
    }, [navigate]);

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
