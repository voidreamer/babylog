/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Offline status indicator component.
 *
 * Shows a banner when offline and pending sync count.
 */

import { WifiOff, RefreshCw, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OfflineIndicatorProps { online: boolean; syncing: boolean; pendingCount: number; onSync: () => void; }
export function OfflineIndicator({ online, syncing, pendingCount, onSync }: OfflineIndicatorProps) {
    const { t } = useTranslation('common');
    // Don't show anything if online and no pending changes
    if (online && pendingCount === 0 && !syncing) {
        return null;
    }

    return (
        <div
            className={`offline-indicator offline-indicator-bar ${online ? 'online' : 'offline'}`}
        >
            {!online ? (
                <>
                    <WifiOff size={16} />
                    <span>{t('offlineIndicator.youreOffline')}</span>
                    {pendingCount > 0 && (
                        <span className="offline-pending-text">
                            • {t('offlineIndicator.changesPending', { count: pendingCount, s: pendingCount !== 1 ? 's' : '' })}
                        </span>
                    )}
                </>
            ) : syncing ? (
                <>
                    <RefreshCw size={16} className="spin" />
                    <span>{t('offlineIndicator.syncingChanges')}</span>
                </>
            ) : pendingCount > 0 ? (
                <>
                    <Cloud size={16} />
                    <span>{t('offlineIndicator.changesToSync', { count: pendingCount, s: pendingCount !== 1 ? 's' : '' })}</span>
                    <button
                        onClick={onSync}
                        className="offline-sync-btn"
                    >
                        {t('offlineIndicator.syncNow')}
                    </button>
                </>
            ) : null}
        </div>
    );
}

export default OfflineIndicator;
