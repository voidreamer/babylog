/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { api } from '../api/client';
import {
    isOnline,
    setNetworkOnline,
    cacheBabies, getCachedBabies,
    cacheFeedings, getCachedFeedings,
    cacheSleeps, getCachedSleeps,
    cacheDiapers, getCachedDiapers,
    cachePumpings, getCachedPumpings,
    queueForSync,
    getPendingSyncActions,
    removeSyncAction,
    updateSyncActionRetry,
    getPendingSyncCount,
    setMetadata,
    clearAllOfflineData,
    cleanupCache
} from '../utils/offlineStorage';

const isDev = import.meta.env.DEV;
const log = (...args: unknown[]) => isDev && console.log(...args);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function getBackoffDelay(retryCount: number): number {
    return Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), 30000);
}

function shouldRetryAction(action: any): boolean {
    if ((action.retry_count || 0) >= MAX_RETRIES) return false;
    if (action.last_retry) {
        const timeSinceLastRetry = Date.now() - new Date(action.last_retry).getTime();
        const requiredDelay = getBackoffDelay(action.retry_count || 0);
        if (timeSinceLastRetry < requiredDelay) return false;
    }
    return true;
}

interface UseOfflineSyncReturn {
    online: boolean;
    syncing: boolean;
    pendingCount: number;
    queueAction: (action: any) => Promise<void>;
    syncPendingChanges: () => Promise<void>;
    cacheData: (type: string, babyId: number | null, data: any) => Promise<void>;
    getCachedData: (type: string, babyId: number | null) => Promise<any>;
    clearOfflineData: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
    const [online, setOnline] = useState(isOnline());
    const [syncing, setSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const syncInProgress = useRef(false);

    const updatePendingCount = useCallback(async () => {
        try { const count = await getPendingSyncCount(); setPendingCount(count); }
        catch (e) { if (isDev) console.error('Failed to get pending count:', e); }
    }, []);

    const syncPendingChanges = useCallback(async () => {
        if (!isOnline() || syncInProgress.current) return;
        syncInProgress.current = true;
        setSyncing(true);

        try {
            const actions = await getPendingSyncActions();
            for (const action of actions) {
                if ((action.retry_count || 0) >= MAX_RETRIES) {
                    log('Action exceeded max retries, removing:', action);
                    await removeSyncAction(action.id);
                    continue;
                }
                if (!shouldRetryAction(action)) { log('Skipping action due to backoff:', action); continue; }

                try {
                    await executeAction(action);
                    await removeSyncAction(action.id);
                    log('Successfully synced action:', action.type);
                } catch (error: any) {
                    log('Failed to sync action:', action, error);
                    if (error.message?.includes('Unauthorized')) { await removeSyncAction(action.id); continue; }
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

    useEffect(() => {
        updatePendingCount();
        cleanupCache().catch(e => { if (isDev) console.error('Cache cleanup failed:', e); });

        if (Capacitor.isNativePlatform()) {
            // On iOS/Android, window online/offline events don't fire reliably in WKWebView.
            // Use @capacitor/network for accurate native connectivity status.
            let listenerHandle: { remove: () => void } | null = null;

            Network.getStatus().then(status => {
                setNetworkOnline(status.connected);
                setOnline(status.connected);
                if (status.connected) syncPendingChanges();
            }).catch(() => {});

            Network.addListener('networkStatusChange', status => {
                setNetworkOnline(status.connected);
                setOnline(status.connected);
                if (status.connected) syncPendingChanges();
            }).then(handle => {
                listenerHandle = handle;
            }).catch(() => {});

            return () => { listenerHandle?.remove(); };
        } else {
            // Web: window events are reliable
            const handleOnline = () => { setNetworkOnline(true); setOnline(true); syncPendingChanges(); };
            const handleOffline = () => { setNetworkOnline(false); setOnline(false); };

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, [syncPendingChanges, updatePendingCount]);

    const executeAction = async (action: any) => {
        const { type, endpoint, method, data } = action;
        switch (type) {
            case 'CREATE_FEEDING': await api.createFeeding(data); break;
            case 'CREATE_DIAPER': await api.createDiaper(data); break;
            case 'CREATE_SLEEP': await api.createSleep(data); break;
            case 'END_SLEEP': await api.endSleep(data.id); break;
            case 'CREATE_PUMPING': await api.createPumping(data); break;
            default:
                if (endpoint && method) {
                    await api.request(endpoint, { method, body: data ? JSON.stringify(data) : undefined });
                }
        }
    };

    const queueAction = useCallback(async (action: any) => {
        await queueForSync(action);
        await updatePendingCount();
    }, [updatePendingCount]);

    const cacheData = useCallback(async (type: string, babyId: number | null, data: any) => {
        try {
            switch (type) {
                case 'babies': await cacheBabies(data); break;
                case 'feedings': if (babyId) await cacheFeedings(babyId, data); break;
                case 'sleeps': if (babyId) await cacheSleeps(babyId, data); break;
                case 'diapers': if (babyId) await cacheDiapers(babyId, data); break;
                case 'pumpings': if (babyId) await cachePumpings(babyId, data); break;
            }
            await setMetadata(`lastSync_${type}_${babyId || 'all'}`, new Date().toISOString());
        } catch (e) {
            if (isDev) console.error('Failed to cache data:', e);
        }
    }, []);

    const getCachedData = useCallback(async (type: string, babyId: number | null): Promise<any> => {
        try {
            switch (type) {
                case 'babies': return await getCachedBabies();
                case 'feedings': return babyId ? await getCachedFeedings(babyId) : null;
                case 'sleeps': return babyId ? await getCachedSleeps(babyId) : null;
                case 'diapers': return babyId ? await getCachedDiapers(babyId) : null;
                case 'pumpings': return babyId ? await getCachedPumpings(babyId) : null;
                default: return null;
            }
        } catch (e) {
            if (isDev) console.error('Failed to get cached data:', e);
            return null;
        }
    }, []);

    const clearOfflineData = useCallback(async () => {
        await clearAllOfflineData();
        setPendingCount(0);
    }, []);

    return { online, syncing, pendingCount, queueAction, syncPendingChanges, cacheData, getCachedData, clearOfflineData };
}

export default useOfflineSync;
