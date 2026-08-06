/**
 * Simple page router for multi-page architecture
 */
export const Router = {
    /**
     * Navigate to a URL
     */
    navigate(url, replace = false) {
        if (replace) {
            window.history.replaceState({}, '', url);
        } else {
            window.location.href = url;
        }
    },
    
    /**
     * Get current path
     */
    getPath() {
        return window.location.pathname;
    },
    
    /**
     * Get query parameter
     */
    getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },
    
    /**
     * Check if current page matches path
     */
    isPage(path) {
        const current = this.getPath();
        return current === path || current.startsWith(path + '/');
    },
    
    /**
     * Redirect if not authenticated
     */
    requireAuth(redirectPath = null) {
        const token = localStorage.getItem('token');
        if (!token) {
            const redirect = redirectPath || this.getPath();
            this.navigate(`/login/?redirect=${encodeURIComponent(redirect)}`);
            return false;
        }
        return true;
    },
    
    /**
     * Redirect to home
     */
    goHome() {
        this.navigate('/');
    },
    
    /**
     * Go back in history
     */
    back() {
        window.history.back();
    }
};

window.Router = Router;
