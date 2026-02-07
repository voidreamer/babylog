/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BabyProvider, useBaby } from './hooks/useBaby';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useAnalytics } from './hooks/useAnalytics';
import { api } from './api/client';
import { checkRateLimit, recordAttempt, getTimeUntilReset, clearRateLimit } from './utils/rateLimiter';
import { hapticSelection } from './utils/haptics';
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
interface SettingsPageProps { user: any; isDark: boolean; toggleTheme: () => void; isPremium: boolean; hasStripeSubscription: boolean; exportLoading: boolean; handleExportCsv: () => void; babies: any[]; setShowPrivacyPolicy: (v: boolean) => void; logout: () => void; onUpgrade: () => void; onManage: () => void; setActiveTab: (tab: string) => void; hubUrl: string; }
function SettingsPage({ user, isDark, toggleTheme, isPremium, hasStripeSubscription, exportLoading, handleExportCsv, babies, setShowPrivacyPolicy, logout, onUpgrade, onManage, setActiveTab, hubUrl }: SettingsPageProps) {
    const { t } = useTranslation(['settings', 'common']);
    const [notifications, setNotifications] = useState(() => localStorage.getItem('heybub-notifications') !== 'false');
    const [unitsSystem, setUnitsSystem] = useState(() => localStorage.getItem('heybub-units') || 'metric');

    const currentBaby = babies?.[0];

    const toggleNotifications = async () => {
        const { subscribeToPush, unsubscribeFromPush } = await import('./utils/pushNotifications');
        const next = !notifications;
        if (next) {
            const ok = await subscribeToPush();
            if (!ok) return; // Permission denied or not supported
        } else {
            await unsubscribeFromPush();
        }
        setNotifications(next);
        localStorage.setItem('heybub-notifications', String(next));
    };

    const toggleUnits = () => {
        const next = unitsSystem === 'metric' ? 'imperial' : 'metric';
        setUnitsSystem(next);
        localStorage.setItem('heybub-units', next);
    };

    const formatDob = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return dateStr; }
    };

    return (
        <div className="settings-page">
            <h2 className="settings-page-title">{t('settings:title')}</h2>

            {/* Baby Profile */}
            {currentBaby && (
                <div className="settings-group">
                    <div className="settings-group-title">{t('settings:babyProfile.title')}</div>
                    <div className="settings-row">
                        <div className="settings-row-left">
                            <div className="settings-icon-box blush">👶</div>
                            <div>
                                <div className="settings-row-label">{currentBaby.name}</div>
                                <div className="settings-row-desc">{currentBaby.birth_date ? t('settings:babyProfile.born', { date: formatDob(currentBaby.birth_date) }) : ''}</div>
                            </div>
                        </div>
                    </div>
                    <div className="settings-row" onClick={() => setActiveTab('health')}>
                        <div className="settings-row-left">
                            <div className="settings-icon-box butter">📈</div>
                            <div>
                                <div className="settings-row-label">{t('settings:babyProfile.growthData')}</div>
                                <div className="settings-row-desc">{t('settings:babyProfile.growthDataDesc')}</div>
                            </div>
                        </div>
                        <ChevronRight size={18} className="settings-arrow" />
                    </div>
                    <div className="settings-row" onClick={() => setActiveTab('home')}>
                        <div className="settings-row-left">
                            <div className="settings-icon-box lavender">👶</div>
                            <div>
                                <div className="settings-row-label">{t('settings:babyProfile.addAnother')}</div>
                                <div className="settings-row-desc">{t('settings:babyProfile.addAnotherDesc')}</div>
                            </div>
                        </div>
                        <ChevronRight size={18} className="settings-arrow" />
                    </div>
                </div>
            )}

            {/* Preferences */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:preferences.title')}</div>
                <div className="settings-row" onClick={toggleNotifications}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box sky">🔔</div>
                        <div>
                            <div className="settings-row-label">{t('settings:preferences.notifications')}</div>
                            <div className="settings-row-desc">{t('settings:preferences.notificationsDesc')}</div>
                        </div>
                    </div>
                    <div className={`toggle-switch ${notifications ? 'active' : ''}`} />
                </div>
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
                <div className="settings-row" onClick={toggleUnits}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box mint">🌐</div>
                        <div>
                            <div className="settings-row-label">{t('settings:preferences.units')}</div>
                            <div className="settings-row-desc">{unitsSystem === 'metric' ? t('settings:preferences.unitsMetric') : t('settings:preferences.unitsImperial')}</div>
                        </div>
                    </div>
                    <span className="settings-badge sky">{unitsSystem === 'metric' ? 'kg, cm, ml' : 'lbs, in, oz'}</span>
                </div>
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
                                <div className="settings-row-label">{user.email} {isPremium && <span className="pro-badge">PRO</span>}</div>
                                <div className="settings-row-desc">{isPremium ? t('settings:account.premiumMember') : t('settings:account.signedIn')}</div>
                            </div>
                        </div>
                    </div>
                )}
                <div className={`settings-row ${isPremium && !hasStripeSubscription ? 'settings-row--disabled' : ''}`} onClick={isPremium && !hasStripeSubscription ? undefined : (isPremium ? onManage : onUpgrade)}>
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
                <div className="settings-row">
                    <div className="settings-row-left">
                        <div className="settings-icon-box butter">👥</div>
                        <div>
                            <div className="settings-row-label">{t('settings:account.caregivers')}</div>
                            <div className="settings-row-desc">{t('settings:account.caregiversDesc')}</div>
                        </div>
                    </div>
                    <span className="settings-badge lavender">{t('settings:account.comingSoon')}</span>
                </div>
                <div
                    className={`settings-row ${!isPremium ? 'settings-row--disabled' : ''}`}
                    onClick={isPremium ? handleExportCsv : onUpgrade}
                >
                    <div className="settings-row-left">
                        <div className="settings-icon-box sky">
                            <Download size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:data.export')} {!isPremium && <span className="pro-badge">PRO</span>}</div>
                            <div className="settings-row-desc">
                                {!isPremium ? t('settings:data.upgradeToExport') : exportLoading ? t('settings:data.exporting') : t('settings:data.exportDesc')}
                            </div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </div>
            </div>

            {/* Navigation */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:navigation.title')}</div>
                <a className="settings-row" href={hubUrl}>
                    <div className="settings-row-left">
                        <div className="settings-icon-box sky">
                            <ArrowLeft size={16} />
                        </div>
                        <div>
                            <div className="settings-row-label">{t('settings:navigation.backToHub')}</div>
                            <div className="settings-row-desc">{t('settings:navigation.backToHubDesc')}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </a>
            </div>

            {/* Support */}
            <div className="settings-group">
                <div className="settings-group-title">{t('settings:support.title')}</div>
                <a className="settings-row" href="mailto:support@heybub.app">
                    <div className="settings-row-left">
                        <div className="settings-icon-box peach">📧</div>
                        <div>
                            <div className="settings-row-label">{t('settings:support.contactUs')}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </a>
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
                <a className="settings-row" href="https://heybub.app/terms" target="_blank" rel="noopener noreferrer">
                    <div className="settings-row-left">
                        <div className="settings-icon-box cloud">📋</div>
                        <div>
                            <div className="settings-row-label">{t('settings:support.termsOfService')}</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="settings-arrow" />
                </a>
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

            <p className="settings-version">{t('app.version', { version: '1.0.0' })}</p>
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
    const { track, trackPageView } = useAnalytics();
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
        trackPageView(activeTab);
    }, [activeTab, trackPageView]);

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
            {/* Header removed — greeting is in BabyGreeting, dark mode in Settings, hub link in Settings */}
            <OfflineIndicator
                online={online}
                syncing={syncing}
                pendingCount={pendingCount}
                onSync={syncPendingChanges}
            />
            <main>
                {activeTab === 'home' && (
                    <ErrorBoundary level="page">
                        <Dashboard />
                    </ErrorBoundary>
                )}
                {activeTab === 'timeline' && (
                    <ErrorBoundary level="page">
                        <TimelineCalendar />
                    </ErrorBoundary>
                )}
                {activeTab === 'health' && (
                    <ErrorBoundary level="page">
                        <Suspense fallback={
                            <div className="loading">
                                <div className="spinner"></div>
                            </div>
                        }>
                            <Health />
                        </Suspense>
                    </ErrorBoundary>
                )}
                {activeTab === 'learn' && (
                    <ErrorBoundary level="page">
                        <Learn isPremium={isPremium} />
                    </ErrorBoundary>
                )}
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
                        setActiveTab={setActiveTab}
                        hubUrl={buildHubUrl(session, theme)}
                    />
                )}
            </main>

            {showUpgradeDialog && <UpgradeDialog onClose={() => setShowUpgradeDialog(false)} />}

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <button
                    className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                    onClick={() => { hapticSelection(); setActiveTab('home'); }}
                >
                    <Home size={22} />
                    <span>{t('nav.home')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'timeline' ? 'active' : ''}`}
                    onClick={() => { hapticSelection(); setActiveTab('timeline'); }}
                >
                    <Clock size={22} />
                    <span>{t('nav.timeline')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'health' ? 'active' : ''}`}
                    onClick={() => { hapticSelection(); setActiveTab('health'); }}
                >
                    <Activity size={22} />
                    <span>{t('nav.health')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'learn' ? 'active' : ''}`}
                    onClick={() => { hapticSelection(); setActiveTab('learn'); }}
                >
                    <PieChart size={22} />
                    <span>{t('nav.insights')}</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => { hapticSelection(); setActiveTab('settings'); }}
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
