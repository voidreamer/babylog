import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'heybub-offline';
const DB_VERSION = 3;

const CACHE_CONFIG = {
    MAX_ENTRIES_PER_BABY: 500,
    CACHE_TTL_DAYS: 30,
    MAX_PENDING_SYNC_ACTIONS: 100,
};

const STORES = {
    BABIES: 'babies',
    FEEDINGS: 'feedings',
    SLEEPS: 'sleeps',
    DIAPERS: 'diapers',
    PUMPINGS: 'pumpings',
    ACTIVITIES: 'activities',
    PENDING_SYNC: 'pending_sync',
    METADATA: 'metadata',
    DOCTOR_VISITS: 'doctor_visits',
    VACCINATIONS: 'vaccinations',
    MEDICATIONS: 'medications',
    GROWTH_RECORDS: 'growth_records',
    PHOTOS: 'photos'
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbPromise: Promise<IDBPDatabase<any>> | null = null;

async function getDB() {
    if (dbPromise) return dbPromise;

    dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORES.BABIES)) {
                db.createObjectStore(STORES.BABIES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.FEEDINGS)) {
                const store = db.createObjectStore(STORES.FEEDINGS, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
                store.createIndex('time', 'time');
            }
            if (!db.objectStoreNames.contains(STORES.SLEEPS)) {
                const store = db.createObjectStore(STORES.SLEEPS, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
                store.createIndex('start_time', 'start_time');
            }
            if (!db.objectStoreNames.contains(STORES.DIAPERS)) {
                const store = db.createObjectStore(STORES.DIAPERS, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
                store.createIndex('time', 'time');
            }
            if (!db.objectStoreNames.contains(STORES.PUMPINGS)) {
                const store = db.createObjectStore(STORES.PUMPINGS, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
                store.createIndex('time', 'time');
            }
            if (!db.objectStoreNames.contains(STORES.ACTIVITIES)) {
                const store = db.createObjectStore(STORES.ACTIVITIES, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
                store.createIndex('type', 'type');
            }
            if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
                const store = db.createObjectStore(STORES.PENDING_SYNC, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('created_at', 'created_at');
            }
            if (!db.objectStoreNames.contains(STORES.METADATA)) {
                db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(STORES.DOCTOR_VISITS)) {
                const store = db.createObjectStore(STORES.DOCTOR_VISITS, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
                store.createIndex('visit_date', 'visit_date');
            }
            if (!db.objectStoreNames.contains(STORES.VACCINATIONS)) {
                const store = db.createObjectStore(STORES.VACCINATIONS, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
                store.createIndex('given_date', 'given_date');
            }
            if (!db.objectStoreNames.contains(STORES.MEDICATIONS)) {
                const store = db.createObjectStore(STORES.MEDICATIONS, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
            }
            if (!db.objectStoreNames.contains(STORES.GROWTH_RECORDS)) {
                const store = db.createObjectStore(STORES.GROWTH_RECORDS, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
                store.createIndex('recorded_date', 'recorded_date');
            }
            if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
                const store = db.createObjectStore(STORES.PHOTOS, { keyPath: 'id', autoIncrement: true });
                store.createIndex('baby_id', 'baby_id');
            }
        }
    });

    return dbPromise;
}

export function isOnline(): boolean {
    return navigator.onLine;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheBabies(babies: any[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.BABIES, 'readwrite');
    const store = tx.objectStore(STORES.BABIES);
    await store.clear();
    for (const baby of babies) {
        await store.put(baby);
    }
    await tx.done;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedBabies(): Promise<any[]> {
    const db = await getDB();
    return db.getAll(STORES.BABIES);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheFeedings(babyId: number, feedings: any[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.FEEDINGS, 'readwrite');
    const store = tx.objectStore(STORES.FEEDINGS);
    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) { await store.delete(key); }
    for (const feeding of feedings) { await store.put({ ...feeding, baby_id: babyId }); }
    await tx.done;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedFeedings(babyId: number): Promise<any[]> {
    const db = await getDB();
    const index = db.transaction(STORES.FEEDINGS).objectStore(STORES.FEEDINGS).index('baby_id');
    return index.getAll(babyId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addCachedFeeding(feeding: any): Promise<void> {
    const db = await getDB();
    await db.put(STORES.FEEDINGS, feeding);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheSleeps(babyId: number, sleeps: any[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.SLEEPS, 'readwrite');
    const store = tx.objectStore(STORES.SLEEPS);
    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) { await store.delete(key); }
    for (const sleep of sleeps) { await store.put({ ...sleep, baby_id: babyId }); }
    await tx.done;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedSleeps(babyId: number): Promise<any[]> {
    const db = await getDB();
    const index = db.transaction(STORES.SLEEPS).objectStore(STORES.SLEEPS).index('baby_id');
    return index.getAll(babyId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addCachedSleep(sleep: any): Promise<void> {
    const db = await getDB();
    await db.put(STORES.SLEEPS, sleep);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheDiapers(babyId: number, diapers: any[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.DIAPERS, 'readwrite');
    const store = tx.objectStore(STORES.DIAPERS);
    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) { await store.delete(key); }
    for (const diaper of diapers) { await store.put({ ...diaper, baby_id: babyId }); }
    await tx.done;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedDiapers(babyId: number): Promise<any[]> {
    const db = await getDB();
    const index = db.transaction(STORES.DIAPERS).objectStore(STORES.DIAPERS).index('baby_id');
    return index.getAll(babyId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addCachedDiaper(diaper: any): Promise<void> {
    const db = await getDB();
    await db.put(STORES.DIAPERS, diaper);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cachePumpings(babyId: number, pumpings: any[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.PUMPINGS, 'readwrite');
    const store = tx.objectStore(STORES.PUMPINGS);
    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) { await store.delete(key); }
    for (const pumping of pumpings) { await store.put({ ...pumping, baby_id: babyId }); }
    await tx.done;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedPumpings(babyId: number): Promise<any[]> {
    const db = await getDB();
    const index = db.transaction(STORES.PUMPINGS).objectStore(STORES.PUMPINGS).index('baby_id');
    return index.getAll(babyId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addCachedPumping(pumping: any): Promise<void> {
    const db = await getDB();
    await db.put(STORES.PUMPINGS, pumping);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheActivities(babyId: number, activityType: string, activities: any[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.ACTIVITIES, 'readwrite');
    const store = tx.objectStore(STORES.ACTIVITIES);
    const allActivities = await store.getAll();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const activity of allActivities) {
        if ((activity as any).baby_id === babyId && (activity as any).activity_type === activityType) {
            await store.delete((activity as any).id);
        }
    }
    for (const activity of activities) {
        await store.put({ ...activity, baby_id: babyId, activity_type: activityType });
    }
    await tx.done;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedActivities(babyId: number, activityType: string): Promise<any[]> {
    const db = await getDB();
    const allActivities = await db.getAll(STORES.ACTIVITIES);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return allActivities.filter((a: any) => a.baby_id === babyId && a.activity_type === activityType);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addCachedActivity(activity: any, activityType: string): Promise<void> {
    const db = await getDB();
    await db.put(STORES.ACTIVITIES, { ...activity, activity_type: activityType });
}

// Health Records Caching

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheDoctorVisits(babyId: number, visits: any[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.DOCTOR_VISITS, 'readwrite');
    const store = tx.objectStore(STORES.DOCTOR_VISITS);
    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) { await store.delete(key); }
    for (const visit of visits) { await store.put({ ...visit, baby_id: babyId }); }
    await tx.done;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedDoctorVisits(babyId: number): Promise<any[]> {
    const db = await getDB();
    const index = db.transaction(STORES.DOCTOR_VISITS).objectStore(STORES.DOCTOR_VISITS).index('baby_id');
    return index.getAll(babyId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheVaccinations(babyId: number, vaccinations: any[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.VACCINATIONS, 'readwrite');
    const store = tx.objectStore(STORES.VACCINATIONS);
    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) { await store.delete(key); }
    for (const vaccination of vaccinations) { await store.put({ ...vaccination, baby_id: babyId }); }
    await tx.done;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedVaccinations(babyId: number): Promise<any[]> {
    const db = await getDB();
    const index = db.transaction(STORES.VACCINATIONS).objectStore(STORES.VACCINATIONS).index('baby_id');
    return index.getAll(babyId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheMedications(babyId: number, medications: any[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.MEDICATIONS, 'readwrite');
    const store = tx.objectStore(STORES.MEDICATIONS);
    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) { await store.delete(key); }
    for (const medication of medications) { await store.put({ ...medication, baby_id: babyId }); }
    await tx.done;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedMedications(babyId: number): Promise<any[]> {
    const db = await getDB();
    const index = db.transaction(STORES.MEDICATIONS).objectStore(STORES.MEDICATIONS).index('baby_id');
    return index.getAll(babyId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheGrowthRecords(babyId: number, records: any[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.GROWTH_RECORDS, 'readwrite');
    const store = tx.objectStore(STORES.GROWTH_RECORDS);
    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) { await store.delete(key); }
    for (const record of records) { await store.put({ ...record, baby_id: babyId }); }
    await tx.done;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedGrowthRecords(babyId: number): Promise<any[]> {
    const db = await getDB();
    const index = db.transaction(STORES.GROWTH_RECORDS).objectStore(STORES.GROWTH_RECORDS).index('baby_id');
    return index.getAll(babyId);
}

// Sync

export interface SyncActionData {
    type: string;
    endpoint?: string;
    method?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
}

export async function queueForSync(action: SyncActionData): Promise<void> {
    const db = await getDB();
    await db.add(STORES.PENDING_SYNC, {
        ...action,
        created_at: new Date().toISOString(),
        retry_count: 0,
        last_retry: null
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPendingSyncActions(): Promise<any[]> {
    const db = await getDB();
    return db.getAll(STORES.PENDING_SYNC);
}

export async function removeSyncAction(id: number): Promise<void> {
    const db = await getDB();
    await db.delete(STORES.PENDING_SYNC, id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateSyncActionRetry(id: number): Promise<any> {
    const db = await getDB();
    const action = await db.get(STORES.PENDING_SYNC, id);
    if (action) {
        action.retry_count = (action.retry_count || 0) + 1;
        action.last_retry = new Date().toISOString();
        await db.put(STORES.PENDING_SYNC, action);
    }
    return action;
}

export async function clearPendingSyncActions(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.PENDING_SYNC, 'readwrite');
    await tx.objectStore(STORES.PENDING_SYNC).clear();
    await tx.done;
}

export async function getPendingSyncCount(): Promise<number> {
    const db = await getDB();
    return db.count(STORES.PENDING_SYNC);
}

export async function setMetadata(key: string, value: string): Promise<void> {
    const db = await getDB();
    await db.put(STORES.METADATA, { key, value, updated_at: new Date().toISOString() });
}

export async function getMetadata(key: string): Promise<string | undefined> {
    const db = await getDB();
    const result = await db.get(STORES.METADATA, key);
    return result?.value;
}

export async function clearAllOfflineData(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(
        [STORES.BABIES, STORES.FEEDINGS, STORES.SLEEPS, STORES.DIAPERS,
         STORES.PUMPINGS, STORES.ACTIVITIES, STORES.PENDING_SYNC, STORES.METADATA,
         STORES.DOCTOR_VISITS, STORES.VACCINATIONS, STORES.MEDICATIONS,
         STORES.GROWTH_RECORDS, STORES.PHOTOS],
        'readwrite'
    );

    await Promise.all([
        tx.objectStore(STORES.BABIES).clear(),
        tx.objectStore(STORES.FEEDINGS).clear(),
        tx.objectStore(STORES.SLEEPS).clear(),
        tx.objectStore(STORES.DIAPERS).clear(),
        tx.objectStore(STORES.PUMPINGS).clear(),
        tx.objectStore(STORES.ACTIVITIES).clear(),
        tx.objectStore(STORES.PENDING_SYNC).clear(),
        tx.objectStore(STORES.METADATA).clear(),
        tx.objectStore(STORES.DOCTOR_VISITS).clear(),
        tx.objectStore(STORES.VACCINATIONS).clear(),
        tx.objectStore(STORES.MEDICATIONS).clear(),
        tx.objectStore(STORES.GROWTH_RECORDS).clear(),
        tx.objectStore(STORES.PHOTOS).clear(),
    ]);

    await tx.done;
}

export async function cleanupCache(): Promise<void> {
    const db = await getDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CACHE_CONFIG.CACHE_TTL_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    const pendingActions = await db.getAll(STORES.PENDING_SYNC);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldActions = pendingActions.filter((a: any) => a.created_at < cutoffISO);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const action of oldActions) { await db.delete(STORES.PENDING_SYNC, (action as any).id); }

    if (pendingActions.length > CACHE_CONFIG.MAX_PENDING_SYNC_ACTIONS) {
        const sortedActions = pendingActions.sort((a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const toRemove = sortedActions.slice(0, pendingActions.length - CACHE_CONFIG.MAX_PENDING_SYNC_ACTIONS);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const action of toRemove) { await db.delete(STORES.PENDING_SYNC, (action as any).id); }
    }

    const metadata = await db.getAll(STORES.METADATA);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const entry of metadata) {
        if ((entry as any).updated_at && (entry as any).updated_at < cutoffISO) {
            await db.delete(STORES.METADATA, (entry as any).key);
        }
    }
}

export async function getCacheStats(): Promise<Record<string, number>> {
    const db = await getDB();
    return {
        babies: await db.count(STORES.BABIES),
        feedings: await db.count(STORES.FEEDINGS),
        sleeps: await db.count(STORES.SLEEPS),
        diapers: await db.count(STORES.DIAPERS),
        pumpings: await db.count(STORES.PUMPINGS),
        activities: await db.count(STORES.ACTIVITIES),
        pendingSync: await db.count(STORES.PENDING_SYNC),
        doctorVisits: await db.count(STORES.DOCTOR_VISITS),
        vaccinations: await db.count(STORES.VACCINATIONS),
        medications: await db.count(STORES.MEDICATIONS),
        growthRecords: await db.count(STORES.GROWTH_RECORDS),
        photos: await db.count(STORES.PHOTOS),
    };
}

export default {
    isOnline,
    cacheBabies, getCachedBabies,
    cacheFeedings, getCachedFeedings, addCachedFeeding,
    cacheSleeps, getCachedSleeps, addCachedSleep,
    cacheDiapers, getCachedDiapers, addCachedDiaper,
    cachePumpings, getCachedPumpings, addCachedPumping,
    cacheActivities, getCachedActivities, addCachedActivity,
    cacheDoctorVisits, getCachedDoctorVisits,
    cacheVaccinations, getCachedVaccinations,
    cacheMedications, getCachedMedications,
    cacheGrowthRecords, getCachedGrowthRecords,
    queueForSync, getPendingSyncActions, removeSyncAction, updateSyncActionRetry,
    clearPendingSyncActions, getPendingSyncCount,
    setMetadata, getMetadata,
    clearAllOfflineData, cleanupCache, getCacheStats
};
