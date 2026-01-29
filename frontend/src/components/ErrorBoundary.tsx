/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Fallback UI shown when an error is caught
 */
interface ErrorFallbackProps { error: Error | null; onRetry: () => void; }
function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
    return (
        <div className="error-fallback">
            <div className="error-fallback-content">
                <div className="error-fallback-icon">
                    <AlertTriangle size={48} />
                </div>
                <h2 className="error-fallback-title">Something went wrong</h2>
                <p className="error-fallback-message">
                    We're sorry, but something unexpected happened. Please try again.
                </p>
                {error?.message && process.env.NODE_ENV === 'development' && (
                    <pre className="error-fallback-details">
                        {error.message}
                    </pre>
                )}
                <button
                    className="btn btn-primary btn-lg"
                    onClick={onRetry}
                >
                    <RefreshCw size={18} />
                    <span>Try Again</span>
                </button>
            </div>
        </div>
    );
}

/**
 * Error Boundary class component to catch JavaScript errors anywhere in the child component tree
 */
interface ErrorBoundaryProps { children: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }

        // TODO: In production, send to error monitoring service (e.g., Sentry, LogRocket)
        // Example: Sentry.captureException(error, { extra: { componentStack: errorInfo?.componentStack } });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        // Optionally reload the page if the error is unrecoverable
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <ErrorFallback
                    error={this.state.error}
                    onRetry={this.handleRetry}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
