import { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

// Cognito configuration - use env vars or production defaults
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN ||
    (import.meta.env.PROD ? 'https://huckle-nah7qom7.auth.ca-central-1.amazoncognito.com' : '');
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID ||
    (import.meta.env.PROD ? '34up4ahjhh0umosq03grphmcur' : '');
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI ||
    (import.meta.env.PROD ? 'https://d3nsr7lzhub0bz.cloudfront.net/callback' : window.location.origin + '/callback');

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = api.getToken();
        const lsToken = localStorage.getItem('auth_token');
        const effectiveToken = token || lsToken;

        if (effectiveToken) {
            try {
                const payload = JSON.parse(atob(effectiveToken.split('.')[1]));
                setUser(payload);
                if (!token && lsToken) {
                    api.setToken(lsToken);
                }
            } catch (e) {
                api.setToken(null);
                localStorage.removeItem('auth_token');
            }
        }
        setLoading(false);
    }, []);

    const login = () => {
        if (!COGNITO_DOMAIN) {
            api.setToken('dev-token');
            setUser({ sub: 'dev-user-123', email: 'dev@example.com' });
            return;
        }

        const params = new URLSearchParams({
            client_id: COGNITO_CLIENT_ID,
            response_type: 'code',
            scope: 'openid email profile',
            redirect_uri: REDIRECT_URI,
        });

        window.location.href = `${COGNITO_DOMAIN}/login?${params}`;
    };

    const handleCallback = async (code) => {
        if (!COGNITO_DOMAIN) {
            api.setToken('dev-token');
            setUser({ sub: 'dev-user-123', email: 'dev@example.com' });
            return;
        }

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: COGNITO_CLIENT_ID,
            code,
            redirect_uri: REDIRECT_URI,
        });

        const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to exchange code for tokens: ${errorText}`);
        }

        const data = await response.json();
        api.setToken(data.access_token);
        const payload = JSON.parse(atob(data.id_token.split('.')[1]));
        setUser(payload);
    };

    const logout = () => {
        api.setToken(null);
        setUser(null);

        if (COGNITO_DOMAIN) {
            const params = new URLSearchParams({
                client_id: COGNITO_CLIENT_ID,
                logout_uri: window.location.origin,
            });
            window.location.href = `${COGNITO_DOMAIN}/logout?${params}`;
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
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
