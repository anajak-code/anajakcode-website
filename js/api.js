import { Storage } from './storage.js';
import { showError } from './notifications.js';

const API_BASE = 'https://api.anajakcode.site/api/v1';

/**
 * Core API fetch with auth handling
 */
async function apiFetch(url, options = {}) {
    const token = Storage.getToken();
    const headers = { ...options.headers };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (!options.body || !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    try {
        const res = await fetch(url, { ...options, headers });
        
        // Handle 401 - session expired
        if (res.status === 401) {
            Storage.clearAuth();
            if (!url.includes('/auth/')) {
                showError('Session expired. Please login again.');
                setTimeout(() => {
                    window.location.href = '/login/';
                }, 1500);
            }
            throw new Error('Session expired');
        }
        
        // Handle 403 - forbidden (domain blocked or no permission)
        if (res.status === 403) {
            const data = await res.json().catch(() => ({}));
            showError(data.message || 'Access denied');
            throw new Error('Forbidden');
        }
        
        return res;
    } catch (err) {
        console.error('[API] Fetch error:', err);
        throw err;
    }
}

/**
 * Get JSON response
 */
async function getJson(url, options = {}) {
    const res = await apiFetch(url, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
}

// ==================== AUTH API ====================
export const AuthAPI = {
    login(username, password) {
        return apiFetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },
    
    register(username, email, password) {
        return apiFetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    },
    
    me() {
        return getJson(`${API_BASE}/auth/me`);
    },
    
    changePassword(oldPassword, newPassword) {
        return apiFetch(`${API_BASE}/auth/change-password`, {
            method: 'POST',
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
        });
    }
};

// ==================== PLUGINS API ====================
export const PluginsAPI = {
    getAll() {
        return getJson(`${API_BASE}/plugins/`);
    },
    
    getById(id) {
        return getJson(`${API_BASE}/plugins/${id}`);
    },
    
    search(query) {
        return getJson(`${API_BASE}/plugins/search?q=${encodeURIComponent(query)}`);
    },
    
    upload(formData) {
        return apiFetch(`${API_BASE}/plugins/upload`, {
            method: 'POST',
            body: formData
        });
    },
    
    delete(id) {
        return apiFetch(`${API_BASE}/plugins/${id}`, {
            method: 'DELETE'
        });
    },
    
    downloadUrl(id) {
        return `${API_BASE}/plugins/download/${id}`;
    },
    
    getReviews(pluginId) {
        return getJson(`${API_BASE}/plugins/${pluginId}/reviews`);
    },
    
    addReview(pluginId, rating, comment) {
        return apiFetch(`${API_BASE}/plugins/${pluginId}/reviews`, {
            method: 'POST',
            body: JSON.stringify({ rating, comment })
        });
    }
};

// ==================== ADMIN API ====================
export const AdminAPI = {
    getStats() {
        return getJson(`${API_BASE}/plugins/admin/stats`);
    },
    
    getCharts() {
        return getJson(`${API_BASE}/plugins/admin/charts`);
    },
    
    getUsers() {
        return getJson(`${API_BASE}/plugins/admin/users`);
    },
    
    getAllReviews() {
        return getJson(`${API_BASE}/admin/reviews`);
    },
    
    approveReview(id) {
        return apiFetch(`${API_BASE}/admin/reviews/${id}/approve`, {
            method: 'POST'
        });
    },
    
    rejectReview(id) {
        return apiFetch(`${API_BASE}/admin/reviews/${id}/reject`, {
            method: 'POST'
        });
    },
    
    getBlockedIPs() {
        return getJson(`${API_BASE}/admin/blocked-ips`);
    },
    
    blockIP(ip) {
        return apiFetch(`${API_BASE}/admin/block-ip`, {
            method: 'POST',
            body: JSON.stringify({ ip })
        });
    },
    
    unblockIP(ip) {
        return apiFetch(`${API_BASE}/admin/blocked-ips/${encodeURIComponent(ip)}`, {
            method: 'DELETE'
        });
    },
    
    getBackups() {
        return getJson(`${API_BASE}/admin/backups`);
    },
    
    createBackup() {
        return apiFetch(`${API_BASE}/admin/backups/create`, {
            method: 'POST'
        });
    },
    
    getSystemStats() {
        return getJson(`${API_BASE}/admin/system-stats`);
    }
};

export { API_BASE };
