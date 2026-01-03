const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://a4h1jfeguj.execute-api.ca-central-1.amazonaws.com' : '');

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
        return this.request('/babies/');
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
        return this.request(`/feedings/?baby_id=${babyId}&limit=${limit}`);
    }

    async createFeeding(data) {
        return this.request('/feedings/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
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
        return this.request(`/diapers/?baby_id=${babyId}&limit=${limit}`);
    }

    async createDiaper(data) {
        return this.request('/diapers/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
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
        return this.request(`/sleeps/?baby_id=${babyId}&limit=${limit}`);
    }

    async getCurrentSleep(babyId) {
        return this.request(`/sleeps/current?baby_id=${babyId}`);
    }

    async createSleep(data) {
        return this.request('/sleeps/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
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
        return this.request(`/pumpings/?baby_id=${babyId}&limit=${limit}`);
    }

    async createPumping(data) {
        return this.request('/pumpings/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
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
        return this.request(`/events/timeline?${params}`);
    }

    async getDashboard(babyId, localDate = null, tzOffset = null) {
        const params = new URLSearchParams({ baby_id: babyId });
        if (localDate) params.append('local_date', localDate);
        if (tzOffset !== null) params.append('tz_offset', tzOffset);
        return this.request(`/events/dashboard?${params}`);
    }

    // Health - Doctor Visits
    async getDoctorVisits(babyId) {
        return this.request(`/health/doctor-visits/?baby_id=${babyId}`);
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

    // Health - Vaccinations
    async getVaccinations(babyId) {
        return this.request(`/health/vaccinations/?baby_id=${babyId}`);
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

    // Health - Medications
    async getMedications(babyId, activeOnly = false) {
        return this.request(`/health/medications/?baby_id=${babyId}&active_only=${activeOnly}`);
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

    // Health - Milestones
    async getMilestones(babyId) {
        return this.request(`/health/milestones/?baby_id=${babyId}`);
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

    // Health - Growth
    async getGrowthRecords(babyId) {
        return this.request(`/health/growth/?baby_id=${babyId}`);
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

    // Activities - Potty
    async getPottyLogs(babyId, limit = 50) {
        return this.request(`/activities/potty?baby_id=${babyId}&limit=${limit}`);
    }

    async createPottyLog(data) {
        return this.request('/activities/potty', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deletePottyLog(id) {
        return this.request(`/activities/potty/${id}`, { method: 'DELETE' });
    }

    // Activities - Tummy Time
    async getTummyTimes(babyId, limit = 50) {
        return this.request(`/activities/tummy-time?baby_id=${babyId}&limit=${limit}`);
    }

    async createTummyTime(data) {
        return this.request('/activities/tummy-time', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteTummyTime(id) {
        return this.request(`/activities/tummy-time/${id}`, { method: 'DELETE' });
    }

    // Activities - Bath
    async getBaths(babyId, limit = 50) {
        return this.request(`/activities/baths?baby_id=${babyId}&limit=${limit}`);
    }

    async createBath(data) {
        return this.request('/activities/baths', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteBath(id) {
        return this.request(`/activities/baths/${id}`, { method: 'DELETE' });
    }
}

export const api = new ApiClient();
export default api;
