// Only log in development
const isDev = import.meta.env.DEV;
const log = (...args) => isDev && console.log(...args);

// Validate API_BASE is set in production
const API_BASE = import.meta.env.VITE_API_URL || '';

if (!API_BASE && import.meta.env.PROD) {
    console.error('CRITICAL: VITE_API_URL environment variable is not set in production!');
}

import {
    isOnline,
    getCachedBabies,
    getCachedFeedings,
    getCachedSleeps,
    getCachedDiapers,
    getCachedPumpings,
    cacheBabies,
    cacheFeedings,
    cacheSleeps,
    cacheDiapers,
    cachePumpings,
    addCachedFeeding,
    addCachedSleep,
    addCachedDiaper,
    addCachedPumping,
    cacheActivities,
    getCachedActivities,
    addCachedActivity,
    queueForSync,
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
    getCachedGrowthRecords
} from '../utils/offlineStorage.js';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.refreshFunction = null;
        this.isRefreshing = false;
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    getToken() {
        return this.token;
    }

    setRefreshFunction(fn) {
        this.refreshFunction = fn;
    }

    async request(endpoint, options = {}, isRetry = false) {
        const url = `${API_BASE}/api${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        // Send user email from id_token for baby sharing feature
        const userEmail = localStorage.getItem('user_email');
        if (userEmail) {
            headers['X-User-Email'] = userEmail;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle 401 - try to refresh token and retry once
        if (response.status === 401 && !isRetry && this.refreshFunction && !this.isRefreshing) {
            this.isRefreshing = true;
            try {
                const newToken = await this.refreshFunction();
                this.isRefreshing = false;

                if (newToken) {
                    // Retry the original request with new token
                    return this.request(endpoint, options, true);
                }
            } catch (e) {
                this.isRefreshing = false;
            }

            // Refresh failed, throw unauthorized error
            const errorBody = await response.text();
            throw new Error('Unauthorized: ' + errorBody);
        }

        if (response.status === 401) {
            const errorBody = await response.text();
            throw new Error('Unauthorized: ' + errorBody);
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'API Error');
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    // Babies
    async getBabies() {
        try {
            const babies = await this.request('/babies/');
            // Cache when successfully fetched
            if (babies) {
                await cacheBabies(babies);
            }
            return babies;
        } catch (error) {
            // If offline, return cached data
            if (!isOnline()) {
                log('Offline: returning cached babies');
                return await getCachedBabies();
            }
            throw error;
        }
    }

    async getBaby(id) {
        return this.request(`/babies/${id}`);
    }

    async createBaby(data) {
        return this.request('/babies/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateBaby(id, data) {
        return this.request(`/babies/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteBaby(id) {
        return this.request(`/babies/${id}`, {
            method: 'DELETE',
        });
    }

    async shareBaby(id, email) {
        return this.request(`/babies/${id}/share`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async unshareBaby(id, email) {
        return this.request(`/babies/${id}/share/${encodeURIComponent(email)}`, {
            method: 'DELETE',
        });
    }

    // Feedings
    async getFeedings(babyId, limit = 50) {
        try {
            const feedings = await this.request(`/feedings/?baby_id=${babyId}&limit=${limit}`);
            if (feedings) {
                await cacheFeedings(babyId, feedings);
            }
            return feedings;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached feedings');
                return await getCachedFeedings(babyId);
            }
            throw error;
        }
    }

    async createFeeding(data) {
        try {
            return await this.request('/feedings/', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (error) {
            if (!isOnline()) {
                // Queue for sync when back online
                await queueForSync({
                    type: 'CREATE_FEEDING',
                    endpoint: '/feedings/',
                    method: 'POST',
                    data
                });
                // Create optimistic response and add to cache
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedFeeding(optimisticEntry);
                return optimisticEntry;
            }
            throw error;
        }
    }

    async deleteFeeding(id) {
        return this.request(`/feedings/${id}`, {
            method: 'DELETE',
        });
    }

    async updateFeeding(id, data) {
        return this.request(`/feedings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Diapers
    async getDiapers(babyId, limit = 50) {
        try {
            const diapers = await this.request(`/diapers/?baby_id=${babyId}&limit=${limit}`);
            if (diapers) {
                await cacheDiapers(babyId, diapers);
            }
            return diapers;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached diapers');
                return await getCachedDiapers(babyId);
            }
            throw error;
        }
    }

    async createDiaper(data) {
        try {
            return await this.request('/diapers/', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({
                    type: 'CREATE_DIAPER',
                    endpoint: '/diapers/',
                    method: 'POST',
                    data
                });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedDiaper(optimisticEntry);
                return optimisticEntry;
            }
            throw error;
        }
    }

    async deleteDiaper(id) {
        return this.request(`/diapers/${id}`, {
            method: 'DELETE',
        });
    }

    async updateDiaper(id, data) {
        return this.request(`/diapers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Sleeps
    async getSleeps(babyId, limit = 50) {
        try {
            const sleeps = await this.request(`/sleeps/?baby_id=${babyId}&limit=${limit}`);
            if (sleeps) {
                await cacheSleeps(babyId, sleeps);
            }
            return sleeps;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached sleeps');
                return await getCachedSleeps(babyId);
            }
            throw error;
        }
    }

    async getCurrentSleep(babyId) {
        return this.request(`/sleeps/current?baby_id=${babyId}`);
    }

    async createSleep(data) {
        try {
            return await this.request('/sleeps/', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({
                    type: 'CREATE_SLEEP',
                    endpoint: '/sleeps/',
                    method: 'POST',
                    data
                });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedSleep(optimisticEntry);
                return optimisticEntry;
            }
            throw error;
        }
    }

    async endSleep(id) {
        return this.request(`/sleeps/${id}/end`, {
            method: 'POST',
        });
    }

    async deleteSleep(id) {
        return this.request(`/sleeps/${id}`, {
            method: 'DELETE',
        });
    }

    async updateSleep(id, data) {
        return this.request(`/sleeps/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Pumpings
    async getPumpings(babyId, limit = 50) {
        try {
            const pumpings = await this.request(`/pumpings/?baby_id=${babyId}&limit=${limit}`);
            if (pumpings) {
                await cachePumpings(babyId, pumpings);
            }
            return pumpings;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached pumpings');
                return await getCachedPumpings(babyId);
            }
            throw error;
        }
    }

    async createPumping(data) {
        try {
            return await this.request('/pumpings/', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({
                    type: 'CREATE_PUMPING',
                    endpoint: '/pumpings/',
                    method: 'POST',
                    data
                });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedPumping(optimisticEntry);
                return optimisticEntry;
            }
            throw error;
        }
    }

    async deletePumping(id) {
        return this.request(`/pumpings/${id}`, {
            method: 'DELETE',
        });
    }

    async updatePumping(id, data) {
        return this.request(`/pumpings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Events
    async getTimeline(babyId, date = null, tzOffset = null) {
        const params = new URLSearchParams({ baby_id: babyId });
        if (date) params.append('date', date);
        if (tzOffset !== null) params.append('tz_offset', tzOffset);

        try {
            return await this.request(`/events/timeline?${params}`);
        } catch (error) {
            if (!isOnline()) {
                log('Offline: timeline not available, returning empty array');
                return [];
            }
            throw error;
        }
    }

    async getDashboard(babyId, localDate = null, tzOffset = null) {
        const params = new URLSearchParams({ baby_id: babyId });
        if (localDate) params.append('local_date', localDate);
        if (tzOffset !== null) params.append('tz_offset', tzOffset);

        try {
            return await this.request(`/events/dashboard?${params}`);
        } catch (error) {
            if (!isOnline()) {
                log('Offline: dashboard not available, returning empty data');
                return {
                    last_feeding: null,
                    last_diaper: null,
                    last_sleep: null,
                    current_sleep: null,
                    last_pumping: null,
                    daily_summary: {
                        feedings_count: 0,
                        diapers_count: 0,
                        sleep_duration_hours: 0
                    }
                };
            }
            throw error;
        }
    }

    // Health - Doctor Visits
    async getDoctorVisits(babyId) {
        try {
            const visits = await this.request(`/health/doctor-visits/?baby_id=${babyId}`);
            if (visits) {
                await cacheDoctorVisits(babyId, visits);
            }
            return visits;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached doctor visits');
                return await getCachedDoctorVisits(babyId);
            }
            throw error;
        }
    }

    async createDoctorVisit(data) {
        return this.request('/health/doctor-visits/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteDoctorVisit(id) {
        return this.request(`/health/doctor-visits/${id}`, { method: 'DELETE' });
    }

    async updateDoctorVisit(id, data) {
        return this.request(`/health/doctor-visits/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Health - Vaccinations
    async getVaccinations(babyId) {
        try {
            const vaccinations = await this.request(`/health/vaccinations/?baby_id=${babyId}`);
            if (vaccinations) {
                await cacheVaccinations(babyId, vaccinations);
            }
            return vaccinations;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached vaccinations');
                return await getCachedVaccinations(babyId);
            }
            throw error;
        }
    }

    async createVaccination(data) {
        return this.request('/health/vaccinations/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteVaccination(id) {
        return this.request(`/health/vaccinations/${id}`, { method: 'DELETE' });
    }

    async updateVaccination(id, data) {
        return this.request(`/health/vaccinations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Health - Medications
    async getMedications(babyId, activeOnly = false) {
        try {
            const medications = await this.request(`/health/medications/?baby_id=${babyId}&active_only=${activeOnly}`);
            if (medications) {
                await cacheMedications(babyId, medications);
            }
            return medications;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached medications');
                const cached = await getCachedMedications(babyId);
                return activeOnly ? cached.filter(m => m.is_active) : cached;
            }
            throw error;
        }
    }

    async createMedication(data) {
        return this.request('/health/medications/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteMedication(id) {
        return this.request(`/health/medications/${id}`, { method: 'DELETE' });
    }

    async updateMedication(id, data) {
        return this.request(`/health/medications/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async toggleMedicationActive(id) {
        return this.request(`/health/medications/${id}/toggle`, { method: 'PATCH' });
    }

    // Health - Milestones
    async getMilestones(babyId) {
        try {
            const milestones = await this.request(`/health/milestones/?baby_id=${babyId}`);
            if (milestones) {
                await cacheMilestones(babyId, milestones);
            }
            return milestones;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached milestones');
                return await getCachedMilestones(babyId);
            }
            throw error;
        }
    }

    async createMilestone(data) {
        return this.request('/health/milestones/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteMilestone(id) {
        return this.request(`/health/milestones/${id}`, { method: 'DELETE' });
    }

    async updateMilestone(id, data) {
        return this.request(`/health/milestones/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Health - Growth
    async getGrowthRecords(babyId) {
        try {
            const records = await this.request(`/health/growth/?baby_id=${babyId}`);
            if (records) {
                await cacheGrowthRecords(babyId, records);
            }
            return records;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached growth records');
                return await getCachedGrowthRecords(babyId);
            }
            throw error;
        }
    }

    async createGrowthRecord(data) {
        return this.request('/health/growth/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteGrowthRecord(id) {
        return this.request(`/health/growth/${id}`, { method: 'DELETE' });
    }

    async updateGrowthRecord(id, data) {
        return this.request(`/health/growth/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Activities - Potty
    async getPottyLogs(babyId, limit = 50) {
        try {
            const pottyLogs = await this.request(`/activities/potty?baby_id=${babyId}&limit=${limit}`);
            if (pottyLogs) {
                await cacheActivities(babyId, 'potty', pottyLogs);
            }
            return pottyLogs;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached potty logs');
                return await getCachedActivities(babyId, 'potty');
            }
            throw error;
        }
    }

    async createPottyLog(data) {
        try {
            return await this.request('/activities/potty', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({
                    type: 'CREATE_POTTY',
                    endpoint: '/activities/potty',
                    method: 'POST',
                    data
                });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedActivity(optimisticEntry, 'potty');
                return optimisticEntry;
            }
            throw error;
        }
    }

    async deletePottyLog(id) {
        return this.request(`/activities/potty/${id}`, { method: 'DELETE' });
    }

    async updatePottyLog(id, data) {
        return this.request(`/activities/potty/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Activities - Tummy Time
    async getTummyTimes(babyId, limit = 50) {
        try {
            const tummyTimes = await this.request(`/activities/tummy-time?baby_id=${babyId}&limit=${limit}`);
            if (tummyTimes) {
                await cacheActivities(babyId, 'tummy_time', tummyTimes);
            }
            return tummyTimes;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached tummy times');
                return await getCachedActivities(babyId, 'tummy_time');
            }
            throw error;
        }
    }

    async createTummyTime(data) {
        try {
            return await this.request('/activities/tummy-time', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({
                    type: 'CREATE_TUMMY_TIME',
                    endpoint: '/activities/tummy-time',
                    method: 'POST',
                    data
                });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedActivity(optimisticEntry, 'tummy_time');
                return optimisticEntry;
            }
            throw error;
        }
    }

    async deleteTummyTime(id) {
        return this.request(`/activities/tummy-time/${id}`, { method: 'DELETE' });
    }

    async updateTummyTime(id, data) {
        return this.request(`/activities/tummy-time/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Activities - Bath
    async getBaths(babyId, limit = 50) {
        try {
            const baths = await this.request(`/activities/baths?baby_id=${babyId}&limit=${limit}`);
            if (baths) {
                await cacheActivities(babyId, 'bath', baths);
            }
            return baths;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached baths');
                return await getCachedActivities(babyId, 'bath');
            }
            throw error;
        }
    }

    async createBath(data) {
        try {
            return await this.request('/activities/baths', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({
                    type: 'CREATE_BATH',
                    endpoint: '/activities/baths',
                    method: 'POST',
                    data
                });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedActivity(optimisticEntry, 'bath');
                return optimisticEntry;
            }
            throw error;
        }
    }

    async deleteBath(id) {
        return this.request(`/activities/baths/${id}`, { method: 'DELETE' });
    }

    async updateBath(id, data) {
        return this.request(`/activities/baths/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Analytics
    async getAnalytics(babyId, days = 7) {
        const tzOffset = new Date().getTimezoneOffset();
        try {
            return await this.request(`/analytics/${babyId}?days=${days}&tz_offset=${tzOffset}`);
        } catch (error) {
            if (!isOnline()) {
                log('Offline: analytics not available, returning empty data');
                return {
                    feeding: { total: 0, avg_per_day: 0 },
                    diaper: { total: 0, avg_per_day: 0 },
                    sleep: { total_hours: 0, avg_per_day: 0 }
                };
            }
            throw error;
        }
    }

    // Subscription
    async redeemPromoCode(code) {
        return this.request('/subscription/redeem', {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    }

    async getSubscriptionStatus() {
        try {
            return await this.request('/subscription/status');
        } catch (error) {
            if (!isOnline()) {
                log('Offline: subscription status not available');
                return { premium: false };
            }
            throw error;
        }
    }

    // Activities - Supplements
    async getSupplements(babyId, limit = 50) {
        try {
            const supplements = await this.request(`/activities/supplements?baby_id=${babyId}&limit=${limit}`);
            if (supplements) {
                await cacheActivities(babyId, 'supplement', supplements);
            }
            return supplements;
        } catch (error) {
            if (!isOnline()) {
                log('Offline: returning cached supplements');
                return await getCachedActivities(babyId, 'supplement');
            }
            throw error;
        }
    }

    async createSupplement(data) {
        try {
            return await this.request('/activities/supplements', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({
                    type: 'CREATE_SUPPLEMENT',
                    endpoint: '/activities/supplements',
                    method: 'POST',
                    data
                });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedActivity(optimisticEntry, 'supplement');
                return optimisticEntry;
            }
            throw error;
        }
    }

    async deleteSupplement(id) {
        return this.request(`/activities/supplements/${id}`, { method: 'DELETE' });
    }

    async updateSupplement(id, data) {
        return this.request(`/activities/supplements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Export
    getExportCsvUrl(babyId, dataType = 'all', startDate = null, endDate = null) {
        const params = new URLSearchParams({ data_type: dataType });
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return `${API_BASE}/api/export/csv/${babyId}?${params}`;
    }

    async exportBabyDataCsv(babyId, dataType = 'all', startDate = null, endDate = null) {
        const params = new URLSearchParams({ data_type: dataType });
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const url = `${API_BASE}/api/export/csv/${babyId}?${params}`;

        const headers = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        const userEmail = localStorage.getItem('user_email');
        if (userEmail) {
            headers['X-User-Email'] = userEmail;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Export failed');
        }

        // Get filename from header or generate one
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'export.csv';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename=(.+)/);
            if (match) filename = match[1];
        }

        // Create blob and download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        return { success: true, filename };
    }

    async exportBabyDataJson(babyId, startDate = null, endDate = null) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const query = params.toString() ? `?${params}` : '';
        return this.request(`/export/json/${babyId}${query}`);
    }

    // ========================================================================
    // Teeth (Teething Tracker)
    // ========================================================================

    async getTeeth(babyId) {
        return this.request(`/health/teeth/?baby_id=${babyId}`);
    }

    async createTooth(data) {
        return this.request('/health/teeth/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateTooth(id, data) {
        return this.request(`/health/teeth/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteTooth(id) {
        return this.request(`/health/teeth/${id}`, { method: 'DELETE' });
    }

    // ========================================================================
    // Sick Days
    // ========================================================================

    async getSickDays(babyId) {
        return this.request(`/health/sick-days/?baby_id=${babyId}`);
    }

    async createSickDay(data) {
        return this.request('/health/sick-days/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateSickDay(id, data) {
        return this.request(`/health/sick-days/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteSickDay(id) {
        return this.request(`/health/sick-days/${id}`, { method: 'DELETE' });
    }

    // ========================================================================
    // Allergies
    // ========================================================================

    async getAllergies(babyId) {
        return this.request(`/health/allergies/?baby_id=${babyId}`);
    }

    async createAllergy(data) {
        return this.request('/health/allergies/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateAllergy(id, data) {
        return this.request(`/health/allergies/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteAllergy(id) {
        return this.request(`/health/allergies/${id}`, { method: 'DELETE' });
    }
}

export const api = new ApiClient();
export default api;
