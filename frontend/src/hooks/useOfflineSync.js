/**
 * Offline sync hook.
 *
 * Manages online/offline state, caches data for offline use,
 * and syncs pending changes when back online.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import {
    isOnline,
    cacheBabies,
    getCachedBabies,
    cacheFeedings,
    getCachedFeedings,
    cacheSleeps,
    getCachedSleeps,
    cacheDiapers,
    getCachedDiapers,
    cachePumpings,
    getCachedPumpings,
    queueForSync,
    getPendingSyncActions,
    removeSyncAction,
    updateSyncActionRetry,
    getPendingSyncCount,
    setMetadata,
    getMetadata,
    clearAllOfflineData,
    cleanupCache
} from '../utils/offlineStorage';

// Only log in development
const isDev = import.meta.env.DEV;
const log = (...args) => isDev && console.log(...args);

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second

/**
 * Calculate exponential backoff delay
 * @param {number} retryCount - Current retry count
 * @returns {number} Delay in milliseconds
 */
function getBackoffDelay(retryCount) {
    return Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), 30000); // Max 30 seconds
}

/**
 * Check if action should be retried based on retry count and time
 * @param {object} action - The sync action
 * @returns {boolean} Whether to retry
 */
function shouldRetryAction(action) {
    if ((action.retry_count || 0) >= MAX_RETRIES) {
        return false;
    }

    // Check if enough time has passed since last retry (exponential backoff)
    if (action.last_retry) {
        const timeSinceLastRetry = Date.now() - new Date(action.last_retry).getTime();
        const requiredDelay = getBackoffDelay(action.retry_count || 0);
        if (timeSinceLastRetry < requiredDelay) {
            return false;
        }
    }

    return true;
}

export function useOfflineSync() {
    const [online, setOnline] = useState(isOnline());
    const [syncing, setSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const syncInProgress = useRef(false);

    // Update online status
    useEffect(() => {
        const handleOnline = () => {
            setOnline(true);
            // Trigger sync when coming back online
            syncPendingChanges();
        };

        const handleOffline = () => {
            setOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check pending count on mount
        updatePendingCount();

        // Run cache cleanup on mount (non-blocking)
        cleanupCache().catch(e => {
            if (isDev) console.error('Cache cleanup failed:', e);
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Update pending count
    const updatePendingCount = useCallback(async () => {
        try {
            const count = await getPendingSyncCount();
            setPendingCount(count);
        } catch (e) {
            if (isDev) console.error('Failed to get pending count:', e);
        }
    }, []);

    // Sync pending changes with retry limits and exponential backoff
    const syncPendingChanges = useCallback(async () => {
        if (!isOnline() || syncInProgress.current) return;

        syncInProgress.current = true;
        setSyncing(true);

        try {
            const actions = await getPendingSyncActions();

            for (const action of actions) {
                // Check if action has exceeded max retries
                if ((action.retry_count || 0) >= MAX_RETRIES) {
                    log('Action exceeded max retries, removing:', action);
                    await removeSyncAction(action.id);
                    continue;
                }

                // Check if we should retry based on backoff timing
                if (!shouldRetryAction(action)) {
                    log('Skipping action due to backoff:', action);
                    continue;
                }

                try {
                    await executeAction(action);
                    await removeSyncAction(action.id);
                    log('Successfully synced action:', action.type);
                } catch (error) {
                    log('Failed to sync action:', action, error);

                    // Remove on auth errors (401)
                    if (error.message?.includes('Unauthorized')) {
                        await removeSyncAction(action.id);
                        continue;
                    }

                    // Update retry count for other errors
                    await updateSyncActionRetry(action.id);
                }
            }

            await updatePendingCount();
        } catch (error) {
            log('Sync failed:', error);
        } finally {
            syncInProgress.current = false;
            setSyncing(false);
        }
    }, [updatePendingCount]);

    // Execute a sync action against the API
    const executeAction = async (action) => {
        const { type, endpoint, method, data } = action;

        switch (type) {
            case 'CREATE_FEEDING':
                await api.createFeeding(data);
                break;
            case 'CREATE_DIAPER':
                await api.createDiaper(data);
                break;
            case 'CREATE_SLEEP':
                await api.createSleep(data);
                break;
            case 'END_SLEEP':
                await api.endSleep(data.id);
                break;
            case 'CREATE_PUMPING':
                await api.createPumping(data);
                break;
            default:
                // Generic API call
                if (endpoint && method) {
                    await api.request(endpoint, {
                        method,
                        body: data ? JSON.stringify(data) : undefined
                    });
                }
        }
    };

    // Queue an action for offline sync
    const queueAction = useCallback(async (action) => {
        await queueForSync(action);
        await updatePendingCount();
    }, [updatePendingCount]);

    // Cache data when fetched
    const cacheData = useCallback(async (type, babyId, data) => {
        try {
            switch (type) {
                case 'babies':
                    await cacheBabies(data);
                    break;
                case 'feedings':
                    await cacheFeedings(babyId, data);
                    break;
                case 'sleeps':
                    await cacheSleeps(babyId, data);
                    break;
                case 'diapers':
                    await cacheDiapers(babyId, data);
                    break;
                case 'pumpings':
                    await cachePumpings(babyId, data);
                    break;
            }
            await setMetadata(`lastSync_${type}_${babyId || 'all'}`, new Date().toISOString());
        } catch (e) {
            if (isDev) console.error('Failed to cache data:', e);
        }
    }, []);

    // Get cached data when offline
    const getCachedData = useCallback(async (type, babyId) => {
        try {
            switch (type) {
                case 'babies':
                    return await getCachedBabies();
                case 'feedings':
                    return await getCachedFeedings(babyId);
                case 'sleeps':
                    return await getCachedSleeps(babyId);
                case 'diapers':
                    return await getCachedDiapers(babyId);
                case 'pumpings':
                    return await getCachedPumpings(babyId);
                default:
                    return null;
            }
        } catch (e) {
            if (isDev) console.error('Failed to get cached data:', e);
            return null;
        }
    }, []);

    // Clear offline data (for logout)
    const clearOfflineData = useCallback(async () => {
        await clearAllOfflineData();
        setPendingCount(0);
    }, []);

    return {
        online,
        syncing,
        pendingCount,
        queueAction,
        syncPendingChanges,
        cacheData,
        getCachedData,
        clearOfflineData
    };
}

export default useOfflineSync;
