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

// Refresh token using Cognito
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken || !COGNITO_DOMAIN) {
        return null;
    }

    try {
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: COGNITO_CLIENT_ID,
            refresh_token: refreshToken,
        });

        const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        if (!response.ok) {
            // Refresh token expired - clear everything
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
            return null;
        }

        const data = await response.json();
        api.setToken(data.access_token);

        // Update email from new id_token if provided
        if (data.id_token) {
            const payload = JSON.parse(atob(data.id_token.split('.')[1]));
            if (payload.email) {
                localStorage.setItem('user_email', payload.email.toLowerCase());
            }
        }

        return data.access_token;
    } catch (error) {
        console.error('Failed to refresh token:', error);
        return null;
    }
}

// Expose refresh function to API client
api.setRefreshFunction(refreshAccessToken);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = api.getToken();
            const lsToken = localStorage.getItem('auth_token');
            const effectiveToken = token || lsToken;

            if (effectiveToken) {
                try {
                    const payload = JSON.parse(atob(effectiveToken.split('.')[1]));

                    // Check if token is expired
                    const now = Math.floor(Date.now() / 1000);
                    if (payload.exp && payload.exp < now) {
                        // Token expired, try to refresh
                        const newToken = await refreshAccessToken();
                        if (newToken) {
                            const newPayload = JSON.parse(atob(newToken.split('.')[1]));
                            setUser(newPayload);
                        } else {
                            // Refresh failed, clear user
                            api.setToken(null);
                            setUser(null);
                        }
                    } else {
                        setUser(payload);
                        if (!token && lsToken) {
                            api.setToken(lsToken);
                        }
                    }
                } catch (e) {
                    api.setToken(null);
                    localStorage.removeItem('auth_token');
                }
            }
            setLoading(false);
        };

        initAuth();
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

        // Store access_token for API calls
        api.setToken(data.access_token);

        // Store refresh_token for automatic refresh
        if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
        }

        const payload = JSON.parse(atob(data.id_token.split('.')[1]));
        // Store email from id_token for the sharing feature
        if (payload.email) {
            localStorage.setItem('user_email', payload.email.toLowerCase());
        }
        setUser(payload);
    };

    const logout = () => {
        api.setToken(null);
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_email');
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
