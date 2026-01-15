import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BabyProvider, useBaby } from './hooks/useBaby';
import { useOfflineSync } from './hooks/useOfflineSync';
import { api } from './api/client';
import { checkRateLimit, recordAttempt, getTimeUntilReset, clearRateLimit } from './utils/rateLimiter';
import Dashboard from './components/Dashboard';
import TimelineCalendar from './components/TimelineCalendar';
import Onboarding from './components/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Health from './pages/Health';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Learn from './components/Learn';
import { Home, CalendarDays, HeartPulse, BookOpen, Settings as SettingsIcon, LogOut, ChevronRight, Palette, User, FileText, Pencil, Moon, Star, Gift, Sparkles, Download } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// SettingsPage component - defined outside MainApp to prevent re-mounting on state changes
function SettingsPage({
    user,
    theme,
    setTheme,
    isPremium,
    promoCode,
    setPromoCode,
    promoLoading,
    handlePromoCode,
    exportLoading,
    handleExportCsv,
    babies,
    setShowPrivacyPolicy,
    logout
}) {
    return (
        <div className="settings-page">
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>Settings</h2>

            <div className="settings-section">
                <div className="settings-section-header">
                    <Palette size={18} className="settings-section-icon" />
                    <h3 className="settings-section-title">Appearance</h3>
                </div>
                <div className="settings-item">
                    <span className="settings-item-label">Theme</span>
                    <select
                        className="settings-select"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                    >
                        <option value="handwritten">Handwritten Light</option>
                        <option value="handwritten-dark">Handwritten Dark</option>
                        <option value="classic">Classic Dark</option>
                    </select>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-section-header">
                    <User size={18} className="settings-section-icon" />
                    <h3 className="settings-section-title">Account</h3>
                </div>
                {user && (
                    <div className="settings-item">
                        <span className="settings-item-label">Signed in as:  </span>
                        <span className="settings-item-value">{user.email}</span>
                    </div>
                )}
            </div>

            <div className="settings-section">
                <div className="settings-section-header">
                    <Star size={18} className="settings-section-icon" />
                    <h3 className="settings-section-title">Premium</h3>
                </div>
                {isPremium ? (
                    <div className="settings-item" style={{ color: 'var(--success)' }}>
                        <span className="settings-item-label">Status</span>
                        <span className="settings-item-value" style={{ color: 'var(--success)' }}>Active</span>
                    </div>
                ) : (
                    <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-sm)' }}>
                        <label className="settings-item-label">Enter promo code</label>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter code..."
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handlePromoCode}
                                disabled={!promoCode.trim() || promoLoading}
                            >
                                {promoLoading ? 'Verifying...' : 'Apply'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="settings-section">
                <div className="settings-section-header">
                    <Download size={18} className="settings-section-icon" />
                    <h3 className="settings-section-title">Data</h3>
                </div>
                <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-sm)' }}>
                    <span className="settings-item-label">Export your baby's tracking data</span>
                    <button
                        className="btn btn-secondary"
                        onClick={handleExportCsv}
                        disabled={exportLoading || !babies || babies.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', justifyContent: 'center' }}
                    >
                        <Download size={16} />
                        {exportLoading ? 'Exporting...' : 'Download CSV'}
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Includes all feedings, sleep, diapers, and activities
                    </span>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-section-header">
                    <FileText size={18} className="settings-section-icon" />
                    <h3 className="settings-section-title">Legal</h3>
                </div>
                <button
                    className="settings-item settings-link-btn"
                    onClick={() => setShowPrivacyPolicy(true)}
                >
                    <span className="settings-item-label">Privacy Policy</span>
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="settings-section">
                <button
                    className="settings-logout-btn"
                    onClick={logout}
                >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}

function ProtectedRoute({ children }) {
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

function MainApp() {
    const { user, logout } = useAuth();
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
            toast.error('Please enter a promo code');
            return;
        }

        // Check rate limit: 3 attempts per minute
        const rateLimit = checkRateLimit('promoCode', 3, 60000);
        if (!rateLimit.allowed) {
            const timeLeft = getTimeUntilReset(rateLimit.resetTime);
            toast.error(`Too many attempts. Please wait ${timeLeft} and try again.`);
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
                toast.success(result.message || 'Premium unlocked!');
            } else {
                toast.error(result.message || 'Invalid code');
            }
        } catch (error) {
            toast.error('Failed to verify code. Please try again.');
        } finally {
            setPromoLoading(false);
        }
    };

    const handleExportCsv = async () => {
        if (!babies || babies.length === 0) {
            toast.error('No baby data to export');
            return;
        }

        setExportLoading(true);
        try {
            // Export current baby's data
            const currentBaby = babies[0];
            await api.exportBabyDataCsv(currentBaby.id);
            toast.success('Export complete! Check your downloads folder.');
        } catch (error) {
            toast.error('Export failed: ' + error.message);
        } finally {
            setExportLoading(false);
        }
    };

    // Theme state
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'handwritten';
    });

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
                    <h2 className="empty-state-title">You're Offline</h2>
                    <p className="empty-state-text">
                        Connect to the internet to load your baby data.
                        Your data will sync automatically when you're back online.
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
            <OfflineIndicator
                online={online}
                syncing={syncing}
                pendingCount={pendingCount}
                onSync={syncPendingChanges}
            />
            <main>
                {activeTab === 'home' && <Dashboard />}
                {activeTab === 'timeline' && <TimelineCalendar />}
                {activeTab === 'health' && <Health />}
                {activeTab === 'learn' && <Learn isPremium={isPremium} />}
                {activeTab === 'settings' && (
                    <SettingsPage
                        user={user}
                        theme={theme}
                        setTheme={setTheme}
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
                    <Home size={20} />
                    <span>Home</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'timeline' ? 'active' : ''}`}
                    onClick={() => setActiveTab('timeline')}
                >
                    <CalendarDays size={20} />
                    <span>Timeline</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'health' ? 'active' : ''}`}
                    onClick={() => setActiveTab('health')}
                >
                    <HeartPulse size={20} />
                    <span>Health</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'learn' ? 'active' : ''}`}
                    onClick={() => setActiveTab('learn')}
                >
                    <Sparkles size={20} />
                    <span>Insights</span>
                </button>
                <button
                    className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    <SettingsIcon size={20} />
                    <span>Settings</span>
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
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
