/**
 * LocalStorage Wrapper with JSON parsing and error handling
 */
export const Storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (err) {
            console.error(`[Storage] Error getting ${key}:`, err);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error(`[Storage] Error setting ${key}:`, err);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (err) {
            console.error(`[Storage] Error removing ${key}:`, err);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (err) {
            console.error('[Storage] Error clearing:', err);
            return false;
        }
    },

    // Specific keys
    keys: {
        TOKEN: 'token',
        USER: 'user',
        THEME: 'theme',
        FAVORITES: 'favorites',
        VIEW_MODE: 'viewMode'
    },

    // Convenience methods
    getToken() {
        return this.get(this.keys.TOKEN);
    },

    setToken(token) {
        return this.set(this.keys.TOKEN, token);
    },

    getUser() {
        return this.get(this.keys.USER);
    },

    setUser(user) {
        return this.set(this.keys.USER, user);
    },

    getTheme() {
        return this.get(this.keys.THEME, 'dark');
    },

    setTheme(theme) {
        return this.set(this.keys.THEME, theme);
    },

    getFavorites() {
        return this.get(this.keys.FAVORITES, []);
    },

    setFavorites(favorites) {
        return this.set(this.keys.FAVORITES, favorites);
    },

    clearAuth() {
        this.remove(this.keys.TOKEN);
        this.remove(this.keys.USER);
    }
};
