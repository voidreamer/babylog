/**
 * Offline status indicator component.
 *
 * Shows a banner when offline and pending sync count.
 */

import { WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';

export function OfflineIndicator({ online, syncing, pendingCount, onSync }) {
    // Don't show anything if online and no pending changes
    if (online && pendingCount === 0 && !syncing) {
        return null;
    }

    return (
        <div
            className="offline-indicator"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                padding: 'var(--space-xs) var(--space-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-sm)',
                fontSize: '0.85rem',
                fontWeight: 500,
                background: online ? 'var(--success)' : 'var(--text-muted)',
                color: '#fff',
                transition: 'all 0.3s ease'
            }}
        >
            {!online ? (
                <>
                    <WifiOff size={16} />
                    <span>You're offline</span>
                    {pendingCount > 0 && (
                        <span style={{ opacity: 0.8 }}>
                            • {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending
                        </span>
                    )}
                </>
            ) : syncing ? (
                <>
                    <RefreshCw size={16} className="spin" />
                    <span>Syncing changes...</span>
                </>
            ) : pendingCount > 0 ? (
                <>
                    <Cloud size={16} />
                    <span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} to sync</span>
                    <button
                        onClick={onSync}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '2px 8px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                        }}
                    >
                        Sync now
                    </button>
                </>
            ) : null}
        </div>
    );
}

export default OfflineIndicator;
