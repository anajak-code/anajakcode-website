/**
 * api.js - API Fetching, Search & Downloads
 */
const API = {
    baseUrl: 'https://api.example.com/v1',

    async fetch(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const res = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return await res.json();
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    async get(path) { return this.fetch(path); },
    async post(path, data) { return this.fetch(path, { method: 'POST', body: JSON.stringify(data) }); },
    async search(query) { return this.fetch(`/search?q=${encodeURIComponent(query)}`); },
    async download(url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = '';
        a.click();
    }
};
