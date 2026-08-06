import { Storage } from './storage.js';
import { AuthAPI } from './api.js';
import { showSuccess, showError } from './notifications.js';

export const Auth = {
    /**
     * Check if user is logged in
     */
    isAuthenticated() {
        const token = Storage.getToken();
        const user = Storage.getUser();
        return !!(token && user);
    },
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return Storage.getUser();
    },
    
    /**
     * Login user
     */
    async login(username, password) {
        try {
            const res = await AuthAPI.login(username, password);
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Login failed');
            }
            
            const data = await res.json();
            
            Storage.setToken(data.token);
            Storage.setUser(data.user);
            
            showSuccess(`Welcome back, ${data.user.username}!`);
            return data;
        } catch (err) {
            showError(err.message || 'Login failed');
            throw err;
        }
    },
    
    /**
     * Register new user
     */
    async register(username, email, password) {
        try {
            const res = await AuthAPI.register(username, email, password);
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Registration failed');
            }
            
            showSuccess('Account created! Please login.');
            return await res.json();
        } catch (err) {
            showError(err.message || 'Registration failed');
            throw err;
        }
    },
    
    /**
     * Logout user
     */
    logout() {
        Storage.clearAuth();
        showSuccess('Logged out successfully');
        window.location.href = '/';
    },
    
    /**
     * Require authentication - redirect to login if not authenticated
     */
    requireAuth(redirectUrl = null) {
        if (!this.isAuthenticated()) {
            const redirectTo = redirectUrl || window.location.pathname;
            window.location.href = `/login/?redirect=${encodeURIComponent(redirectTo)}`;
            return false;
        }
        return true;
    },
    
    /**
     * Require admin role
     */
    requireAdmin() {
        if (!this.requireAuth()) return false;
        
        const user = this.getCurrentUser();
        if (user.role !== 'admin') {
            showError('Admin access required');
            window.location.href = '/';
            return false;
        }
        return true;
    },
    
    /**
     * Update user UI (navbar, etc)
     */
    updateUserUI() {
        const userSection = document.getElementById('user-section');
        if (!userSection) return;
        
        if (this.isAuthenticated()) {
            const user = this.getCurrentUser();
            userSection.innerHTML = `
                <a href="/profile/" class="flex items-center gap-2 px-3 py-2 rounded-xl" style="background: var(--bg-secondary); border: 1px solid var(--border-color);">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                        ${user.username.charAt(0).toUpperCase()}
                    </div>
                    <span class="text-sm font-semibold hidden md:inline" style="color: var(--text-primary);">${user.username}</span>
                </a>
                <button onclick="window.Auth.logout()" class="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition" style="color: var(--text-secondary);" title="Logout">
                    <i class="fas fa-right-from-bracket"></i>
                </button>
            `;
        } else {
            userSection.innerHTML = `
                <a href="/login/" class="hidden sm:flex btn-ghost px-4 py-2 rounded-xl text-sm font-medium items-center gap-2">
                    <i class="fas fa-right-to-bracket text-xs"></i> Login
                </a>
                <a href="/register/" class="btn-primary px-4 py-2 rounded-xl text-sm font-medium">
                    Get Started
                </a>
            `;
        }
    }
};

// Make available globally for HTML onclick handlers
window.Auth = Auth;
