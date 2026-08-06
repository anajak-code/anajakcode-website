import { Storage } from './storage.js';
import { Auth } from './auth.js';
import { Theme } from './theme.js';
import { PluginsAPI } from './api.js';
import { Modals } from './modals.js';
import { Search } from './search.js';
import { Charts } from './charts.js';
import { copyToClipboard, categoryIcons, escapeHtml } from './utils.js';
import { showSuccess, showError } from './notifications.js';

/**
 * Main Application
 */
const App = {
    async init() {
        console.log('🚀 AnajakCode App initializing...');
        
        // Initialize theme
        Theme.init();
        
        // Update user UI
        Auth.updateUserUI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load plugins on home page
        if (this.isHomePage()) {
            await this.loadPlugins();
            Search.initSearch();
        }
        
        // PWA service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.warn('SW registration failed:', err);
            });
        }
        
        console.log('✅ App initialized');
    },
    
    isHomePage() {
        return window.location.pathname === '/' || window.location.pathname === '/index.html';
    },
    
    setupEventListeners() {
        // Sort menu toggle
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sort-dropdown')) {
                const menu = document.getElementById('sort-menu');
                if (menu) menu.classList.remove('show');
            }
        });
        
        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                    document.body.style.overflow = '';
                }
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape - close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.flex').forEach(modal => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                });
                document.body.style.overflow = '';
                
                const menu = document.getElementById('sort-menu');
                if (menu) menu.classList.remove('show');
            }
            
            // ⌘K / Ctrl+K - focus search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const search = document.getElementById('search');
                if (search) search.focus();
            }
        });
        
        // Review form submit
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => Modals.submitReview(e));
        }
        
        // Back to top button
        this.setupBackToTop();
        
        // Listen for filtered plugins event
        document.addEventListener('pluginsFiltered', (e) => {
            this.renderPlugins(e.detail.plugins, e.detail.total, e.detail.isSearch);
        });
    },
    
    setupBackToTop() {
        const btn = document.getElementById('back-to-top');
        if (!btn) return;
        
        window.addEventListener('scroll', () => {
            btn.classList.toggle('show', window.scrollY > 400);
        });
    },
    
    async loadPlugins() {
        try {
            const plugins = await PluginsAPI.getAll();
            Search.setPlugins(plugins);
            
            // Animate stats if elements exist
            this.animateStats(plugins);
        } catch (err) {
            console.error('Failed to load plugins:', err);
            this.showErrorState();
        }
    },
    
    animateStats(plugins) {
        const totalPluginsEl = document.getElementById('total-plugins');
        const totalDownloadsEl = document.getElementById('total-downloads');
        
        if (totalPluginsEl) {
            import('./utils.js').then(({ animateCounter }) => {
                animateCounter(totalPluginsEl, plugins.length);
            });
        }
        
        if (totalDownloadsEl) {
            const totalDownloads = plugins.reduce((sum, p) => sum + (p.downloads_count || 0), 0);
            import('./utils.js').then(({ animateCounter }) => {
                animateCounter(totalDownloadsEl, totalDownloads);
            });
        }
    },
    
    renderPlugins(plugins, totalAll, isSearch = false) {
        const grid = document.getElementById('plugins-grid');
        const resultsCount = document.getElementById('results-count');
        
        if (!grid) return;
        
        // Update results count
        if (resultsCount) {
            if (isSearch) {
                resultsCount.textContent = `${plugins.length} Result${plugins.length !== 1 ? 's' : ''}`;
            } else {
                resultsCount.textContent = plugins.length === totalAll
                    ? 'All Plugins'
                    : `${plugins.length} Plugin${plugins.length !== 1 ? 's' : ''} Found`;
            }
        }
        
        if (plugins.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                    <div class="empty-state-icon" style="width: 100px; height: 100px; border-radius: 24px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: 3rem; color: var(--text-muted); margin: 0 auto 20px;">
                        <i class="fas fa-magnifying-glass"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-2" style="color: var(--text-primary);">No plugins found</h3>
                    <p style="color: var(--text-secondary);">Try adjusting your search or filter</p>
                </div>
            `;
            return;
        }
        
        const favorites = Storage.getFavorites();
        
        grid.innerHTML = plugins.map(p => {
            const rating = p.rating || 0;
            const stars = Array(5).fill(0).map((_, i) => 
                `<i class="fas fa-star" style="color: ${i < Math.floor(rating) ? '#fbbf24' : 'var(--text-muted)'}; font-size: 11px;"></i>`
            ).join('');
            
            const icon = categoryIcons[p.category] || categoryIcons.default;
            const isFav = favorites.includes(p.id);
            const isNew = p.created_at && (new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24) < 30;
            const isHot = p.downloads_count > 1000;
            
            return `
                <div class="plugin-card glass-card rounded-2xl p-6 relative">
                    <button class="favorite-btn ${isFav ? 'active' : ''}" onclick="window.Plugins.toggleFavorite(${p.id})" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="fas fa-heart"></i>
                    </button>
                    
                    <div class="plugin-thumbnail cat-${p.category}" onclick="window.Plugins.showDetails(${p.id})">
                        <i class="fas ${icon}"></i>
                    </div>
                    
                    <div class="flex items-center gap-2 mb-3 flex-wrap">
                        <span class="badge badge-category">${escapeHtml(p.category)}</span>
                        <span class="badge badge-version">v${escapeHtml(p.version)}</span>
                        ${isNew ? '<span class="badge badge-new"><i class="fas fa-sparkles"></i> NEW</span>' : ''}
                        ${isHot ? '<span class="badge badge-hot"><i class="fas fa-fire"></i> HOT</span>' : ''}
                    </div>
                    
                    <h3 class="text-lg font-bold mb-2 cursor-pointer hover:text-emerald-400 transition" onclick="window.Plugins.showDetails(${p.id})">${escapeHtml(p.name)}</h3>
                    <p class="text-sm line-clamp-2 mb-4" style="color: var(--text-secondary);">${escapeHtml(p.description)}</p>
                    
                    ${rating > 0 ? `
                        <div class="flex items-center gap-2 mb-4">
                            <div class="flex gap-0.5">${stars}</div>
                            <span class="text-xs font-semibold text-amber-400">${rating.toFixed(1)}</span>
                        </div>
                    ` : ''}
                    
                    <div class="flex items-center gap-3 text-xs mb-5 pb-5" style="color: var(--text-muted); border-bottom: 1px solid var(--border-color);">
                        <span class="flex items-center gap-1"><i class="fas fa-user"></i>${escapeHtml(p.author || 'Unknown')}</span>
                        <span>·</span>
                        <span class="flex items-center gap-1"><i class="fas fa-hard-drive"></i>${p.size_mb}MB</span>
                        <span>·</span>
                        <span class="flex items-center gap-1"><i class="fas fa-download"></i>${p.downloads_count.toLocaleString()}</span>
                    </div>
                    
                    <div class="flex justify-between items-center gap-2">
                        <button onclick="window.Modals.openReviewModal(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')" class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5">
                            <i class="fas fa-star text-amber-400"></i> Review
                        </button>
                        <button onclick="window.Plugins.download(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')" class="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 flex-1 justify-center">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    showErrorState() {
        const grid = document.getElementById('plugins-grid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                <div style="width: 100px; height: 100px; border-radius: 24px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: 3rem; color: var(--text-muted); margin: 0 auto 20px;">
                    <i class="fas fa-wifi-slash"></i>
                </div>
                <h3 class="text-xl font-bold mb-2" style="color: var(--text-primary);">Connection Error</h3>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">Failed to connect to backend</p>
                <button onclick="window.App.loadPlugins()" class="btn-primary px-6 py-2 rounded-xl text-sm font-medium">
                    <i class="fas fa-rotate-right mr-2"></i> Retry
                </button>
            </div>
        `;
    }
};

// Plugins namespace
window.Plugins = {
    showDetails(id) {
        const plugin = Search.allPlugins.find(p => p.id === id);
        if (plugin) Modals.openPluginDetails(plugin);
    },
    
    download(id, name) {
        const url = PluginsAPI.downloadUrl(id);
        window.location.href = url;
        showSuccess(`Downloading ${name}...`);
    },
    
    toggleFavorite(id) {
        const favorites = Storage.getFavorites();
        const idx = favorites.indexOf(id);
        
        if (idx > -1) {
            favorites.splice(idx, 1);
            showError('Removed from favorites');
        } else {
            favorites.push(id);
            showSuccess('Added to favorites');
        }
        
        Storage.setFavorites(favorites);
        Search.apply();
    }
};

// UI namespace for misc functions
window.UI = {
    copyCode(code) {
        copyToClipboard(code).then(() => {
            showSuccess('Copied to clipboard');
        }).catch(() => {
            showError('Failed to copy');
        });
    },
    
    toggleSortMenu() {
        const menu = document.getElementById('sort-menu');
        if (menu) menu.classList.toggle('show');
    }
};

// Initialize app when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

window.App = App;
