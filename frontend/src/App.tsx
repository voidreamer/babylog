/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { Home, Clock, Activity, PieChart, Settings as SettingsIcon, LogOut, ChevronRight, User, FileText, Moon, Sun, Star, Sparkles, Download, Shield, ArrowLeft, Crown } from 'lucide-react';
import UpgradeDialog from './components/UpgradeDialog';
import { Toaster, toast } from 'sonner';

// SettingsPage component
interface SettingsPageProps { user: any; isDark: boolean; toggleTheme: () => void; isPremium: boolean; hasStripeSubscription: boolean; exportLoading: boolean; handleExportCsv: () => void; babies: any[]; setShowPrivacyPolicy: (v: boolean) => void; logout: () => void; onUpgrade: () => void; onManage: () => void; }
function SettingsPage({ user, isDark, toggleTheme, isPremium, hasStripeSubscription, exportLoading, handleExportCsv, babies, setShowPrivacyPolicy, logout, onUpgrade, onManage }: SettingsPageProps) {
    const { t } = useTranslation(['settings', 'common']);

    return (
        <div className="settings-page">
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>{t('settings:title')}</h2>

            {/* Preferences */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:preferences.title')}</div>
                <div className="settings-row" onClick={toggleTheme}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box peach">
                            <Moon size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:preferences.darkMode')}</div>
                            <div className="settings-row-desc">{t('settings:preferences.darkModeDesc')}</div>
                        </div>
                    </div>
                    <div className={`toggle-switch ${isDark ? 'active' : ''}`} />
                </div>
                <LanguageSwitcher />
            </div>

            {/* Account */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:account.title')}</div>
                {user && (
                    <div className="settings-row">
                        <div className="settings-row-left">
                            <div className="settings-icon-box lavender">
                                <User size={16} />
                            </div>
                            <div>
                                <div className="settings-row-label">{user.email} {isPremium && <span style={{ fontSize: 11, background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#fff', padding: '1px 6px', borderRadius: 8, marginLeft: 6, fontWeight: 600 }}>PRO</span>}</div>
                                <div className="settings-row-desc">{isPremium ? t('settings:account.premiumMember') : t('settings:account.signedIn')}</div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="settings-row" onClick={isPremium && !hasStripeSubscription ? undefined : (isPremium ? onManage : onUpgrade)} style={{ cursor: isPremium && !hasStripeSubscription ? 'default' : 'pointer' }}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box butter">
                            <Crown size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:account.premium.title')}</div>
                            <div className="settings-row-desc">
                                {isPremium
                                    ? hasStripeSubscription
                                        ? t('settings:account.premium.activeManage')
                                        : t('settings:account.premium.activePromo')
                                    : t('settings:account.premium.unlock')}
                            </div>
                        </div>
                    </div>
                    {isPremium ? (
                        <span className="settings-badge mint">{t('settings:account.premium.active')}</span>
                    ) : (
                        <ChevronRight size={18} className="settings-arrow" />
                    )}
                </div>
            </div>

            {/* Data */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:data.title')}</div>
                <div
                    className="settings-row"
                    onClick={isPremium ? handleExportCsv : onUpgrade}
                    style={{ cursor: exportLoading || (!isPremium && false) || !babies || babies.length === 0 ? 'not-allowed' : 'pointer', opacity: isPremium ? 1 : 0.6 }}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box sky">
                            <Download size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:data.export')} {!isPremium && <span className="settings-badge mint" style={{ fontSize: 10, marginLeft: 6 }}>PRO</span>}</div>
                            <div className="settings-row-desc">
                                {!isPremium ? t('settings:data.upgradeToExport') : exportLoading ? t('settings:data.exporting') : t('settings:data.exportDesc')}
                            </div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </div>
            </div>

            {/* Support */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:support.title')}</div>
                <button
                    className="settings-row"
                    onClick={() => setShowPrivacyPolicy(true)}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box mint">
                            <Shield size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:support.privacyPolicy')}</div>
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
                            <div className="settings-row-label">{t('settings:support.signOut')}</div>
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
    const { t } = useTranslation('common');
    const { user, session, logout } = useAuth();
    const { babies, loading: babiesLoading } = useBaby();
    const { online, syncing, pendingCount, syncPendingChanges } = useOfflineSync();
    const [activeTab, setActiveTab] = useState('home');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    const [isPremium, setIsPremium] = useState(() => {
        return localStorage.getItem('isPremium') === 'true';
    });
    const [hasStripeSubscription, setHasStripeSubscription] = useState(() => {
        return localStorage.getItem('hasStripeSubscription') === 'true';
    });

    const handleManageSubscription = async () => {
        try {
            const result = await api.createBillingPortal();
            window.location.href = result.portal_url;
        } catch {
            toast.error(t('settings:upgrade.manageSub', { ns: 'settings' }));
        }
    };

    const handleExportCsv = async () => {
        if (!babies || babies.length === 0) {
            toast.error(t('settings:data.noDataToExport', { ns: 'settings' }));
            return;
        }

        setExportLoading(true);
        try {
            const currentBaby = babies[0];
            await api.exportBabyDataCsv(currentBaby.id);
            toast.success(t('settings:data.exportSuccess', { ns: 'settings' }));
        } catch (error) {
            toast.error(t('settings:data.exportFailed', { ns: 'settings' }) + ': ' + (error as Error).message);
        } finally {
            setExportLoading(false);
        }
    };

    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'handwritten') return 'light';
        if (saved === 'handwritten-dark' || saved === 'classic') return 'dark';
        return saved || 'light';
    });

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const checkPremiumStatus = async () => {
            if (!user || !online) return;

            try {
                const status = await api.getSubscriptionStatus();
                if (status.premium) {
                    setIsPremium(true);
                    localStorage.setItem('isPremium', 'true');
                } else {
                    setIsPremium(false);
                    localStorage.setItem('isPremium', 'false');
                }
                try {
                    const billing = await api.getBillingSubscription();
                    const hasSub = billing.is_premium && !!billing.plan;
                    setHasStripeSubscription(hasSub);
                    localStorage.setItem('hasStripeSubscription', hasSub ? 'true' : 'false');
                } catch {
                    setHasStripeSubscription(false);
                    localStorage.setItem('hasStripeSubscription', 'false');
                }
            } catch (error) {
                console.warn('Failed to check premium status:', error);
            }
        };

        checkPremiumStatus();
    }, [user, online]);

    useEffect(() => {
        if (!babiesLoading && babies.length === 0 && online) {
            setShowOnboarding(true);
        }
    }, [babies, babiesLoading, online]);

    if (showOnboarding && !babiesLoading && babies.length === 0 && online) {
        return (
            <Onboarding
                onComplete={() => setShowOnboarding(false)}
            />
        );
    }

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
                    <h2 className="empty-state-title">{t('offline')}</h2>
                    <p className="empty-state-text">
                        {t('offlineMessage')}
                    </p>
                </div>
            </div>
        );
    }

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
                        <span>{t('hub')}</span>
                    </a>
                    <span className="header-title">{t('babyTracker')}</span>
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
                        hasStripeSubscription={hasStripeSubscription}
                        exportLoading={exportLoading}
                        handleExportCsv={handleExportCsv}
                        babies={babies}
                        setShowPrivacyPolicy={setShowPrivacyPolicy}
                        logout={logout}
                        onUpgrade={() => setShowUpgradeDialog(true)}
                        onManage={handleManageSubscription}
                    />
                )}
            </main>

            {showUpgradeDialog && <UpgradeDialog onClose={() => setShowUpgradeDialog(false)} />}

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <button
                    className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                    onClick={() => setActiveTab('home')}
                >
                    <Home size={22} />
                    <span>{t('nav.home')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'timeline' ? 'active' : ''}`}
                    onClick={() => setActiveTab('timeline')}
                >
                    <Clock size={22} />
                    <span>{t('nav.timeline')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'health' ? 'active' : ''}`}
                    onClick={() => setActiveTab('health')}
                >
                    <Activity size={22} />
                    <span>{t('nav.health')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'learn' ? 'active' : ''}`}
                    onClick={() => setActiveTab('learn')}
                >
                    <PieChart size={22} />
                    <span>{t('nav.insights')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    <SettingsIcon size={22} />
                    <span>{t('nav.settings')}</span>
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
