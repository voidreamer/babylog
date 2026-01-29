/* eslint-disable @typescript-eslint/no-explicit-any */
import { Loader2 } from 'lucide-react';

/**
 * Standardized loading spinner component
 * @param {string} text - Optional loading text to display
 * @param {boolean} fullPage - Whether to show as full page loading
 * @param {string} size - Size: 'sm', 'md', 'lg'
 */
interface LoadingSpinnerProps { text?: string; fullPage?: boolean; size?: 'sm' | 'md' | 'lg'; }
export default function LoadingSpinner({ text, fullPage = true, size = 'md' }: LoadingSpinnerProps) {
    const sizeMap = {
        sm: 16,
        md: 24,
        lg: 32,
    };

    const content = (
        <>
            <div className="spinner"></div>
            {text && (
                <p style={{
                    marginTop: 'var(--space-md)',
                    color: 'var(--text-muted)',
                    fontSize: size === 'sm' ? '0.85rem' : '1rem'
                }}>
                    {text}
                </p>
            )}
        </>
    );

    if (fullPage) {
        return (
            <div className="loading">
                {content}
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-xl)'
        }}>
            {content}
        </div>
    );
}
