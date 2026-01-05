import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BabyProvider, useBaby } from './hooks/useBaby';
import Dashboard from './components/Dashboard';
import TimelineCalendar from './components/TimelineCalendar';
import Onboarding from './components/Onboarding';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Health from './pages/Health';
import Learn from './components/Learn';
import { Home, CalendarDays, HeartPulse, BookOpen, Settings, LogOut } from 'lucide-react';
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

    // Settings page content
    const SettingsPage = () => (
        <div className="settings-page">
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>Settings</h2>

            <div className="settings-section">
                <h3 className="settings-section-title">Appearance</h3>
                <div className="settings-item">
                    <span className="settings-item-label">Theme</span>
                    <select
                        className="settings-select"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                    >
                        <option value="handwritten">✏️ Handwritten</option>
                        <option value="classic">🌙 Classic Dark</option>
                    </select>
                </div>
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">Account</h3>
                {user && (
                    <div className="settings-item">
                        <span className="settings-item-label">Signed in as:  </span>
                        <span className="settings-item-value">{user.email}</span>
                    </div>
                )}
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
                {activeTab === 'learn' && <Learn />}
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
                    <BookOpen size={20} />
                    <span>Learn</span>
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
    );
}

export default App;
