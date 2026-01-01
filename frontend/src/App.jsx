import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BabyProvider } from './hooks/useBaby';
import Dashboard from './components/Dashboard';
import BabySelector from './components/BabySelector';
import Login from './pages/Login';
import Callback from './pages/Callback';

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

    return (
        <BabyProvider>
            <div className="app-container">
                <header className="page-header">
                    <div className="page-title">
                        <span style={{ fontSize: '1.5rem' }}>👶</span>
                        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Huckle</h1>
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
                    <Dashboard />
                </main>
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
            </Routes>
        </AuthProvider>
    );
}
