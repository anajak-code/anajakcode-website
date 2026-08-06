import { animateCounter } from './utils.js';

const API_BASE = 'https://router.anajakcode.site/api/v1';

// State
export const AppState = {
    authToken: localStorage.getItem('token'),
    currentUser: JSON.parse(localStorage.getItem('user') || 'null'),
    allPlugins: [],
    filteredPlugins: [],
    currentFilter: '',
    currentSort: 'newest',
    favorites: JSON.parse(localStorage.getItem('favorites') || '[]')
};

// Category icons mapping
export const categoryIcons = {
    'Core': 'fa-cube',
    'World': 'fa-globe',
    'Economy': 'fa-coins',
    'Admin': 'fa-shield-halved',
    'Gameplay': 'fa-gamepad',
    'Utility': 'fa-wrench',
    'default': 'fa-puzzle-piece'
};

// API Fetch with Auth
export async function apiFetch(url, options = {}) {
    const headers = { ...options.headers };
    if (AppState.authToken) headers['Authorization'] = `Bearer ${AppState.authToken}`;
    if (!options.body || !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        logout();
        throw new Error('Session expired');
    }
    return res;
}

// Load Plugins
export async function loadPlugins() {
    try {
        const res = await fetch(`${API_BASE}/plugins/`);
        AppState.allPlugins = await res.json();
        
        // Load stats
        try {
            const statsRes = await fetch(`${API_BASE}/plugins/admin/stats`);
            if (statsRes.ok) {
                const stats = await statsRes.json();
                animateCounter(document.getElementById('total-plugins'), stats.total_plugins || AppState.allPlugins.length);
                animateCounter(document.getElementById('total-downloads'), stats.total_downloads || 0);
            }
        } catch(e) {
            animateCounter(document.getElementById('total-plugins'), AppState.allPlugins.length);
        }
        
        window.App.applyFiltersAndSort();
    } catch (err) {
        document.getElementById('plugins-grid').innerHTML = `
            <div class="empty-state col-span-full">
                <div class="empty-state-icon">
                    <i class="fas fa-wifi-slash"></i>
                </div>
                <h3 class="text-xl font-bold mb-2" style="color: var(--text-primary);">Connection Error</h3>
                <p class="mb-4">Failed to connect to backend</p>
                <button onclick="window.API.loadPlugins()" class="btn-primary px-6 py-2 rounded-xl text-sm font-medium">
                    <i class="fas fa-rotate-right mr-2"></i> Retry
                </button>
            </div>
        `;
    }
}

// Download Plugin
export async function downloadPlugin(id, name) {
    try {
        window.location.href = `${API_BASE}/plugins/download/${id}`;
        window.UI.showToast(`Downloading ${name}...`, 'fa-download', '#10b981');
        setTimeout(loadPlugins, 2000);
    } catch (err) {
        window.UI.showToast('Download failed', 'fa-circle-exclamation', '#ef4444');
    }
}

// Submit Review
export async function submitReview(pluginId, rating, comment) {
    const res = await apiFetch(`${API_BASE}/plugins/${pluginId}/reviews`, { 
        method: 'POST', 
        body: JSON.stringify({ rating, comment }) 
    });
    return res;
}

// Login
export async function login(data) {
    const res = await fetch(`${API_BASE}/auth/login`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(data) 
    });
    return res;
}

// Register
export async function register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(data) 
    });
    return res;
}

// Search
export async function searchPlugins(query) {
    const res = await fetch(`${API_BASE}/plugins/search?q=${encodeURIComponent(query)}`);
    return await res.json();
}

// Logout
export function logout() {
    AppState.authToken = null;
    AppState.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.App.updateUserSection();
    window.UI.showToast('Logged out successfully', 'fa-right-from-bracket', '#f59e0b');
}

// Toggle Favorite
export function toggleFavorite(id) {
    const idx = AppState.favorites.indexOf(id);
    if (idx > -1) {
        AppState.favorites.splice(idx, 1);
        window.UI.showToast('Removed from favorites', 'fa-heart', '#ef4444');
    } else {
        AppState.favorites.push(id);
        window.UI.showToast('Added to favorites', 'fa-heart', '#ef4444');
    }
    localStorage.setItem('favorites', JSON.stringify(AppState.favorites));
    window.UI.renderPlugins(AppState.filteredPlugins);
}

// Expose to window for HTML onclick
window.API = {
    loadPlugins,
    downloadPlugin,
    toggleFavorite,
    logout,
    AppState,
    categoryIcons
};
