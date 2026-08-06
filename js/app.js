/* =====================================================
   AnajakCode - All-in-One Application Script
   Version: 2.0 | Single File (No Imports)
   ===================================================== */

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        // ✅ សំខាន់: កែ URL នេះឱ្យត្រូវនឹង backend របស់អ្នក
        API_BASE: 'https://api.anajakcode.site/api/v1',
        // បើ frontend និង backend នៅ domain ផ្សេង ប្រើនេះ៖
        // API_BASE: 'https://api.anajakcode.site/api/v1',
        
        THEME_KEY: 'anajakcode_theme',
        TOKEN_KEY: 'anajakcode_token',
        USER_KEY: 'anajakcode_user',
        FAVORITES_KEY: 'anajakcode_favorites',
        
        TOAST_DURATION: 3500,
        SEARCH_DEBOUNCE: 300
    };

    // ==================== STATE ====================
    const State = {
        authToken: localStorage.getItem(CONFIG.TOKEN_KEY),
        currentUser: JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || 'null'),
        allPlugins: [],
        filteredPlugins: [],
        currentFilter: '',
        currentSort: 'newest',
        favorites: JSON.parse(localStorage.getItem(CONFIG.FAVORITES_KEY) || '[]'),
        authMode: 'login',
        toastTimeout: null,
        searchTimeout: null
    };

    // Category icons mapping
    const CATEGORY_ICONS = {
        'Core': 'fa-cube',
        'World': 'fa-globe',
        'Economy': 'fa-coins',
        'Admin': 'fa-shield-halved',
        'Gameplay': 'fa-gamepad',
        'Utility': 'fa-wrench',
        'default': 'fa-puzzle-piece'
    };

    // ==================== UTILS ====================
    const Utils = {
        escapeHtml(str) {
            if (str == null) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        animateCounter(el, target, duration = 1500) {
            if (!el) return;
            const start = 0;
            const startTime = performance.now();
            const isLargeNumber = target > 1000;

            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(start + (target - start) * eased);

                if (isLargeNumber && current >= 1000) {
                    el.textContent = (current / 1000).toFixed(1) + 'K';
                } else {
                    el.textContent = current.toLocaleString();
                }

                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        },

        debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        },

        formatDate(dateStr) {
            if (!dateStr) return '-';
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return dateStr;
                const now = new Date();
                const diff = (now - date) / 1000;
                if (diff < 60) return 'just now';
                if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
                if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
                if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
                return date.toLocaleDateString();
            } catch(e) { return dateStr; }
        }
    };

    // ==================== API CLIENT ====================
    const API = {
        async fetch(url, options = {}) {
            const headers = { ...options.headers };
            if (State.authToken) headers['Authorization'] = `Bearer ${State.authToken}`;
            if (!options.body || !(options.body instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
            }

            try {
                const res = await fetch(url, { ...options, headers });
                if (res.status === 401) {
                    Auth.logout();
                    throw new Error('Session expired');
                }
                return res;
            } catch (err) {
                console.error('API Error:', err);
                throw err;
            }
        },

        async loadPlugins() {
            try {
                const res = await fetch(`${CONFIG.API_BASE}/plugins/`);
                if (!res.ok) throw new Error('Failed to load plugins');
                State.allPlugins = await res.json();

                // Load stats
                try {
                    const statsRes = await fetch(`${CONFIG.API_BASE}/plugins/admin/stats`);
                    if (statsRes.ok) {
                        const stats = await statsRes.json();
                        Utils.animateCounter(document.getElementById('total-plugins'), stats.total_plugins || State.allPlugins.length);
                        Utils.animateCounter(document.getElementById('total-downloads'), stats.total_downloads || 0);
                    }
                } catch(e) {
                    Utils.animateCounter(document.getElementById('total-plugins'), State.allPlugins.length);
                }

                App.applyFiltersAndSort();
            } catch (err) {
                console.error('Load plugins error:', err);
                const grid = document.getElementById('plugins-grid');
                if (grid) {
                    grid.innerHTML = `
                        <div class="empty-state col-span-full">
                            <div class="empty-state-icon"><i class="fas fa-wifi-slash"></i></div>
                            <h3 class="text-xl font-bold mb-2" style="color: var(--text-primary);">Connection Error</h3>
                            <p class="mb-4">Failed to connect to backend</p>
                            <button onclick="window.AnajakApp.API.loadPlugins()" class="btn-primary px-6 py-2 rounded-xl text-sm font-medium">
                                <i class="fas fa-rotate-right mr-2"></i> Retry
                            </button>
                        </div>
                    `;
                }
            }
        },

        async downloadPlugin(id, name) {
            try {
                window.location.href = `${CONFIG.API_BASE}/plugins/download/${id}`;
                UI.showToast(`Downloading ${name}...`, 'fa-download', '#10b981');
                setTimeout(() => API.loadPlugins(), 2000);
            } catch (err) {
                UI.showToast('Download failed', 'fa-circle-exclamation', '#ef4444');
            }
        },

        async submitReview(pluginId, rating, comment) {
            return await API.fetch(`${CONFIG.API_BASE}/plugins/${pluginId}/reviews`, {
                method: 'POST',
                body: JSON.stringify({ rating, comment })
            });
        },

        async login(data) {
            return await fetch(`${CONFIG.API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        },

        async register(data) {
            return await fetch(`${CONFIG.API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        },

        async searchPlugins(query) {
            const res = await fetch(`${CONFIG.API_BASE}/plugins/search?q=${encodeURIComponent(query)}`);
            return await res.json();
        },

        toggleFavorite(id) {
            const idx = State.favorites.indexOf(id);
            if (idx > -1) {
                State.favorites.splice(idx, 1);
                UI.showToast('Removed from favorites', 'fa-heart', '#ef4444');
            } else {
                State.favorites.push(id);
                UI.showToast('Added to favorites', 'fa-heart', '#ef4444');
            }
            localStorage.setItem(CONFIG.FAVORITES_KEY, JSON.stringify(State.favorites));
            UI.renderPlugins(State.filteredPlugins);
        }
    };

    // ==================== AUTH ====================
    const Auth = {
        updateUserSection() {
            const section = document.getElementById('user-section');
            if (!section) return;

            if (State.currentUser) {
                section.innerHTML = `
                    <div class="flex items-center gap-2 px-3 py-2 rounded-xl" style="background: var(--bg-secondary); border: 1px solid var(--border-color);">
                        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                            ${State.currentUser.username.charAt(0).toUpperCase()}
                        </div>
                        <span class="text-sm font-semibold hidden md:inline" style="color: var(--text-primary);">${Utils.escapeHtml(State.currentUser.username)}</span>
                    </div>
                    <button onclick="window.AnajakApp.Auth.logout()" class="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition" style="color: var(--text-secondary);" title="Logout">
                        <i class="fas fa-right-from-bracket"></i>
                    </button>
                `;
            } else {
                section.innerHTML = `
                    <button onclick="window.AnajakApp.UI.openAuthModal('login')" class="hidden sm:flex btn-ghost px-4 py-2 rounded-xl text-sm font-medium items-center gap-2">
                        <i class="fas fa-right-to-bracket text-xs"></i> Login
                    </button>
                    <button onclick="window.AnajakApp.UI.openAuthModal('register')" class="btn-primary px-4 py-2 rounded-xl text-sm font-medium">
                        Get Started
                    </button>
                `;
            }
        },

        logout() {
            State.authToken = null;
            State.currentUser = null;
            localStorage.removeItem(CONFIG.TOKEN_KEY);
            localStorage.removeItem(CONFIG.USER_KEY);
            Auth.updateUserSection();
            UI.showToast('Logged out successfully', 'fa-right-from-bracket', '#f59e0b');
        },

        async handleAuthSubmit(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            const isLogin = State.authMode === 'login';

            try {
                const res = isLogin ? await API.login(data) : await API.register(data);
                const result = await res.json();

                if (res.ok) {
                    if (isLogin) {
                        State.authToken = result.token;
                        State.currentUser = result.user;
                        localStorage.setItem(CONFIG.TOKEN_KEY, State.authToken);
                        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(State.currentUser));
                        Auth.updateUserSection();
                        UI.showToast('Welcome back, ' + State.currentUser.username + '!', 'fa-hand-peace', '#10b981');
                    } else {
                        UI.showToast('Account created! Please login.', 'fa-user-plus', '#10b981');
                        UI.openAuthModal('login');
                    }
                    UI.closeAuthModal();
                } else {
                    UI.showToast(result.detail || 'Failed', 'fa-circle-exclamation', '#ef4444');
                }
            } catch (err) {
                UI.showToast('Connection error', 'fa-circle-exclamation', '#ef4444');
            }
        }
    };

    // ==================== UI ====================
    const UI = {
        renderPlugins(plugins) {
            const grid = document.getElementById('plugins-grid');
            const resultsCount = document.getElementById('results-count');
            if (!grid) return;

            if (resultsCount) {
                resultsCount.textContent = plugins.length === State.allPlugins.length
                    ? 'All Plugins'
                    : `${plugins.length} Plugin${plugins.length !== 1 ? 's' : ''} Found`;
            }

            if (plugins.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state col-span-full">
                        <div class="empty-state-icon"><i class="fas fa-magnifying-glass"></i></div>
                        <h3 class="text-xl font-bold mb-2" style="color: var(--text-primary);">No plugins found</h3>
                        <p>Try adjusting your search or filter</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = plugins.map(p => {
                const rating = p.rating || 0;
                const stars = Array(5).fill(0).map((_, i) =>
                    `<i class="fas fa-star" style="color: ${i < Math.floor(rating) ? '#fbbf24' : 'var(--text-muted)'}; font-size: 11px;"></i>`
                ).join('');

                const icon = CATEGORY_ICONS[p.category] || CATEGORY_ICONS.default;
                const isFav = State.favorites.includes(p.id);
                const isNew = p.created_at && (new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24) < 30;
                const isHot = p.downloads_count > 1000;

                return `
                    <div class="plugin-card glass-card rounded-2xl p-6 relative">
                        <button class="favorite-btn ${isFav ? 'active' : ''}" onclick="window.AnajakApp.API.toggleFavorite(${p.id})" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                            <i class="fas fa-heart"></i>
                        </button>
                        
                        <div class="plugin-thumbnail cat-${p.category}" onclick="window.AnajakApp.UI.openDetailsModal(${p.id})">
                            <i class="fas ${icon}"></i>
                        </div>
                        
                        <div class="flex items-center gap-2 mb-3 flex-wrap">
                            <span class="badge badge-category">${Utils.escapeHtml(p.category)}</span>
                            <span class="badge badge-version">v${Utils.escapeHtml(p.version)}</span>
                            ${isNew ? '<span class="badge badge-new"><i class="fas fa-sparkles"></i> NEW</span>' : ''}
                            ${isHot ? '<span class="badge badge-hot"><i class="fas fa-fire"></i> HOT</span>' : ''}
                        </div>
                        
                        <h3 class="text-lg font-bold mb-2 cursor-pointer hover:text-emerald-400 transition" onclick="window.AnajakApp.UI.openDetailsModal(${p.id})">${Utils.escapeHtml(p.name)}</h3>
                        <p class="text-sm line-clamp-2 mb-4" style="color: var(--text-secondary);">${Utils.escapeHtml(p.description)}</p>
                        
                        ${rating > 0 ? `
                            <div class="flex items-center gap-2 mb-4">
                                <div class="flex gap-0.5">${stars}</div>
                                <span class="text-xs font-semibold text-amber-400">${rating.toFixed(1)}</span>
                            </div>
                        ` : ''}
                        
                        <div class="flex items-center gap-3 text-xs mb-5 pb-5" style="color: var(--text-muted); border-bottom: 1px solid var(--border-color);">
                            <span class="flex items-center gap-1"><i class="fas fa-user"></i>${Utils.escapeHtml(p.author || 'Unknown')}</span>
                            <span>·</span>
                            <span class="flex items-center gap-1"><i class="fas fa-hard-drive"></i>${p.size_mb}MB</span>
                            <span>·</span>
                            <span class="flex items-center gap-1"><i class="fas fa-download"></i>${(p.downloads_count || 0).toLocaleString()}</span>
                        </div>
                        
                        <div class="flex justify-between items-center gap-2">
                            <button onclick="window.AnajakApp.UI.openReviewModal(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5">
                                <i class="fas fa-star text-amber-400"></i> Review
                            </button>
                            <button onclick="window.AnajakApp.API.downloadPlugin(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 flex-1 justify-center">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        },

        openDetailsModal(id) {
            const p = State.allPlugins.find(pl => pl.id === id);
            if (!p) return;

            const icon = CATEGORY_ICONS[p.category] || CATEGORY_ICONS.default;
            const rating = p.rating || 0;
            const stars = Array(5).fill(0).map((_, i) =>
                `<i class="fas fa-star" style="color: ${i < Math.floor(rating) ? '#fbbf24' : 'var(--text-muted)'};"></i>`
            ).join('');

            const content = document.getElementById('details-content');
            if (!content) return;

            content.innerHTML = `
                <div class="p-8">
                    <div class="flex items-start gap-5 mb-6 flex-wrap">
                        <div class="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 cat-${p.category}" style="background: var(--bg-tertiary); font-size: 2rem;">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <span class="badge badge-category">${Utils.escapeHtml(p.category)}</span>
                                <span class="badge badge-version">v${Utils.escapeHtml(p.version)}</span>
                            </div>
                            <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">${Utils.escapeHtml(p.name)}</h2>
                            <p class="text-sm" style="color: var(--text-muted);">
                                by ${Utils.escapeHtml(p.author || 'Unknown')} · ${(p.downloads_count || 0).toLocaleString()} downloads
                            </p>
                            ${rating > 0 ? `<div class="flex items-center gap-2 mt-2"><div class="flex gap-0.5">${stars}</div><span class="text-sm font-semibold text-amber-400">${rating.toFixed(1)}</span></div>` : ''}
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-3 mb-6 pb-6" style="border-bottom: 1px solid var(--border-color);">
                        <div class="text-center p-3 rounded-xl" style="background: var(--bg-tertiary);">
                            <div class="text-lg font-bold" style="color: var(--text-primary);">${p.size_mb} MB</div>
                            <div class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">Size</div>
                        </div>
                        <div class="text-center p-3 rounded-xl" style="background: var(--bg-tertiary);">
                            <div class="text-lg font-bold" style="color: var(--text-primary);">${Utils.escapeHtml(p.version)}</div>
                            <div class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">Version</div>
                        </div>
                        <div class="text-center p-3 rounded-xl" style="background: var(--bg-tertiary);">
                            <div class="text-lg font-bold" style="color: var(--text-primary);">${(p.downloads_count || 0).toLocaleString()}</div>
                            <div class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">Downloads</div>
                        </div>
                    </div>
                    
                    <div class="mb-6">
                        <h3 class="text-sm font-bold mb-2 uppercase tracking-wider" style="color: var(--text-secondary);">Description</h3>
                        <p class="text-sm leading-relaxed" style="color: var(--text-primary);">${Utils.escapeHtml(p.description)}</p>
                    </div>
                    
                    ${p.install_command ? `
                        <div class="mb-6">
                            <h3 class="text-sm font-bold mb-2 uppercase tracking-wider" style="color: var(--text-secondary);">Install Command</h3>
                            <div class="code-block">
                                <button class="code-copy" onclick="window.AnajakApp.UI.copyCode('${p.install_command.replace(/'/g, "\\'")}')"><i class="fas fa-copy"></i></button>
                                <code>${Utils.escapeHtml(p.install_command)}</code>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="flex gap-3">
                        <button onclick="window.AnajakApp.API.downloadPlugin(${p.id}, '${p.name.replace(/'/g, "\\'")}'); window.AnajakApp.UI.closeDetailsModal();" class="btn-primary flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                            <i class="fas fa-download"></i> Download Now
                        </button>
                        <button onclick="window.AnajakApp.UI.sharePlugin(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="btn-ghost w-12 h-12 rounded-xl flex items-center justify-center">
                            <i class="fas fa-share-nodes"></i>
                        </button>
                    </div>
                </div>
            `;

            const modal = document.getElementById('details-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        },

        closeDetailsModal() {
            const modal = document.getElementById('details-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        },

        copyCode(code) {
            navigator.clipboard.writeText(code);
            UI.showToast('Copied to clipboard', 'fa-copy', '#10b981');
        },

        sharePlugin(id, name) {
            const url = `${window.location.origin}?plugin=${id}`;
            if (navigator.share) {
                navigator.share({ title: name, text: `Check out ${name} plugin`, url });
            } else {
                navigator.clipboard.writeText(url);
                UI.showToast('Link copied to clipboard', 'fa-link', '#10b981');
            }
        },

        openAuthModal(mode) {
            State.authMode = mode;
            const title = document.getElementById('auth-title');
            const subtitle = document.getElementById('auth-subtitle');
            const submitText = document.getElementById('auth-submit-text');
            const emailField = document.getElementById('email-field');
            const switchText = document.getElementById('auth-switch-text');
            const switchBtn = document.getElementById('auth-switch-btn');

            if (title) title.textContent = mode === 'login' ? 'Welcome Back' : 'Create Account';
            if (subtitle) subtitle.textContent = mode === 'login' ? 'Sign in to your account' : 'Join the community';
            if (submitText) submitText.textContent = mode === 'login' ? 'Sign In' : 'Create Account';
            if (emailField) emailField.classList.toggle('hidden', mode === 'login');
            if (switchText) switchText.textContent = mode === 'login' ? "Don't have an account?" : "Already have an account?";
            if (switchBtn) switchBtn.textContent = mode === 'login' ? 'Register' : 'Login';

            const modal = document.getElementById('auth-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        },

        closeAuthModal() {
            const modal = document.getElementById('auth-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            const form = document.getElementById('auth-form');
            if (form) form.reset();
        },

        toggleAuthMode() {
            UI.openAuthModal(State.authMode === 'login' ? 'register' : 'login');
        },

        openReviewModal(pluginId, pluginName) {
            if (!State.currentUser) {
                UI.showToast('Please login to review', 'fa-circle-exclamation', '#f59e0b');
                UI.openAuthModal('login');
                return;
            }

            const pluginIdInput = document.getElementById('review-plugin-id');
            const pluginNameEl = document.getElementById('review-plugin-name');
            const ratingInput = document.getElementById('review-rating');
            const commentInput = document.getElementById('review-comment');

            if (pluginIdInput) pluginIdInput.value = pluginId;
            if (pluginNameEl) pluginNameEl.textContent = pluginName;
            if (ratingInput) ratingInput.value = 0;
            if (commentInput) commentInput.value = '';

            document.querySelectorAll('#star-selector i').forEach(s => s.classList.remove('active'));

            const modal = document.getElementById('review-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        },

        closeReviewModal() {
            const modal = document.getElementById('review-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        },

        setRating(rating) {
            const ratingInput = document.getElementById('review-rating');
            if (ratingInput) ratingInput.value = rating;
            document.querySelectorAll('#star-selector i').forEach((s, i) => {
                s.classList.toggle('active', i < rating);
            });
        },

        async handleReviewSubmit(e) {
            e.preventDefault();
            const pluginId = document.getElementById('review-plugin-id').value;
            const rating = parseInt(document.getElementById('review-rating').value);
            const comment = document.getElementById('review-comment').value;

            if (rating === 0) {
                UI.showToast('Please select a rating', 'fa-circle-exclamation', '#f59e0b');
                return;
            }

            try {
                const res = await API.submitReview(pluginId, rating, comment);
                if (res.ok) {
                    UI.showToast('Review submitted! Awaiting approval.', 'fa-check', '#10b981');
                    UI.closeReviewModal();
                } else {
                    const err = await res.json();
                    UI.showToast(err.detail || 'Failed', 'fa-circle-exclamation', '#ef4444');
                }
            } catch (err) {
                UI.showToast('Error submitting review', 'fa-circle-exclamation', '#ef4444');
            }
        },

        showToast(msg, icon = 'fa-check', color = '#10b981') {
            const toast = document.getElementById('toast');
            const toastMsg = document.getElementById('toast-msg');
            const toastIcon = document.getElementById('toast-icon');
            const toastIconWrapper = document.getElementById('toast-icon-wrapper');

            if (!toast) return;

            if (toastMsg) toastMsg.textContent = msg;
            if (toastIcon) {
                toastIcon.className = `fas ${icon}`;
                toastIcon.style.color = color;
            }
            if (toastIconWrapper) toastIconWrapper.style.background = color + '20';

            toast.classList.remove('hidden');
            toast.classList.add('flex');

            clearTimeout(State.toastTimeout);
            State.toastTimeout = setTimeout(() => UI.hideToast(), CONFIG.TOAST_DURATION);
        },

        hideToast() {
            const toast = document.getElementById('toast');
            if (toast) {
                toast.classList.add('hidden');
                toast.classList.remove('flex');
            }
        }
    };

    // ==================== THEME ====================
    const Theme = {
        init() {
            const savedTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            Theme.updateIcon(savedTheme);
        },

        toggle() {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem(CONFIG.THEME_KEY, newTheme);
            Theme.updateIcon(newTheme);
        },

        updateIcon(theme) {
            const icon = document.getElementById('theme-icon');
            if (!icon) return;
            if (theme === 'light') {
                icon.classList.remove('fa-sun', 'text-amber-400');
                icon.classList.add('fa-moon', 'text-slate-600');
            } else {
                icon.classList.remove('fa-moon', 'text-slate-600');
                icon.classList.add('fa-sun', 'text-amber-400');
            }
        }
    };

    // ==================== APP ====================
    const App = {
        filterCategory(cat) {
            State.currentFilter = cat;
            document.querySelectorAll('.filter-chip').forEach(chip => {
                chip.classList.remove('active');
            });
            const activeChip = document.querySelector(`.filter-chip[data-category="${cat}"]`);
            if (activeChip) activeChip.classList.add('active');
            App.applyFiltersAndSort();
        },

        toggleSortMenu() {
            const menu = document.getElementById('sort-menu');
            if (menu) menu.classList.toggle('show');
        },

        setSort(sort, label) {
            State.currentSort = sort;
            const sortLabel = document.getElementById('sort-label');
            if (sortLabel) sortLabel.textContent = label;

            document.querySelectorAll('.sort-option').forEach(opt => opt.classList.remove('active'));
            const activeOption = document.querySelector(`.sort-option[data-sort="${sort}"]`);
            if (activeOption) activeOption.classList.add('active');

            const menu = document.getElementById('sort-menu');
            if (menu) menu.classList.remove('show');

            App.applyFiltersAndSort();
        },

        applyFiltersAndSort() {
            let plugins = [...State.allPlugins];

            // Filter
            if (State.currentFilter) {
                plugins = plugins.filter(p => p.category === State.currentFilter);
            }

            // Sort
            switch(State.currentSort) {
                case 'newest':
                    plugins.sort((a, b) => (b.id || 0) - (a.id || 0));
                    break;
                case 'popular':
                    plugins.sort((a, b) => (b.downloads_count || 0) - (a.downloads_count || 0));
                    break;
                case 'rated':
                    plugins.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    break;
                case 'az':
                    plugins.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'favorites':
                    plugins = plugins.filter(p => State.favorites.includes(p.id));
                    break;
            }

            State.filteredPlugins = plugins;
            UI.renderPlugins(plugins);
        },

        setupEventListeners() {
            // Search with debounce
            const searchInput = document.getElementById('search');
            if (searchInput) {
                const debouncedSearch = Utils.debounce(async (e) => {
                    const q = e.target.value.trim();
                    if (q.length < 2) {
                        App.applyFiltersAndSort();
                        return;
                    }
                    try {
                        const plugins = await API.searchPlugins(q);
                        UI.renderPlugins(plugins);
                    } catch (err) {
                        console.error('Search failed:', err);
                    }
                }, CONFIG.SEARCH_DEBOUNCE);

                searchInput.addEventListener('input', debouncedSearch);
            }

            // Auth form
            const authForm = document.getElementById('auth-form');
            if (authForm) {
                authForm.addEventListener('submit', Auth.handleAuthSubmit);
            }

            // Review form
            const reviewForm = document.getElementById('review-form');
            if (reviewForm) {
                reviewForm.addEventListener('submit', UI.handleReviewSubmit);
            }

            // Back to top
            window.addEventListener('scroll', () => {
                const btn = document.getElementById('back-to-top');
                if (btn) btn.classList.toggle('show', window.scrollY > 400);
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const sortMenu = document.getElementById('sort-menu');
                    if (sortMenu) sortMenu.classList.remove('show');
                    UI.closeDetailsModal();
                    UI.closeAuthModal();
                    UI.closeReviewModal();
                }
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    const search = document.getElementById('search');
                    if (search) search.focus();
                }
            });

            // Close sort menu on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.sort-dropdown')) {
                    const sortMenu = document.getElementById('sort-menu');
                    if (sortMenu) sortMenu.classList.remove('show');
                }
            });

            // Close modals on overlay click
            ['details-modal', 'auth-modal', 'review-modal'].forEach(id => {
                const modal = document.getElementById(id);
                if (modal) {
                    modal.addEventListener('click', (e) => {
                        if (e.target.id === id) {
                            modal.classList.add('hidden');
                            modal.classList.remove('flex');
                        }
                    });
                }
            });
        },

        init() {
            Theme.init();
            Auth.updateUserSection();
            App.setupEventListeners();
            API.loadPlugins();

            // PWA Service Worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW error:', err));
            }

            console.log('✅ AnajakCode App Initialized');
        }
    };

    // ==================== EXPOSE TO WINDOW ====================
    window.AnajakApp = {
        API,
        Auth,
        UI,
        Theme,
        App,
        State,
        CONFIG
    };

    // ==================== INITIALIZE ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', App.init);
    } else {
        App.init();
    }

})();
