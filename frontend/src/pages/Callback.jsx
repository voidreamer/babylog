import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Callback() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState(null);

    useEffect(() => {
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
            setError(`OAuth error: ${errorParam} - ${errorDescription}`);
            return;
        }

        // Supabase handles the OAuth callback automatically via onAuthStateChange
        // Once the user is set and loading is complete, navigate to home
        if (!loading && user) {
            navigate('/');
        } else if (!loading && !user) {
            // If loading is complete but no user, something went wrong
            // Wait a moment for Supabase to process the hash
            const timeout = setTimeout(() => {
                if (!user) {
                    navigate('/login');
                }
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [user, loading, navigate, searchParams]);

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
