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
import { Home, CalendarDays, HeartPulse, BookOpen, Baby, LogOut } from 'lucide-react';
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

    return (
        <BabyProvider>
            <div className="app-container">
                <header className="page-header">
                    <div className="page-title">
                        <Baby size={24} />
                        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>SimpleBaby</h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <BabySelector />
                        {user && (
                            <button
                                className="btn btn-secondary"
                                onClick={logout}
                                style={{ padding: 'var(--space-sm) var(--space-md)', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <LogOut size={16} />
                                <span className="hide-mobile">Logout</span>
                            </button>
                        )}
                    </div>
                </header>

                <main>
                    {activeTab === 'home' && <Dashboard />}
                    {activeTab === 'timeline' && <TimelineCalendar />}
                    {activeTab === 'health' && <Health />}
                    {activeTab === 'learn' && <Learn />}
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
