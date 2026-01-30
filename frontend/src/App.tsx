/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BabyProvider, useBaby } from './hooks/useBaby';
import { useOfflineSync } from './hooks/useOfflineSync';
import { api } from './api/client';
import { checkRateLimit, recordAttempt, getTimeUntilReset, clearRateLimit } from './utils/rateLimiter';
import TimelineCalendar from './components/TimelineCalendar';
import Onboarding from './components/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';
import LoadingSpinner from './components/LoadingSpinner';
import Learn from './components/Learn';
import LanguageSwitcher from './components/LanguageSwitcher';

// Lazy load routes for bundle splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Callback = lazy(() => import('./pages/Callback'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Health = lazy(() => import('./pages/Health'));
import { Home, Clock, Activity, PieChart, Settings as SettingsIcon, LogOut, ChevronRight, User, FileText, Moon, Sun, Star, Sparkles, Download, Shield, ArrowLeft } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// SettingsPage component - defined outside MainApp to prevent re-mounting on state changes
interface SettingsPageProps { user: any; isDark: boolean; toggleTheme: () => void; isPremium: boolean; promoCode: string; setPromoCode: (v: string) => void; promoLoading: boolean; handlePromoCode: () => void; exportLoading: boolean; handleExportCsv: () => void; babies: any[]; setShowPrivacyPolicy: (v: boolean) => void; logout: () => void; }
function SettingsPage({ user, isDark, toggleTheme, isPremium, promoCode, setPromoCode, promoLoading, handlePromoCode, exportLoading, handleExportCsv, babies, setShowPrivacyPolicy, logout }: SettingsPageProps) {
    const { t } = useTranslation(['settings', 'common']);
    return (
        <div className="settings-page">
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>{t('settings:title')}</h2>

            {/* Preferences */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:preferences')}</div>
                <div className="settings-row" onClick={toggleTheme}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box peach">
                            <Moon size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:darkMode')}</div>
                            <div className="settings-row-desc">{t('settings:darkModeDesc')}</div>
                        </div>
                    </div>
                    <div className={`toggle-switch ${isDark ? 'active' : ''}`} />
                </div>
                <div className="settings-row">
                    <div className="settings-row-left">
                        <div className="settings-icon-box sky">
                            <Home size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:language')}</div>
                            <div className="settings-row-desc">{t('settings:languageDesc')}</div>
                        </div>
                    </div>
                    <LanguageSwitcher />
                </div>
            </div>

            {/* Account */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:account')}</div>
                {user && (
                    <div className="settings-row">
                        <div className="settings-row-left">
                            <div className="settings-icon-box lavender">
                                <User size={16} />
                            </div>
                            <div>
                                <div className="settings-row-label">{user.email}</div>
                                <div className="settings-row-desc">{t('settings:signedIn')}</div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="settings-row">
                    <div className="settings-row-left">
                        <div className="settings-icon-box butter">
                            <Star size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:premiumPlan')}</div>
                            <div className="settings-row-desc">
                                {isPremium ? t('settings:premiumActive') : t('settings:unlockAiInsights')}
                            </div>
                        </div>
                    </div>
                    {isPremium ? (
                        <span className="settings-badge mint">{t('settings:premiumActive')}</span>
                    ) : (
                        <span className="settings-badge lavender">{t('settings:upgrade')}</span>
                    )}
                </div>
                {!isPremium && (
                    <div className="settings-promo-row">
                        <input
                            type="text"
                            className="form-input"
                            placeholder={t('settings:enterPromoCode')}
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                        />
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handlePromoCode}
                            disabled={!promoCode.trim() || promoLoading}
                        >
                            {promoLoading ? '...' : t('common:apply')}
                        </button>
                    </div>
                )}
            </div>

            {/* Data */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:data')}</div>
                <div
                    className="settings-row"
                    onClick={handleExportCsv}
                    style={{ cursor: exportLoading || !babies || babies.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box sky">
                            <Download size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:exportData')}</div>
                            <div className="settings-row-desc">
                                {exportLoading ? t('settings:exporting') : t('settings:downloadCsv')}
                            </div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </div>
            </div>

            {/* Support */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:support')}</div>
                <button
                    className="settings-row"
                    onClick={() => setShowPrivacyPolicy(true)}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box mint">
                            <Shield size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:privacyPolicy')}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </button>
                <button
                    className="settings-row settings-row-danger"
                    onClick={logout}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box danger">
                            <LogOut size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:signOut')}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </button>
            </div>
        </div>
    );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function buildHubUrl(session, theme) {
    const url = new URL('https://heybub.app');
    if (session?.access_token && session?.refresh_token) {
        url.searchParams.set('auth_relay', session.access_token);
        url.searchParams.set('refresh_token', session.refresh_token);
    }
    if (theme) {
        url.searchParams.set('theme', theme);
    }
    return url.toString();
}

function MainApp() {
    const { t } = useTranslation(['common', 'settings']);
    const { user, session, logout } = useAuth();
    const { babies, loading: babiesLoading } = useBaby();
    const { online, syncing, pendingCount, syncPendingChanges } = useOfflineSync();
    const [activeTab, setActiveTab] = useState('home');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    // Premium state
    const [isPremium, setIsPremium] = useState(() => {
        return localStorage.getItem('isPremium') === 'true';
    });

    const handlePromoCode = async () => {
        if (!promoCode.trim()) {
            toast.error(t('common:validationErrors.enterPromoCode'));
            return;
        }

        // Check rate limit: 3 attempts per minute
        const rateLimit = checkRateLimit('promoCode', 3, 60000);
        if (!rateLimit.allowed) {
            const timeLeft = getTimeUntilReset(rateLimit.resetTime);
            toast.error(t('common:errors.tooManyAttempts', { time: timeLeft }));
            return;
        }

        setPromoLoading(true);
        // Record this attempt before making the API call
        recordAttempt('promoCode', 60000);

        try {
            const result = await api.redeemPromoCode(promoCode);
            if (result.valid && result.premium) {
                setIsPremium(true);
                localStorage.setItem('isPremium', 'true');
                setPromoCode('');
                // Clear rate limit on success so user isn't penalized
                clearRateLimit('promoCode');
                toast.success(result.message || t('common:premium.unlocked'));
            } else {
                toast.error(result.message || t('common:premium.invalidCode'));
            }
        } catch (_error) {
            toast.error(t('common:premium.failedToVerify'));
        } finally {
            setPromoLoading(false);
        }
    };

    const handleExportCsv = async () => {
        if (!babies || babies.length === 0) {
            toast.error(t('common:validationErrors.noBabyData'));
            return;
        }

        setExportLoading(true);
        try {
            // Export current baby's data
            const currentBaby = babies[0];
            await api.exportBabyDataCsv(currentBaby.id);
            toast.success(t('common:export.complete'));
        } catch (error) {
            toast.error(t('common:export.failed', { error: (error as Error).message }));
        } finally {
            setExportLoading(false);
        }
    };

    // Theme state with migration from old theme values
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'handwritten') return 'light';
        if (saved === 'handwritten-dark' || saved === 'classic') return 'dark';
        return saved || 'light';
    });

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    // Apply theme on mount and when it changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Check premium status from server on app load
    // This ensures premium persists across cache clears and devices
    useEffect(() => {
        const checkPremiumStatus = async () => {
            if (!user || !online) return;

            try {
                const status = await api.getSubscriptionStatus();
                if (status.premium) {
                    setIsPremium(true);
                    localStorage.setItem('isPremium', 'true');
                } else {
                    // Server says not premium - update local state
                    // (could be cache was cleared but user never had premium)
                    setIsPremium(false);
                    localStorage.setItem('isPremium', 'false');
                }
            } catch (error) {
                // On error, keep localStorage value as fallback
                console.warn('Failed to check premium status:', error);
            }
        };

        checkPremiumStatus();
    }, [user, online]);

    // Check if we should show onboarding (no babies yet)
    // Only show onboarding when online - if offline with no cached babies, show offline message instead
    useEffect(() => {
        if (!babiesLoading && babies.length === 0 && online) {
            setShowOnboarding(true);
        }
    }, [babies, babiesLoading, online]);

    // Show onboarding for first-time users (only when online)
    if (showOnboarding && !babiesLoading && babies.length === 0 && online) {
        return (
            <Onboarding
                onComplete={() => setShowOnboarding(false)}
            />
        );
    }

    // Show offline message if offline with no cached babies
    if (!babiesLoading && babies.length === 0 && !online) {
        return (
            <div className="app-container">
                <OfflineIndicator
                    online={online}
                    syncing={syncing}
                    pendingCount={pendingCount}
                    onSync={syncPendingChanges}
                />
                <div className="empty-state" style={{ paddingTop: 'var(--space-2xl)' }}>
                    <div className="empty-state-icon">📡</div>
                    <h2 className="empty-state-title">{t('common:offline.youreOffline')}</h2>
                    <p className="empty-state-text">
                        {t('common:offline.offlineMessage')}
                    </p>
                </div>
            </div>
        );
    }

    // Show privacy policy if requested
    if (showPrivacyPolicy) {
        return (
            <div className="app-container" style={{ paddingBottom: 'var(--space-xl)' }}>
                <PrivacyPolicy onBack={() => setShowPrivacyPolicy(false)} />
            </div>
        );
    }

    if (babiesLoading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-left">
                    <a href={buildHubUrl(session, theme)} className="hub-back-link">
                        <ArrowLeft size={16} />
                        <span>{t('common:hub')}</span>
                    </a>
                    <span className="header-title">{t('common:babyTracker')}</span>
                </div>
                <div className="header-actions">
                    <button className="btn-icon theme-toggle" onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </header>
            <OfflineIndicator
                online={online}
                syncing={syncing}
                pendingCount={pendingCount}
                onSync={syncPendingChanges}
            />
            <main>
                {activeTab === 'home' && <Dashboard />}
                {activeTab === 'timeline' && <TimelineCalendar />}
                {activeTab === 'health' && (
                    <Suspense fallback={
                        <div className="loading">
                            <div className="spinner"></div>
                        </div>
                    }>
                        <Health />
                    </Suspense>
                )}
                {activeTab === 'learn' && <Learn isPremium={isPremium} />}
                {activeTab === 'settings' && (
                    <SettingsPage
                        user={user}
                        isDark={theme === 'dark'}
                        toggleTheme={toggleTheme}
                        isPremium={isPremium}
                        promoCode={promoCode}
                        setPromoCode={setPromoCode}
                        promoLoading={promoLoading}
                        handlePromoCode={handlePromoCode}
                        exportLoading={exportLoading}
                        handleExportCsv={handleExportCsv}
                        babies={babies}
                        setShowPrivacyPolicy={setShowPrivacyPolicy}
                        logout={logout}
                    />
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <button
                    className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                    onClick={() => setActiveTab('home')}
                >
                    <Home size={22} />
                    <span>{t('common:nav.home')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'timeline' ? 'active' : ''}`}
                    onClick={() => setActiveTab('timeline')}
                >
                    <Clock size={22} />
                    <span>{t('common:nav.timeline')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'health' ? 'active' : ''}`}
                    onClick={() => setActiveTab('health')}
                >
                    <Activity size={22} />
                    <span>{t('common:nav.health')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'learn' ? 'active' : ''}`}
                    onClick={() => setActiveTab('learn')}
                >
                    <PieChart size={22} />
                    <span>{t('common:nav.insights')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    <SettingsIcon size={22} />
                    <span>{t('common:nav.settings')}</span>
                </button>
            </nav>
        </div>
    );
}

function AppContent() {
    return (
        <BabyProvider>
            <MainApp />
        </BabyProvider>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <Toaster
                    position="top-center"
                    richColors
                    closeButton
                    toastOptions={{
                        style: {
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                        },
                    }}
                />
                <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/callback" element={<Callback />} />
                        <Route path="/health-check" element={<Health />} />
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute>
                                    <AppContent />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </Suspense>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
