import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Callback() {
    const { handleCallback } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState(null);

    useEffect(() => {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('Callback received:', { code: code?.substring(0, 20) + '...', errorParam, errorDescription });

        if (errorParam) {
            console.error('OAuth error:', errorParam, errorDescription);
            setError(`OAuth error: ${errorParam} - ${errorDescription}`);
            return;
        }

        if (code) {
            handleCallback(code)
                .then(() => {
                    console.log('Auth callback successful');
                    navigate('/');
                })
                .catch((err) => {
                    console.error('Auth callback failed:', err);
                    setError(err.message);
                });
        } else {
            navigate('/login');
        }
    }, []);

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

