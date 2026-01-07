import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BabyProvider, useBaby } from './hooks/useBaby';
import { api } from './api/client';
import Dashboard from './components/Dashboard';
import TimelineCalendar from './components/TimelineCalendar';
import Onboarding from './components/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Health from './pages/Health';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Learn from './components/Learn';
import { Home, CalendarDays, HeartPulse, BookOpen, Settings, LogOut, ChevronRight, Palette, User, FileText, Pencil, Moon, Star, Gift, Sparkles, Download } from 'lucide-react';
import { Toaster } from 'sonner';

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
            alert('Please enter a promo code');
            return;
        }

        setPromoLoading(true);
        try {
            const result = await api.redeemPromoCode(promoCode);
            if (result.valid && result.premium) {
                setIsPremium(true);
                localStorage.setItem('isPremium', 'true');
                setPromoCode('');
                alert(result.message || 'Premium unlocked!');
            } else {
                alert(result.message || 'Invalid code');
            }
        } catch (error) {
            alert('Failed to verify code. Please try again.');
        } finally {
            setPromoLoading(false);
        }
    };

    const handleExportCsv = async () => {
        if (!babies || babies.length === 0) {
            alert('No baby data to export');
            return;
        }

        setExportLoading(true);
        try {
            // Export current baby's data
            const currentBaby = babies[0];
            await api.exportBabyDataCsv(currentBaby.id);
            alert('Export complete! Check your downloads folder.');
        } catch (error) {
            alert('Export failed: ' + error.message);
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

    // Check if we should show onboarding (no babies yet)
    useEffect(() => {
        if (!babiesLoading && babies.length === 0) {
            setShowOnboarding(true);
        }
    }, [babies, babiesLoading]);

    // Show onboarding for first-time users
    if (showOnboarding && !babiesLoading && babies.length === 0) {
        return (
            <Onboarding
                onComplete={() => setShowOnboarding(false)}
            />
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

    // Settings page content
    const SettingsPage = () => (
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

    if (babiesLoading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <main>
                {activeTab === 'home' && <Dashboard />}
                {activeTab === 'timeline' && <TimelineCalendar />}
                {activeTab === 'health' && <Health />}
                {activeTab === 'learn' && <Learn isPremium={isPremium} />}
                {activeTab === 'settings' && <SettingsPage />}
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
                    <Settings size={20} />
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
