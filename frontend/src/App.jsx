import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BabyProvider } from './hooks/useBaby';
import Dashboard from './components/Dashboard';
import TimelineCalendar from './components/TimelineCalendar';
import BabySelector from './components/BabySelector';
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
            <div className="loading" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function AppContent() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home');

    // Settings page content
    const SettingsPage = () => (
        <div className="settings-page">
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>Settings</h2>

            <div className="settings-section">
                <h3 className="settings-section-title">Account</h3>
                {user && (
                    <div className="settings-item">
                        <span className="settings-item-label">Signed in as</span>
                        <span className="settings-item-value">{user.email || 'User'}</span>
                    </div>
                )}
                <button
                    className="btn btn-secondary btn-block"
                    onClick={logout}
                    style={{ marginTop: 'var(--space-md)', justifyContent: 'center' }}
                >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );

    return (
        <BabyProvider>
            <div className="app-container">
                <header className="page-header">
                    {/* Baby selector takes center stage */}
                    <BabySelector />
                </header>

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
        </BabyProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Toaster
                theme="dark"
                position="top-center"
                toastOptions={{
                    style: {
                        background: '#1a1a2e',
                        border: '1px solid #2d2d44',
                        color: '#fff',
                    },
                }}
            />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/callback" element={<Callback />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <AppContent />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    );
}
