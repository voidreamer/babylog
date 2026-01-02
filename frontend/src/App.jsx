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
                        <span style={{ fontSize: '1.5rem' }}>👶</span>
                        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>SimpleBaby</h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <BabySelector />
                        {user && (
                            <button
                                className="btn btn-secondary"
                                onClick={logout}
                                style={{ padding: 'var(--space-sm) var(--space-md)' }}
                            >
                                Logout
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
                        <span className="icon">🏠</span>
                        <span>Home</span>
                    </button>
                    <button
                        className={`bottom-nav-item ${activeTab === 'timeline' ? 'active' : ''}`}
                        onClick={() => setActiveTab('timeline')}
                    >
                        <span className="icon">📅</span>
                        <span>Timeline</span>
                    </button>
                    <button
                        className={`bottom-nav-item ${activeTab === 'health' ? 'active' : ''}`}
                        onClick={() => setActiveTab('health')}
                    >
                        <span className="icon">🏥</span>
                        <span>Health</span>
                    </button>
                    <button
                        className={`bottom-nav-item ${activeTab === 'learn' ? 'active' : ''}`}
                        onClick={() => setActiveTab('learn')}
                    >
                        <span className="icon">📚</span>
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
