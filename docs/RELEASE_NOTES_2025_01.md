# Release Notes - January 2025

## Overview

This release adds several production-ready features including database migrations, data export, admin endpoints, and full offline support with PWA capabilities.

---

## Features Added

### 1. Alembic Database Migrations

**Purpose:** Replace manual SQL migration files with automated, version-controlled migrations.

**Files Added:**
- `backend/alembic.ini` - Alembic configuration
- `backend/alembic/env.py` - Environment configuration connecting to SQLAlchemy models
- `backend/alembic/script.py.mako` - Template for new migrations
- `backend/alembic/versions/0001_baseline_from_existing_schema.py` - Baseline migration
- `backend/alembic/README.md` - Quick reference guide

**Usage:**
```bash
# Check current migration status
alembic current

# Apply pending migrations
alembic upgrade head

# Create new migration from model changes
alembic revision --autogenerate -m "description"

# For existing databases, mark baseline as applied
alembic stamp 0001
```

---

### 2. Admin Endpoints

**Purpose:** Secure endpoints for database migrations and admin operations.

**Files Added:**
- `backend/app/routers/admin.py`

**Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/migrate` | POST | Run pending database migrations |
| `/admin/migration-status` | GET | Check current migration revision |

**Security:**
- Requires `X-Admin-Key` header matching `ADMIN_API_KEY` environment variable
- In production/staging, fails if `ADMIN_API_KEY` is not configured
- In development, allows access without key

**Example:**
```bash
curl -X POST https://api.example.com/api/admin/migrate \
     -H "X-Admin-Key: your-secret-key"
```

---

### 3. Data Export

**Purpose:** Allow users to export their baby's tracking data for backup or portability.

**Files Added:**
- `backend/app/routers/export.py`

**Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/export/csv/{baby_id}` | GET | Download CSV file with all data |
| `/export/json/{baby_id}` | GET | Get JSON export for data portability |

**Query Parameters:**
- `data_type` - Filter by type: `all`, `feedings`, `sleeps`, `diapers`, `pumpings`, `activities`
- `start_date` - Start date filter (YYYY-MM-DD)
- `end_date` - End date filter (YYYY-MM-DD)

**Frontend:**
- Added "Data" section to Settings page
- "Download CSV" button exports all baby data

**Files Modified:**
- `frontend/src/App.jsx` - Added export UI and handler
- `frontend/src/api/client.js` - Added export API methods

---

### 4. Offline Support (PWA)

**Purpose:** Enable the app to work offline and sync changes when back online.

#### 4a. Service Worker (via vite-plugin-pwa)

**Files Modified:**
- `frontend/vite.config.js` - Added PWA plugin configuration
- `frontend/package.json` - Added `vite-plugin-pwa` and `idb` dependencies

**Caching Strategies:**
| Resource | Strategy | Cache Duration |
|----------|----------|----------------|
| App shell (JS, CSS, HTML) | Precache | Until new version |
| Google Fonts | CacheFirst | 1 year |
| API responses | NetworkFirst | 24 hours (fallback) |

**PWA Manifest:**
- App name: "SimpleBaby - Baby Tracker"
- Theme color: #6366f1
- Display: Standalone
- Installable on mobile devices

#### 4b. IndexedDB Storage

**Files Added:**
- `frontend/src/utils/offlineStorage.js`

**Stores:**
- `babies` - Cached baby profiles
- `feedings` - Cached feeding records
- `sleeps` - Cached sleep records
- `diapers` - Cached diaper records
- `pumpings` - Cached pumping records
- `activities` - Cached activities (potty, tummy time, bath, supplements)
- `pending_sync` - Queue of changes to sync when online
- `metadata` - Last sync times and other metadata

**Functions:**
```javascript
// Cache data when online
cacheBabies(babies)
cacheFeedings(babyId, feedings)
cacheSleeps(babyId, sleeps)
cacheDiapers(babyId, diapers)
cachePumpings(babyId, pumpings)

// Get cached data when offline
getCachedBabies()
getCachedFeedings(babyId)
getCachedSleeps(babyId)
getCachedDiapers(babyId)
getCachedPumpings(babyId)

// Sync queue management
queueForSync(action)
getPendingSyncActions()
removeSyncAction(id)
getPendingSyncCount()

// Cleanup
clearAllOfflineData()
```

#### 4c. Sync Hook

**Files Added:**
- `frontend/src/hooks/useOfflineSync.js`

**Hook Return Values:**
```javascript
const {
    online,              // boolean - current online status
    syncing,             // boolean - sync in progress
    pendingCount,        // number - pending changes count
    queueAction,         // function - queue action for sync
    syncPendingChanges,  // function - trigger manual sync
    cacheData,           // function - cache fetched data
    getCachedData,       // function - get cached data
    clearOfflineData     // function - clear all offline data
} = useOfflineSync();
```

#### 4d. Offline Indicator

**Files Added:**
- `frontend/src/components/OfflineIndicator.jsx`

**Behavior:**
- Hidden when online with no pending changes
- Shows "You're offline" banner when disconnected
- Shows pending change count
- Shows "Syncing..." with spinner during sync
- "Sync now" button for manual sync

---

### 5. Terraform Updates

**Files Modified:**
- `infra/variables.tf` - Added `admin_api_key` variable
- `infra/lambda.tf` - Added `ADMIN_API_KEY` to Lambda environment
- `infra/staging.tfvars` - Added staging admin key
- `infra/terraform.tfvars` - Added production admin key

**New Variable:**
```hcl
variable "admin_api_key" {
  description = "API key for admin endpoints (migrations, etc.)"
  type        = string
  sensitive   = true
  default     = ""
}
```

---

### 6. GitHub Actions Updates

**Files Modified:**
- `.github/workflows/deploy-backend-staging.yml`
- `.github/workflows/deploy-backend.yml`

**Changes:**
- Include `alembic/` folder and `alembic.ini` in Lambda deployment package
- Added migration instructions to deploy output

---

## Deployment Checklist

### For Staging (Already Applied)
- [x] Terraform applied with `admin_api_key`
- [x] Code pushed to staging branch
- [ ] Run initial migration: `POST /api/admin/migrate`

### For Production
- [ ] Apply Terraform: `terraform apply`
- [ ] Merge staging to main
- [ ] Run migration after deploy

---

## Admin API Keys

**Staging:** `2ZN9vnKwe4ncXhDy4TZnzIKZ3Fg9YqY2`

**Production:** `BRiKOQRJpfVz0vv9uXpiEg8y3cQZt1B8`

> ⚠️ **Security Note:** These keys are stored in `.tfvars` files which are gitignored. If you need to rotate them, update the tfvars and run `terraform apply`.

---

## Testing Offline Support

1. Open the app in Chrome
2. Open DevTools > Application > Service Workers
3. Check "Offline" checkbox
4. The app should still work with cached data
5. Create a new entry (feeding, diaper, etc.)
6. Uncheck "Offline"
7. The pending change should sync automatically

---

## Dependencies Added

### Backend
- `alembic>=1.13.0` - Database migrations

### Frontend
- `idb@^8.0.0` - IndexedDB wrapper library
- `vite-plugin-pwa@^0.20.0` - PWA/Service Worker generation (dev dependency)
