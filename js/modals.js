/**
 * modals.js - Modal Management (Details, Auth, Review)
 */
const Modals = {
    overlay: null,

    init() {
        this.overlay = document.getElementById('modalOverlay');
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
    },

    show(contentHTML) {
        this.overlay.innerHTML = `<div class="modal-content">${contentHTML}</div>`;
        this.overlay.classList.remove('hidden');
    },

    close() {
        this.overlay.classList.add('hidden');
        this.overlay.innerHTML = '';
    },

    showAuthModal() {
        this.show(`
            <h2>Login</h2>
            <form id="loginForm">
                <input type="text" id="username" placeholder="Username" required>
                <input type="password" id="password" placeholder="Password" required>
                <button type="submit" class="btn btn-primary">Sign In</button>
            </form>
        `);
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const success = await Auth.login(
                document.getElementById('username').value,
                document.getElementById('password').value
            );
            if (success) this.close();
        });
    }
};
