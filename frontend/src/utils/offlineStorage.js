/**
 * IndexedDB storage for offline support.
 *
 * Stores baby data locally for offline access and queues
 * changes to sync when back online.
 */

import { openDB } from 'idb';

const DB_NAME = 'simplebaby-offline';
const DB_VERSION = 2; // Bumped for health records

// Store names
const STORES = {
    BABIES: 'babies',
    FEEDINGS: 'feedings',
    SLEEPS: 'sleeps',
    DIAPERS: 'diapers',
    PUMPINGS: 'pumpings',
    ACTIVITIES: 'activities',
    PENDING_SYNC: 'pending_sync',
    METADATA: 'metadata',
    // Health records
    DOCTOR_VISITS: 'doctor_visits',
    VACCINATIONS: 'vaccinations',
    MEDICATIONS: 'medications',
    MILESTONES: 'milestones',
    GROWTH_RECORDS: 'growth_records'
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
            // Health records stores (added in version 2)
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
            if (!db.objectStoreNames.contains(STORES.MILESTONES)) {
                const store = db.createObjectStore(STORES.MILESTONES, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
                store.createIndex('achieved_date', 'achieved_date');
            }
            if (!db.objectStoreNames.contains(STORES.GROWTH_RECORDS)) {
                const store = db.createObjectStore(STORES.GROWTH_RECORDS, { keyPath: 'id' });
                store.createIndex('baby_id', 'baby_id');
                store.createIndex('recorded_date', 'recorded_date');
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
 * Add a single feeding to the cache (for optimistic updates)
 */
export async function addCachedFeeding(feeding) {
    const db = await getDB();
    await db.put(STORES.FEEDINGS, feeding);
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
 * Add a single sleep to the cache (for optimistic updates)
 */
export async function addCachedSleep(sleep) {
    const db = await getDB();
    await db.put(STORES.SLEEPS, sleep);
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
 * Add a single diaper to the cache (for optimistic updates)
 */
export async function addCachedDiaper(diaper) {
    const db = await getDB();
    await db.put(STORES.DIAPERS, diaper);
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
 * Add a single pumping to the cache (for optimistic updates)
 */
export async function addCachedPumping(pumping) {
    const db = await getDB();
    await db.put(STORES.PUMPINGS, pumping);
}

/**
 * Cache activities for a baby (tummy time, bath, supplements)
 */
export async function cacheActivities(babyId, activityType, activities) {
    const db = await getDB();
    const tx = db.transaction(STORES.ACTIVITIES, 'readwrite');
    const store = tx.objectStore(STORES.ACTIVITIES);

    // Delete old activities of this type for this baby
    const allActivities = await store.getAll();
    for (const activity of allActivities) {
        if (activity.baby_id === babyId && activity.activity_type === activityType) {
            await store.delete(activity.id);
        }
    }

    // Add new activities
    for (const activity of activities) {
        await store.put({ ...activity, baby_id: babyId, activity_type: activityType });
    }

    await tx.done;
}

/**
 * Get cached activities for a baby by type
 */
export async function getCachedActivities(babyId, activityType) {
    const db = await getDB();
    const allActivities = await db.getAll(STORES.ACTIVITIES);
    return allActivities.filter(a => a.baby_id === babyId && a.activity_type === activityType);
}

/**
 * Add a single activity to the cache (for optimistic updates)
 */
export async function addCachedActivity(activity, activityType) {
    const db = await getDB();
    await db.put(STORES.ACTIVITIES, { ...activity, activity_type: activityType });
}

// ========== Health Records Caching ==========

/**
 * Cache doctor visits for a baby
 */
export async function cacheDoctorVisits(babyId, visits) {
    const db = await getDB();
    const tx = db.transaction(STORES.DOCTOR_VISITS, 'readwrite');
    const store = tx.objectStore(STORES.DOCTOR_VISITS);

    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) {
        await store.delete(key);
    }

    for (const visit of visits) {
        await store.put({ ...visit, baby_id: babyId });
    }

    await tx.done;
}

/**
 * Get cached doctor visits for a baby
 */
export async function getCachedDoctorVisits(babyId) {
    const db = await getDB();
    const index = db.transaction(STORES.DOCTOR_VISITS).objectStore(STORES.DOCTOR_VISITS).index('baby_id');
    return index.getAll(babyId);
}

/**
 * Cache vaccinations for a baby
 */
export async function cacheVaccinations(babyId, vaccinations) {
    const db = await getDB();
    const tx = db.transaction(STORES.VACCINATIONS, 'readwrite');
    const store = tx.objectStore(STORES.VACCINATIONS);

    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) {
        await store.delete(key);
    }

    for (const vaccination of vaccinations) {
        await store.put({ ...vaccination, baby_id: babyId });
    }

    await tx.done;
}

/**
 * Get cached vaccinations for a baby
 */
export async function getCachedVaccinations(babyId) {
    const db = await getDB();
    const index = db.transaction(STORES.VACCINATIONS).objectStore(STORES.VACCINATIONS).index('baby_id');
    return index.getAll(babyId);
}

/**
 * Cache medications for a baby
 */
export async function cacheMedications(babyId, medications) {
    const db = await getDB();
    const tx = db.transaction(STORES.MEDICATIONS, 'readwrite');
    const store = tx.objectStore(STORES.MEDICATIONS);

    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) {
        await store.delete(key);
    }

    for (const medication of medications) {
        await store.put({ ...medication, baby_id: babyId });
    }

    await tx.done;
}

/**
 * Get cached medications for a baby
 */
export async function getCachedMedications(babyId) {
    const db = await getDB();
    const index = db.transaction(STORES.MEDICATIONS).objectStore(STORES.MEDICATIONS).index('baby_id');
    return index.getAll(babyId);
}

/**
 * Cache milestones for a baby
 */
export async function cacheMilestones(babyId, milestones) {
    const db = await getDB();
    const tx = db.transaction(STORES.MILESTONES, 'readwrite');
    const store = tx.objectStore(STORES.MILESTONES);

    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) {
        await store.delete(key);
    }

    for (const milestone of milestones) {
        await store.put({ ...milestone, baby_id: babyId });
    }

    await tx.done;
}

/**
 * Get cached milestones for a baby
 */
export async function getCachedMilestones(babyId) {
    const db = await getDB();
    const index = db.transaction(STORES.MILESTONES).objectStore(STORES.MILESTONES).index('baby_id');
    return index.getAll(babyId);
}

/**
 * Cache growth records for a baby
 */
export async function cacheGrowthRecords(babyId, records) {
    const db = await getDB();
    const tx = db.transaction(STORES.GROWTH_RECORDS, 'readwrite');
    const store = tx.objectStore(STORES.GROWTH_RECORDS);

    const index = store.index('baby_id');
    const oldKeys = await index.getAllKeys(babyId);
    for (const key of oldKeys) {
        await store.delete(key);
    }

    for (const record of records) {
        await store.put({ ...record, baby_id: babyId });
    }

    await tx.done;
}

/**
 * Get cached growth records for a baby
 */
export async function getCachedGrowthRecords(babyId) {
    const db = await getDB();
    const index = db.transaction(STORES.GROWTH_RECORDS).objectStore(STORES.GROWTH_RECORDS).index('baby_id');
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
         STORES.PUMPINGS, STORES.ACTIVITIES, STORES.PENDING_SYNC, STORES.METADATA,
         STORES.DOCTOR_VISITS, STORES.VACCINATIONS, STORES.MEDICATIONS,
         STORES.MILESTONES, STORES.GROWTH_RECORDS],
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
        tx.objectStore(STORES.MILESTONES).clear(),
        tx.objectStore(STORES.GROWTH_RECORDS).clear(),
    ]);

    await tx.done;
}

export default {
    isOnline,
    cacheBabies,
    getCachedBabies,
    cacheFeedings,
    getCachedFeedings,
    addCachedFeeding,
    cacheSleeps,
    getCachedSleeps,
    addCachedSleep,
    cacheDiapers,
    getCachedDiapers,
    addCachedDiaper,
    cachePumpings,
    getCachedPumpings,
    addCachedPumping,
    cacheActivities,
    getCachedActivities,
    addCachedActivity,
    // Health records
    cacheDoctorVisits,
    getCachedDoctorVisits,
    cacheVaccinations,
    getCachedVaccinations,
    cacheMedications,
    getCachedMedications,
    cacheMilestones,
    getCachedMilestones,
    cacheGrowthRecords,
    getCachedGrowthRecords,
    // Sync
    queueForSync,
    getPendingSyncActions,
    removeSyncAction,
    clearPendingSyncActions,
    getPendingSyncCount,
    setMetadata,
    getMetadata,
    clearAllOfflineData
};
