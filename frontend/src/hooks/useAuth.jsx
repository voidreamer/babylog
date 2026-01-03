import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { api } from '../api/client';

const AuthContext = createContext(null);

// Cognito configuration
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || '';
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

// Determine redirect URI based on platform
const getRedirectUri = () => {
    if (Capacitor.isNativePlatform()) {
        return 'simplebaby://callback';
    }
    return import.meta.env.VITE_REDIRECT_URI || window.location.origin + '/callback';
};

const REDIRECT_URI = getRedirectUri();

// Token exchange function (standalone, not dependent on component state)
async function exchangeCodeForTokens(code) {
    console.log('[Auth] Exchanging code for tokens...');

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
        throw new Error(`Token exchange failed: ${errorText}`);
    }

    const data = await response.json();
    console.log('[Auth] Tokens received successfully');

    // Store tokens
    api.setToken(data.access_token);
    localStorage.setItem('auth_token', data.access_token);

    if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
    }

    // Parse user info from id_token
    const payload = JSON.parse(atob(data.id_token.split('.')[1]));
    if (payload.email) {
        localStorage.setItem('user_email', payload.email);
    }

    return payload;
}

// Refresh token function
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
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
            return null;
        }

        const data = await response.json();
        api.setToken(data.access_token);
        localStorage.setItem('auth_token', data.access_token);

        if (data.id_token) {
            const payload = JSON.parse(atob(data.id_token.split('.')[1]));
            if (payload.email) {
                localStorage.setItem('user_email', payload.email);
            }
        }

        return data.access_token;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}

api.setRefreshFunction(refreshAccessToken);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const processingCallback = useRef(false);

    // Handle OAuth callback
    const handleCallback = async (code) => {
        if (processingCallback.current) {
            console.log('[Auth] Already processing callback, ignoring');
            return;
        }
        processingCallback.current = true;

        try {
            console.log('[Auth] Processing callback with code:', code.substring(0, 8) + '...');

            if (!COGNITO_DOMAIN) {
                api.setToken('dev-token');
                setUser({ sub: 'dev-user-123', email: 'dev@example.com' });
                return;
            }

            const payload = await exchangeCodeForTokens(code);
            setUser(payload);
            console.log('[Auth] User logged in:', payload.email);

            // Close browser on native
            if (Capacitor.isNativePlatform()) {
                try {
                    await Browser.close();
                } catch (e) {
                    // Browser might already be closed
                }
            }
        } catch (error) {
            console.error('[Auth] Callback failed:', error);
        } finally {
            processingCallback.current = false;
        }
    };

    // Initialize auth and set up deep link listener
    useEffect(() => {
        const initAuth = async () => {
            const token = api.getToken();
            const lsToken = localStorage.getItem('auth_token');
            const effectiveToken = token || lsToken;

            if (effectiveToken) {
                try {
                    const payload = JSON.parse(atob(effectiveToken.split('.')[1]));
                    const now = Math.floor(Date.now() / 1000);

                    if (payload.exp && payload.exp < now) {
                        const newToken = await refreshAccessToken();
                        if (newToken) {
                            const newPayload = JSON.parse(atob(newToken.split('.')[1]));
                            setUser(newPayload);
                        } else {
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
                    console.error('[Auth] Token parse error:', e);
                    api.setToken(null);
                    localStorage.removeItem('auth_token');
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // Separate effect for native URL handling
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        console.log('[Auth] Setting up native URL listener');

        const handleAppUrlOpen = async (event) => {
            const { url } = event;
            console.log('[Auth] App URL opened:', url);

            if (url && url.startsWith('simplebaby://callback')) {
                try {
                    // Parse the URL to get the code
                    const queryString = url.split('?')[1];
                    if (queryString) {
                        const params = new URLSearchParams(queryString);
                        const code = params.get('code');
                        if (code) {
                            console.log('[Auth] Got auth code, processing...');
                            await handleCallback(code);
                        }
                    }
                } catch (error) {
                    console.error('[Auth] Error parsing callback URL:', error);
                }
            }
        };

        CapApp.addListener('appUrlOpen', handleAppUrlOpen);

        // Check if app was opened with a URL (cold start)
        CapApp.getLaunchUrl().then((result) => {
            if (result?.url) {
                console.log('[Auth] App launched with URL:', result.url);
                handleAppUrlOpen({ url: result.url });
            }
        });

        return () => {
            console.log('[Auth] Removing URL listener');
            CapApp.removeAllListeners();
        };
    }, []);

    const login = async () => {
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

        const loginUrl = `${COGNITO_DOMAIN}/login?${params}`;
        console.log('[Auth] Opening login URL:', loginUrl);

        if (Capacitor.isNativePlatform()) {
            await Browser.open({ url: loginUrl });
        } else {
            window.location.href = loginUrl;
        }
    };

    const logout = async () => {
        api.setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_email');
        setUser(null);

        if (COGNITO_DOMAIN) {
            const logoutUrl = `${COGNITO_DOMAIN}/logout?client_id=${COGNITO_CLIENT_ID}&logout_uri=${encodeURIComponent(REDIRECT_URI.replace('/callback', ''))}`;

            if (Capacitor.isNativePlatform()) {
                await Browser.open({ url: logoutUrl });
                setTimeout(() => Browser.close(), 1000);
            } else {
                window.location.href = logoutUrl;
            }
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
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
