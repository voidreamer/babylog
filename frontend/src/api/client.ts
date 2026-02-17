/* eslint-disable @typescript-eslint/no-explicit-any */
const isDev = import.meta.env.DEV;
const log = (...args: any[]) => isDev && console.log(...args);

const API_BASE = import.meta.env.VITE_API_URL || '';

if (!API_BASE && import.meta.env.PROD) {
    console.error('CRITICAL: VITE_API_URL environment variable is not set in production!');
}

import { supabase } from '../lib/supabase';
import {
    isOnline,
    getCachedBabies, getCachedFeedings, getCachedSleeps, getCachedDiapers, getCachedPumpings,
    cacheBabies, cacheFeedings, cacheSleeps, cacheDiapers, cachePumpings,
    addCachedFeeding, addCachedSleep, addCachedDiaper, addCachedPumping,
    cacheActivities, getCachedActivities, addCachedActivity,
    queueForSync,
    cacheDoctorVisits, getCachedDoctorVisits,
    cacheVaccinations, getCachedVaccinations,
    cacheMedications, getCachedMedications,
    cacheGrowthRecords, getCachedGrowthRecords
} from '../utils/offlineStorage';

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

class ApiClient {
    async getAuthHeaders(): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };
    }

    async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
        const url = `${API_BASE}/api${endpoint}`;
        const authHeaders = await this.getAuthHeaders();
        const headers = { ...authHeaders, ...options.headers };

        const response = await fetch(url, { ...options, headers, cache: 'no-store' });

        if (response.status === 401) {
            const errorBody = await response.text();
            throw new Error('Unauthorized: ' + errorBody);
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            let message = 'API Error';
            if (error.detail) {
                if (typeof error.detail === 'string') {
                    message = error.detail;
                } else if (Array.isArray(error.detail)) {
                    message = error.detail.map((e: any) => e.msg || JSON.stringify(e)).join('; ');
                } else {
                    message = JSON.stringify(error.detail);
                }
            }
            throw new ApiError(message, response.status);
        }

        if (response.status === 204) return null;
        return response.json();
    }

    // Babies
    async getBabies(): Promise<any[]> {
        try {
            const babies = await this.request('/babies/');
            if (babies) await cacheBabies(babies);
            return babies;
        } catch (error) {
            if (!isOnline()) { log('Offline: returning cached babies'); return await getCachedBabies(); }
            throw error;
        }
    }

    async getBaby(id: number): Promise<any> { return this.request(`/babies/${id}`); }

    async createBaby(data: any): Promise<any> {
        return this.request('/babies/', { method: 'POST', body: JSON.stringify(data) });
    }

    async updateBaby(id: number, data: any): Promise<any> {
        return this.request(`/babies/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async deleteBaby(id: number): Promise<any> {
        return this.request(`/babies/${id}`, { method: 'DELETE' });
    }

    async shareBaby(id: number, email: string, role: string = 'caregiver'): Promise<any> {
        return this.request(`/babies/${id}/share`, { method: 'POST', body: JSON.stringify({ email, role }) });
    }

    async unshareBaby(id: number, email: string): Promise<any> {
        return this.request(`/babies/${id}/share/${encodeURIComponent(email)}`, { method: 'DELETE' });
    }

    async updateCaregiverRole(babyId: number, email: string, role: string): Promise<any> {
        return this.request(`/babies/${babyId}/share/${encodeURIComponent(email)}`, { method: 'PATCH', body: JSON.stringify({ email, role }) });
    }

    // Feedings
    async getFeedings(babyId: number, limit: number = 50): Promise<any[]> {
        try {
            const feedings = await this.request(`/feedings/?baby_id=${babyId}&limit=${limit}`);
            if (feedings) await cacheFeedings(babyId, feedings);
            return feedings;
        } catch (error) {
            if (!isOnline()) { log('Offline: returning cached feedings'); return await getCachedFeedings(babyId); }
            throw error;
        }
    }

    async createFeeding(data: any): Promise<any> {
        try {
            return await this.request('/feedings/', { method: 'POST', body: JSON.stringify(data) });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({ type: 'CREATE_FEEDING', endpoint: '/feedings/', method: 'POST', data });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedFeeding(optimisticEntry);
                return optimisticEntry;
            }
            throw error;
        }
    }

    async deleteFeeding(id: number): Promise<any> { return this.request(`/feedings/${id}`, { method: 'DELETE' }); }
    async updateFeeding(id: number, data: any): Promise<any> { return this.request(`/feedings/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Diapers
    async getDiapers(babyId: number, limit: number = 50): Promise<any[]> {
        try {
            const diapers = await this.request(`/diapers/?baby_id=${babyId}&limit=${limit}`);
            if (diapers) await cacheDiapers(babyId, diapers);
            return diapers;
        } catch (error) {
            if (!isOnline()) { log('Offline: returning cached diapers'); return await getCachedDiapers(babyId); }
            throw error;
        }
    }

    async createDiaper(data: any): Promise<any> {
        try {
            return await this.request('/diapers/', { method: 'POST', body: JSON.stringify(data) });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({ type: 'CREATE_DIAPER', endpoint: '/diapers/', method: 'POST', data });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedDiaper(optimisticEntry);
                return optimisticEntry;
            }
            throw error;
        }
    }

    async deleteDiaper(id: number): Promise<any> { return this.request(`/diapers/${id}`, { method: 'DELETE' }); }
    async updateDiaper(id: number, data: any): Promise<any> { return this.request(`/diapers/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Sleeps
    async getSleeps(babyId: number, limit: number = 50): Promise<any[]> {
        try {
            const sleeps = await this.request(`/sleeps/?baby_id=${babyId}&limit=${limit}`);
            if (sleeps) await cacheSleeps(babyId, sleeps);
            return sleeps;
        } catch (error) {
            if (!isOnline()) { log('Offline: returning cached sleeps'); return await getCachedSleeps(babyId); }
            throw error;
        }
    }

    async getCurrentSleep(babyId: number): Promise<any> { return this.request(`/sleeps/current?baby_id=${babyId}`); }

    async createSleep(data: any): Promise<any> {
        try {
            return await this.request('/sleeps/', { method: 'POST', body: JSON.stringify(data) });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({ type: 'CREATE_SLEEP', endpoint: '/sleeps/', method: 'POST', data });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedSleep(optimisticEntry);
                return optimisticEntry;
            }
            throw error;
        }
    }

    async endSleep(id: number): Promise<any> { return this.request(`/sleeps/${id}/end`, { method: 'POST' }); }
    async deleteSleep(id: number): Promise<any> { return this.request(`/sleeps/${id}`, { method: 'DELETE' }); }
    async updateSleep(id: number, data: any): Promise<any> { return this.request(`/sleeps/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Pumpings
    async getPumpings(babyId: number, limit: number = 50): Promise<any[]> {
        try {
            const pumpings = await this.request(`/pumpings/?baby_id=${babyId}&limit=${limit}`);
            if (pumpings) await cachePumpings(babyId, pumpings);
            return pumpings;
        } catch (error) {
            if (!isOnline()) { log('Offline: returning cached pumpings'); return await getCachedPumpings(babyId); }
            throw error;
        }
    }

    async createPumping(data: any): Promise<any> {
        try {
            return await this.request('/pumpings/', { method: 'POST', body: JSON.stringify(data) });
        } catch (error) {
            if (!isOnline()) {
                await queueForSync({ type: 'CREATE_PUMPING', endpoint: '/pumpings/', method: 'POST', data });
                const optimisticEntry = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() };
                await addCachedPumping(optimisticEntry);
                return optimisticEntry;
            }
            throw error;
        }
    }

    async deletePumping(id: number): Promise<any> { return this.request(`/pumpings/${id}`, { method: 'DELETE' }); }
    async updatePumping(id: number, data: any): Promise<any> { return this.request(`/pumpings/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Events
    async getTimeline(babyId: number, date: string | null = null, tzOffset: number | null = null): Promise<any[]> {
        const params = new URLSearchParams({ baby_id: String(babyId) });
        if (date) params.append('date', date);
        if (tzOffset !== null) params.append('tz_offset', String(tzOffset));
        try { return await this.request(`/events/timeline?${params}`); }
        catch (error) { if (!isOnline()) { log('Offline: timeline not available'); return []; } throw error; }
    }

    async getDashboard(babyId: number, localDate: string | null = null, tzOffset: number | null = null): Promise<any> {
        const params = new URLSearchParams({ baby_id: String(babyId) });
        if (localDate) params.append('local_date', localDate);
        if (tzOffset !== null) params.append('tz_offset', String(tzOffset));
        try { return await this.request(`/events/dashboard?${params}`); }
        catch (error) {
            if (!isOnline()) {
                log('Offline: dashboard not available');
                return { last_feeding: null, last_diaper: null, last_sleep: null, current_sleep: null, last_pumping: null, daily_summary: { feedings_count: 0, diapers_count: 0, sleep_duration_hours: 0 } };
            }
            throw error;
        }
    }

    // Health - Doctor Visits
    async getDoctorVisits(babyId: number): Promise<any[]> {
        try { const visits = await this.request(`/health/doctor-visits/?baby_id=${babyId}`); if (visits) await cacheDoctorVisits(babyId, visits); return visits; }
        catch (error) { if (!isOnline()) { log('Offline: returning cached doctor visits'); return await getCachedDoctorVisits(babyId); } throw error; }
    }
    async createDoctorVisit(data: any): Promise<any> { return this.request('/health/doctor-visits/', { method: 'POST', body: JSON.stringify(data) }); }
    async deleteDoctorVisit(id: number): Promise<any> { return this.request(`/health/doctor-visits/${id}`, { method: 'DELETE' }); }
    async updateDoctorVisit(id: number, data: any): Promise<any> { return this.request(`/health/doctor-visits/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Health - Vaccinations
    async getVaccinations(babyId: number): Promise<any[]> {
        try { const vaccinations = await this.request(`/health/vaccinations/?baby_id=${babyId}`); if (vaccinations) await cacheVaccinations(babyId, vaccinations); return vaccinations; }
        catch (error) { if (!isOnline()) { return await getCachedVaccinations(babyId); } throw error; }
    }
    async createVaccination(data: any): Promise<any> { return this.request('/health/vaccinations/', { method: 'POST', body: JSON.stringify(data) }); }
    async deleteVaccination(id: number): Promise<any> { return this.request(`/health/vaccinations/${id}`, { method: 'DELETE' }); }
    async updateVaccination(id: number, data: any): Promise<any> { return this.request(`/health/vaccinations/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Health - Medications
    async getMedications(babyId: number, activeOnly: boolean = false): Promise<any[]> {
        try { const medications = await this.request(`/health/medications/?baby_id=${babyId}&active_only=${activeOnly}`); if (medications) await cacheMedications(babyId, medications); return medications; }
        catch (error) { if (!isOnline()) { const cached = await getCachedMedications(babyId); return activeOnly ? cached.filter((m: any) => m.is_active) : cached; } throw error; }
    }
    async createMedication(data: any): Promise<any> { return this.request('/health/medications/', { method: 'POST', body: JSON.stringify(data) }); }
    async deleteMedication(id: number): Promise<any> { return this.request(`/health/medications/${id}`, { method: 'DELETE' }); }
    async updateMedication(id: number, data: any): Promise<any> { return this.request(`/health/medications/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async toggleMedicationActive(id: number): Promise<any> { return this.request(`/health/medications/${id}/toggle`, { method: 'PATCH' }); }

    // Health - Growth
    async getGrowthRecords(babyId: number): Promise<any[]> {
        try { const records = await this.request(`/health/growth/?baby_id=${babyId}`); if (records) await cacheGrowthRecords(babyId, records); return records; }
        catch (error) { if (!isOnline()) { return await getCachedGrowthRecords(babyId); } throw error; }
    }
    async createGrowthRecord(data: any): Promise<any> { return this.request('/health/growth/', { method: 'POST', body: JSON.stringify(data) }); }
    async deleteGrowthRecord(id: number): Promise<any> { return this.request(`/health/growth/${id}`, { method: 'DELETE' }); }
    async updateGrowthRecord(id: number, data: any): Promise<any> { return this.request(`/health/growth/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Activities - Potty
    async getPottyLogs(babyId: number, limit: number = 50): Promise<any[]> {
        try { const pottyLogs = await this.request(`/activities/potty?baby_id=${babyId}&limit=${limit}`); if (pottyLogs) await cacheActivities(babyId, 'potty', pottyLogs); return pottyLogs; }
        catch (error) { if (!isOnline()) { return await getCachedActivities(babyId, 'potty'); } throw error; }
    }
    async createPottyLog(data: any): Promise<any> {
        try { return await this.request('/activities/potty', { method: 'POST', body: JSON.stringify(data) }); }
        catch (error) { if (!isOnline()) { await queueForSync({ type: 'CREATE_POTTY', endpoint: '/activities/potty', method: 'POST', data }); const o = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() }; await addCachedActivity(o, 'potty'); return o; } throw error; }
    }
    async deletePottyLog(id: number): Promise<any> { return this.request(`/activities/potty/${id}`, { method: 'DELETE' }); }
    async updatePottyLog(id: number, data: any): Promise<any> { return this.request(`/activities/potty/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Activities - Tummy Time
    async getTummyTimes(babyId: number, limit: number = 50): Promise<any[]> {
        try { const tummyTimes = await this.request(`/activities/tummy-time?baby_id=${babyId}&limit=${limit}`); if (tummyTimes) await cacheActivities(babyId, 'tummy_time', tummyTimes); return tummyTimes; }
        catch (error) { if (!isOnline()) { return await getCachedActivities(babyId, 'tummy_time'); } throw error; }
    }
    async createTummyTime(data: any): Promise<any> {
        try { return await this.request('/activities/tummy-time', { method: 'POST', body: JSON.stringify(data) }); }
        catch (error) { if (!isOnline()) { await queueForSync({ type: 'CREATE_TUMMY_TIME', endpoint: '/activities/tummy-time', method: 'POST', data }); const o = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() }; await addCachedActivity(o, 'tummy_time'); return o; } throw error; }
    }
    async deleteTummyTime(id: number): Promise<any> { return this.request(`/activities/tummy-time/${id}`, { method: 'DELETE' }); }
    async updateTummyTime(id: number, data: any): Promise<any> { return this.request(`/activities/tummy-time/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Activities - Bath
    async getBaths(babyId: number, limit: number = 50): Promise<any[]> {
        try { const baths = await this.request(`/activities/baths?baby_id=${babyId}&limit=${limit}`); if (baths) await cacheActivities(babyId, 'bath', baths); return baths; }
        catch (error) { if (!isOnline()) { return await getCachedActivities(babyId, 'bath'); } throw error; }
    }
    async createBath(data: any): Promise<any> {
        try { return await this.request('/activities/baths', { method: 'POST', body: JSON.stringify(data) }); }
        catch (error) { if (!isOnline()) { await queueForSync({ type: 'CREATE_BATH', endpoint: '/activities/baths', method: 'POST', data }); const o = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() }; await addCachedActivity(o, 'bath'); return o; } throw error; }
    }
    async deleteBath(id: number): Promise<any> { return this.request(`/activities/baths/${id}`, { method: 'DELETE' }); }
    async updateBath(id: number, data: any): Promise<any> { return this.request(`/activities/baths/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Rest Planner
    async getRestPlan(babyId: number, days: number = 7): Promise<any> {
        const tzOffset = new Date().getTimezoneOffset();
        return this.request(`/rest-planner/${babyId}?days=${days}&tz_offset=${tzOffset}`);
    }

    // Analytics
    async getAnalytics(babyId: number, days: number = 7): Promise<any> {
        const tzOffset = new Date().getTimezoneOffset();
        try { return await this.request(`/analytics/${babyId}?days=${days}&tz_offset=${tzOffset}`); }
        catch (error) { if (!isOnline()) { return { feeding: { total: 0, avg_per_day: 0 }, diaper: { total: 0, avg_per_day: 0 }, sleep: { total_hours: 0, avg_per_day: 0 } }; } throw error; }
    }

    // Subscription
    async getSubscriptionStatus(): Promise<any> {
        try { return await this.request('/subscription/status'); }
        catch (error) { if (!isOnline()) { return { premium: false }; } throw error; }
    }

    // Activities - Supplements
    async getSupplements(babyId: number, limit: number = 50): Promise<any[]> {
        try { const supplements = await this.request(`/activities/supplements?baby_id=${babyId}&limit=${limit}`); if (supplements) await cacheActivities(babyId, 'supplement', supplements); return supplements; }
        catch (error) { if (!isOnline()) { return await getCachedActivities(babyId, 'supplement'); } throw error; }
    }
    async createSupplement(data: any): Promise<any> {
        try { return await this.request('/activities/supplements', { method: 'POST', body: JSON.stringify(data) }); }
        catch (error) { if (!isOnline()) { await queueForSync({ type: 'CREATE_SUPPLEMENT', endpoint: '/activities/supplements', method: 'POST', data }); const o = { ...data, id: `temp_${Date.now()}`, created_at: new Date().toISOString() }; await addCachedActivity(o, 'supplement'); return o; } throw error; }
    }
    async deleteSupplement(id: number): Promise<any> { return this.request(`/activities/supplements/${id}`, { method: 'DELETE' }); }
    async updateSupplement(id: number, data: any): Promise<any> { return this.request(`/activities/supplements/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

    // Export
    getExportCsvUrl(babyId: number, dataType: string = 'all', startDate: string | null = null, endDate: string | null = null): string {
        const params = new URLSearchParams({ data_type: dataType });
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return `${API_BASE}/api/export/csv/${babyId}?${params}`;
    }

    async exportBabyDataCsv(babyId: number, dataType: string = 'all', startDate: string | null = null, endDate: string | null = null): Promise<{ success: boolean; filename: string }> {
        const params = new URLSearchParams({ data_type: dataType });
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const url = `${API_BASE}/api/export/csv/${babyId}?${params}`;
        const headers = await this.getAuthHeaders();
        const response = await fetch(url, { headers });
        if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.detail || 'Export failed'); }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'export.csv';
        if (contentDisposition) { const match = contentDisposition.match(/filename=(.+)/); if (match) filename = match[1]; }

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

    async exportBabyDataJson(babyId: number, startDate: string | null = null, endDate: string | null = null): Promise<any> {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const query = params.toString() ? `?${params}` : '';
        return this.request(`/export/json/${babyId}${query}`);
    }

    // Teeth
    async getTeeth(babyId: number): Promise<any> { return this.request(`/health/teeth/?baby_id=${babyId}`); }
    async createTooth(data: any): Promise<any> { return this.request('/health/teeth/', { method: 'POST', body: JSON.stringify(data) }); }
    async updateTooth(id: number, data: any): Promise<any> { return this.request(`/health/teeth/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async deleteTooth(id: number): Promise<any> { return this.request(`/health/teeth/${id}`, { method: 'DELETE' }); }

    // Sick Days
    async getSickDays(babyId: number): Promise<any> { return this.request(`/health/sick-days/?baby_id=${babyId}`); }
    async createSickDay(data: any): Promise<any> { return this.request('/health/sick-days/', { method: 'POST', body: JSON.stringify(data) }); }
    async updateSickDay(id: number, data: any): Promise<any> { return this.request(`/health/sick-days/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async deleteSickDay(id: number): Promise<any> { return this.request(`/health/sick-days/${id}`, { method: 'DELETE' }); }

    // Allergies
    async getAllergies(babyId: number): Promise<any> { return this.request(`/health/allergies/?baby_id=${babyId}`); }
    async createAllergy(data: any): Promise<any> { return this.request('/health/allergies/', { method: 'POST', body: JSON.stringify(data) }); }
    async updateAllergy(id: number, data: any): Promise<any> { return this.request(`/health/allergies/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async deleteAllergy(id: number): Promise<any> { return this.request(`/health/allergies/${id}`, { method: 'DELETE' }); }

    // Upcoming
    async getUpcoming(babyId: number): Promise<any> { return this.request(`/health/upcoming/?baby_id=${babyId}`); }

    // User / Onboarding
    async getUserInfo(): Promise<any> { return this.request('/users/me'); }
    async completeOnboarding(): Promise<any> { return this.request('/users/me/onboarding', { method: 'POST' }); }
    async completeTour(): Promise<any> { return this.request('/users/me/tour', { method: 'POST' }); }
    async deleteAccount(): Promise<any> { return this.request('/users/me', { method: 'DELETE' }); }

    // Billing
    async createCheckoutSession(priceId: string, successUrl: string, cancelUrl: string): Promise<any> {
        return this.request('/billing/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify({ price_id: priceId, success_url: successUrl, cancel_url: cancelUrl }),
        });
    }
    async getBillingSubscription(): Promise<any> { return this.request('/billing/subscription'); }
    async createBillingPortal(): Promise<any> {
        return this.request('/billing/portal', { method: 'POST' });
    }
}

export const api = new ApiClient();
export default api;
