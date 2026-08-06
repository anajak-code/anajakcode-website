/**
 * auth.js - Authentication (Login/Register/Session)
 */
const Auth = {
    init() {
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            if (this.isLoggedIn()) this.logout();
            else Modals.showAuthModal();
        });
        this.updateUI();
    },

    async login(username, password) {
        try {
            const res = await API.post('/auth/login', { username, password });
            localStorage.setItem('authToken', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            this.updateUI();
            Toast.show('Login successful!', 'success');
            return true;
        } catch (err) {
            Toast.show(err.message, 'error');
            return false;
        }
    },

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.updateUI();
        Toast.show('Logged out', 'info');
    },

    isLoggedIn() {
        return !!localStorage.getItem('authToken');
    },

    updateUI() {
        const btn = document.getElementById('loginBtn');
        if (btn) btn.textContent = this.isLoggedIn() ? 'Logout' : 'Login';
    }
};
