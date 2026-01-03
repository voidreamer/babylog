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

    // Widget visibility settings
    const [visibleWidgets, setVisibleWidgets] = useState(() => {
        const saved = localStorage.getItem('visibleWidgets');
        return saved ? JSON.parse(saved) : ['feeding', 'diaper', 'sleep', 'pumping'];
    });

    const allWidgets = [
        { id: 'feeding', label: 'Feeding' },
        { id: 'diaper', label: 'Diaper' },
        { id: 'sleep', label: 'Sleep' },
        { id: 'pumping', label: 'Pumping' },
        { id: 'potty', label: 'Potty Training' },
        { id: 'tummy', label: 'Tummy Time' },
        { id: 'bath', label: 'Bath' },
    ];

    const toggleWidget = (widgetId) => {
        setVisibleWidgets(prev => {
            const updated = prev.includes(widgetId)
                ? prev.filter(id => id !== widgetId)
                : [...prev, widgetId];
            localStorage.setItem('visibleWidgets', JSON.stringify(updated));
            // Dispatch storage event for Dashboard to pick up
            window.dispatchEvent(new Event('storage'));
            return updated;
        });
    };

    // Settings page content
    const SettingsPage = () => (
        <div className="settings-page">
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>Settings</h2>

            <div className="settings-section">
                <h3 className="settings-section-title">Dashboard Widgets</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                    Choose which widgets appear on your dashboard
                </p>
                <div className="settings-widget-list">
                    {allWidgets.map(widget => (
                        <label key={widget.id} className="settings-toggle">
                            <input
                                type="checkbox"
                                checked={visibleWidgets.includes(widget.id)}
                                onChange={() => toggleWidget(widget.id)}
                            />
                            <span className="settings-toggle-slider"></span>
                            <span className="settings-toggle-label">{widget.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">Account</h3>
                {user && (
                    <div className="settings-item">
                        <span className="settings-item-label">Signed in as</span>
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
