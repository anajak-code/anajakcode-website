/**
 * theme.js - Theme Management (Light/Dark) & Utility UI
 */
const Theme = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.apply(savedTheme);
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggle());
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        this.apply(newTheme);
    },

    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111827' : '#ffffff');
    }
};
