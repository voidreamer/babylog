/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { captureException } from '../utils/analytics';

type ErrorLevel = 'app' | 'page' | 'widget';

/**
 * Error Fallback UI shown when an error is caught.
 * defaultValue keeps the fallback usable even if i18n itself failed to load.
 */
interface ErrorFallbackProps { error: Error | null; level: ErrorLevel; onRetry: () => void; }
function ErrorFallback({ error, level, onRetry }: ErrorFallbackProps) {
    const { t } = useTranslation('common');

    if (level === 'widget') {
        return (
            <div className="error-fallback-widget">
                <h3 className="error-fallback-title">{t('errorBoundaryWidgetTitle', { defaultValue: 'Widget unavailable' })}</h3>
                <button className="btn btn-ghost btn-sm" onClick={onRetry}>
                    <RefreshCw size={14} />
                    <span>{t('retry', { defaultValue: 'Retry' })}</span>
                </button>
            </div>
        );
    }

    if (level === 'page') {
        return (
            <div className="error-fallback-compact">
                <div className="error-fallback-icon">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="error-fallback-title">{t('errorBoundaryPageTitle', { defaultValue: 'This page ran into a problem' })}</h2>
                <p className="error-fallback-message">
                    {t('errorBoundaryPageMessage', { defaultValue: 'Try again or switch to a different tab.' })}
                </p>
                {error?.message && import.meta.env.DEV && (
                    <pre className="error-fallback-details">
                        {error.message}
                    </pre>
                )}
                <button
                    className="btn btn-primary btn-sm"
                    onClick={onRetry}
                >
                    <RefreshCw size={16} />
                    <span>{t('tryAgain', { defaultValue: 'Try Again' })}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="error-fallback">
            <div className="error-fallback-content">
                <div className="error-fallback-icon">
                    <AlertTriangle size={48} />
                </div>
                <h2 className="error-fallback-title">{t('errorBoundaryTitle', { defaultValue: 'Something went wrong' })}</h2>
                <p className="error-fallback-message">
                    {t('errorBoundaryMessage', { defaultValue: "We're sorry, but something unexpected happened. Please try again." })}
                </p>
                {error?.message && import.meta.env.DEV && (
                    <pre className="error-fallback-details">
                        {error.message}
                    </pre>
                )}
                <button
                    className="btn btn-primary btn-lg"
                    onClick={onRetry}
                >
                    <RefreshCw size={18} />
                    <span>{t('tryAgain', { defaultValue: 'Try Again' })}</span>
                </button>
            </div>
        </div>
    );
}

/**
 * Error Boundary class component to catch JavaScript errors anywhere in the child component tree
 */
interface ErrorBoundaryProps { children: React.ReactNode; level?: ErrorLevel; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        captureException(error, { componentStack: errorInfo.componentStack ?? undefined, level: this.props.level });
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
    }

    handleRetry = () => {
        const level = this.props.level || 'app';
        this.setState({ hasError: false, error: null });
        // Only reload for app-level errors; page/widget just clear the error state
        if (level === 'app') {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <ErrorFallback
                    error={this.state.error}
                    level={this.props.level || 'app'}
                    onRetry={this.handleRetry}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
