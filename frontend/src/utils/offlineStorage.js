/**
 * IndexedDB storage for offline support.
 *
 * Stores baby data locally for offline access and queues
 * changes to sync when back online.
 */

import { openDB } from 'idb';

const DB_NAME = 'simplebaby-offline';
const DB_VERSION = 1;

// Store names
const STORES = {
    BABIES: 'babies',
    FEEDINGS: 'feedings',
    SLEEPS: 'sleeps',
    DIAPERS: 'diapers',
    PUMPINGS: 'pumpings',
    ACTIVITIES: 'activities',
    PENDING_SYNC: 'pending_sync',
    METADATA: 'metadata'
};

let dbPromise = null;

/**
 * Initialize the database
 */
async function getDB() {
    if (dbPromise) return dbPromise;

    dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            // Create object stores if they don't exist
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
        }
    });

    return dbPromise;
}

/**
 * Check if we're online
 */
export function isOnline() {
    return navigator.onLine;
}

/**
 * Store babies data locally
 */
export async function cacheBabies(babies) {
    const db = await getDB();
    const tx = db.transaction(STORES.BABIES, 'readwrite');
    const store = tx.objectStore(STORES.BABIES);

    // Clear old data and add new
    await store.clear();
    for (const baby of babies) {
        await store.put(baby);
    }

    await tx.done;
}

/**
 * Get cached babies
 */
export async function getCachedBabies() {
    const db = await getDB();
    return db.getAll(STORES.BABIES);
}

/**
 * Cache feedings for a baby
 */
export async function cacheFeedings(babyId, feedings) {
    const db = await getDB();
    const tx = db.transaction(STORES.FEEDINGS, 'readwrite');
    const store = tx.objectStore(STORES.FEEDINGS);

    // Delete old feedings for this baby
    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) {
        await store.delete(key);
    }

    // Add new feedings
    for (const feeding of feedings) {
        await store.put({ ...feeding, baby_id: babyId });
    }

    await tx.done;
}

/**
 * Get cached feedings for a baby
 */
export async function getCachedFeedings(babyId) {
    const db = await getDB();
    const index = db.transaction(STORES.FEEDINGS).objectStore(STORES.FEEDINGS).index('baby_id');
    return index.getAll(babyId);
}

/**
 * Cache sleeps for a baby
 */
export async function cacheSleeps(babyId, sleeps) {
    const db = await getDB();
    const tx = db.transaction(STORES.SLEEPS, 'readwrite');
    const store = tx.objectStore(STORES.SLEEPS);

    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) {
        await store.delete(key);
    }

    for (const sleep of sleeps) {
        await store.put({ ...sleep, baby_id: babyId });
    }

    await tx.done;
}

/**
 * Get cached sleeps for a baby
 */
export async function getCachedSleeps(babyId) {
    const db = await getDB();
    const index = db.transaction(STORES.SLEEPS).objectStore(STORES.SLEEPS).index('baby_id');
    return index.getAll(babyId);
}

/**
 * Cache diapers for a baby
 */
export async function cacheDiapers(babyId, diapers) {
    const db = await getDB();
    const tx = db.transaction(STORES.DIAPERS, 'readwrite');
    const store = tx.objectStore(STORES.DIAPERS);

    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) {
        await store.delete(key);
    }

    for (const diaper of diapers) {
        await store.put({ ...diaper, baby_id: babyId });
    }

    await tx.done;
}

/**
 * Get cached diapers for a baby
 */
export async function getCachedDiapers(babyId) {
    const db = await getDB();
    const index = db.transaction(STORES.DIAPERS).objectStore(STORES.DIAPERS).index('baby_id');
    return index.getAll(babyId);
}

/**
 * Cache pumpings for a baby
 */
export async function cachePumpings(babyId, pumpings) {
    const db = await getDB();
    const tx = db.transaction(STORES.PUMPINGS, 'readwrite');
    const store = tx.objectStore(STORES.PUMPINGS);

    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) {
        await store.delete(key);
    }

    for (const pumping of pumpings) {
        await store.put({ ...pumping, baby_id: babyId });
    }

    await tx.done;
}

/**
 * Get cached pumpings for a baby
 */
export async function getCachedPumpings(babyId) {
    const db = await getDB();
    const index = db.transaction(STORES.PUMPINGS).objectStore(STORES.PUMPINGS).index('baby_id');
    return index.getAll(babyId);
}

/**
 * Queue an action to sync when online
 */
export async function queueForSync(action) {
    const db = await getDB();
    await db.add(STORES.PENDING_SYNC, {
        ...action,
        created_at: new Date().toISOString()
    });
}

/**
 * Get pending sync actions
 */
export async function getPendingSyncActions() {
    const db = await getDB();
    return db.getAll(STORES.PENDING_SYNC);
}

/**
 * Remove a sync action after successful sync
 */
export async function removeSyncAction(id) {
    const db = await getDB();
    await db.delete(STORES.PENDING_SYNC, id);
}

/**
 * Clear all pending sync actions
 */
export async function clearPendingSyncActions() {
    const db = await getDB();
    const tx = db.transaction(STORES.PENDING_SYNC, 'readwrite');
    await tx.objectStore(STORES.PENDING_SYNC).clear();
    await tx.done;
}

/**
 * Get count of pending sync actions
 */
export async function getPendingSyncCount() {
    const db = await getDB();
    return db.count(STORES.PENDING_SYNC);
}

/**
 * Store metadata (like last sync time)
 */
export async function setMetadata(key, value) {
    const db = await getDB();
    await db.put(STORES.METADATA, { key, value, updated_at: new Date().toISOString() });
}

/**
 * Get metadata
 */
export async function getMetadata(key) {
    const db = await getDB();
    const result = await db.get(STORES.METADATA, key);
    return result?.value;
}

/**
 * Clear all offline data (for logout)
 */
export async function clearAllOfflineData() {
    const db = await getDB();
    const tx = db.transaction(
        [STORES.BABIES, STORES.FEEDINGS, STORES.SLEEPS, STORES.DIAPERS,
         STORES.PUMPINGS, STORES.ACTIVITIES, STORES.PENDING_SYNC, STORES.METADATA],
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
    ]);

    await tx.done;
}

export default {
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
    clearPendingSyncActions,
    getPendingSyncCount,
    setMetadata,
    getMetadata,
    clearAllOfflineData
};
