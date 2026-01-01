import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Callback() {
    const { handleCallback } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const code = searchParams.get('code');

        if (code) {
            handleCallback(code)
                .then(() => navigate('/'))
                .catch((error) => {
                    console.error('Auth callback failed:', error);
                    navigate('/login');
                });
        } else {
            navigate('/login');
        }
    }, []);

    return (
        <div className="loading" style={{ minHeight: '100vh' }}>
            <div className="spinner"></div>
        </div>
    );
}
