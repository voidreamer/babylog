const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://a4h1jfeguj.execute-api.ca-central-1.amazonaws.com' : '');

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('auth_token');
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

    async request(endpoint, options = {}) {
        const url = `${API_BASE}/api${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            const errorBody = await response.text();
            console.error('API 401 error:', errorBody);
            console.log('Token that was rejected:', this.token?.substring(0, 50) + '...');
            // Don't auto-clear token - let the auth hook handle it
            // this.setToken(null);
            // window.location.href = '/login';
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

    // Events
    async getTimeline(babyId, date = null) {
        const params = new URLSearchParams({ baby_id: babyId });
        if (date) params.append('date', date);
        return this.request(`/events/timeline?${params}`);
    }

    async getDashboard(babyId) {
        return this.request(`/events/dashboard?baby_id=${babyId}`);
    }
}

export const api = new ApiClient();
export default api;
