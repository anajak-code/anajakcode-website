/**
 * app.js - Main App Logic, Filters, Sorting, Toasts & Rendering
 */
const Toast = {
    show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }
};

const App = {
    init() {
        Theme.init();
        Auth.init();
        Modals.init();
        console.log('✅ AnajakCode App initialized');
    },

    filter(data, query) {
        if (!query) return data;
        return data.filter(item =>
            item.title?.toLowerCase().includes(query.toLowerCase())
        );
    },

    sort(data, key = 'date', order = 'desc') {
        return [...data].sort((a, b) => {
            return order === 'desc' ? b[key] - a[key] : a[key] - b[key];
        });
    },

    render(items) {
        const container = document.getElementById('content');
        if (!container) return;
        container.innerHTML = items.map(item => `
            <div class="card">
                <h3>${Utils.escapeHtml(item.title)}</h3>
                <p>${Utils.escapeHtml(item.description)}</p>
            </div>
        `).join('');
    }
};

const Utils = {
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    },
    formatDate(date) {
        return new Date(date).toLocaleDateString('km-KH');
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => App.init());
