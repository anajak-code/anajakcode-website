import { AppState, loadPlugins } from './api.js';
import { renderPlugins, openAuthModal, closeAuthModal, closeDetailsModal, closeReviewModal, showToast } from './ui.js';
import { debounce } from './utils.js';

// Theme Management
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (theme === 'light') {
        icon.classList.remove('fa-sun', 'text-amber-400');
        icon.classList.add('fa-moon', 'text-slate-600');
    } else {
        icon.classList.remove('fa-moon', 'text-slate-600');
        icon.classList.add('fa-sun', 'text-amber-400');
    }
}

// Initialize Theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

// PWA Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW error:', err));
}

// User Section
function updateUserSection() {
    const section = document.getElementById('user-section');
    if (AppState.currentUser) {
        section.innerHTML = `
            <div class="flex items-center gap-2 px-3 py-2 rounded-xl" style="background: var(--bg-secondary); border: 1px solid var(--border-color);">
                <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                    ${AppState.currentUser.username.charAt(0).toUpperCase()}
                </div>
                <span class="text-sm font-semibold hidden md:inline" style="color: var(--text-primary);">${AppState.currentUser.username}</span>
            </div>
            <button onclick="window.API.logout()" class="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition" style="color: var(--text-secondary);" title="Logout">
                <i class="fas fa-right-from-bracket"></i>
            </button>
        `;
    } else {
        section.innerHTML = `
            <button onclick="window.UI.openAuthModal('login')" class="hidden sm:flex btn-ghost px-4 py-2 rounded-xl text-sm font-medium items-center gap-2">
                <i class="fas fa-right-to-bracket text-xs"></i> Login
            </button>
            <button onclick="window.UI.openAuthModal('register')" class="btn-primary px-4 py-2 rounded-xl text-sm font-medium">
                Get Started
            </button>
        `;
    }
}

// Filter & Sort
function filterCategory(cat) {
    AppState.currentFilter = cat;
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    const activeChip = document.querySelector(`.filter-chip[data-category="${cat}"]`);
    if (activeChip) activeChip.classList.add('active');
    applyFiltersAndSort();
}

function toggleSortMenu() {
    document.getElementById('sort-menu').classList.toggle('show');
}

function setSort(sort, label) {
    AppState.currentSort = sort;
    document.getElementById('sort-label').textContent = label;
    document.querySelectorAll('.sort-option').forEach(opt => opt.classList.remove('active'));
    document.querySelector(`.sort-option[data-sort="${sort}"]`).classList.add('active');
    document.getElementById('sort-menu').classList.remove('show');
    applyFiltersAndSort();
}

function applyFiltersAndSort() {
    let plugins = [...AppState.allPlugins];
    
    // Filter
    if (AppState.currentFilter) {
        plugins = plugins.filter(p => p.category === AppState.currentFilter);
    }
    
    // Sort
    switch(AppState.currentSort) {
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
            plugins = plugins.filter(p => AppState.favorites.includes(p.id));
            break;
    }
    
    AppState.filteredPlugins = plugins;
    renderPlugins(plugins);
}

// Search with debounce
const searchHandler = debounce(async (e) => {
    const q = e.target.value.trim();
    
    if (q.length < 2) { 
        applyFiltersAndSort(); 
        return; 
    }
    
    try {
        const plugins = await window.API.searchPlugins(q);
        renderPlugins(plugins);
    } catch (err) { 
        console.error('Search failed:', err); 
    }
}, 300);

// Event Listeners
function setupEventListeners() {
    // Search
    document.getElementById('search').addEventListener('input', searchHandler);
    
    // Auth Form
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        const authMode = document.getElementById('auth-submit-text').textContent === 'Sign In' ? 'login' : 'register';
        
        try {
            const endpoint = authMode === 'login' ? `${window.API.API_BASE || 'https://router.anajakcode.site/api/v1'}/auth/login` : `${window.API.API_BASE || 'https://router.anajakcode.site/api/v1'}/auth/register`;
            const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await res.json();
            
            if (res.ok) {
                if (authMode === 'login') {
                    AppState.authToken = result.token; 
                    AppState.currentUser = result.user;
                    localStorage.setItem('token', AppState.authToken); 
                    localStorage.setItem('user', JSON.stringify(AppState.currentUser));
                    updateUserSection(); 
                    showToast('Welcome back, ' + AppState.currentUser.username + '!', 'fa-hand-peace', '#10b981');
                } else {
                    showToast('Account created! Please login.', 'fa-user-plus', '#10b981'); 
                    openAuthModal('login');
                }
                closeAuthModal();
            } else { 
                showToast(result.detail || 'Failed', 'fa-circle-exclamation', '#ef4444'); 
            }
        } catch (err) { 
            showToast('Connection error', 'fa-circle-exclamation', '#ef4444'); 
        }
    });
    
    // Review Form
    document.getElementById('review-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pluginId = document.getElementById('review-plugin-id').value;
        const rating = parseInt(document.getElementById('review-rating').value);
        const comment = document.getElementById('review-comment').value;
        
        if (rating === 0) { 
            showToast('Please select a rating', 'fa-circle-exclamation', '#f59e0b'); 
            return; 
        }
        
        try {
            const res = await window.API.submitReview(pluginId, rating, comment);
            if (res.ok) { 
                showToast('Review submitted! Awaiting approval.', 'fa-check', '#10b981'); 
                closeReviewModal(); 
            } else { 
                const err = await res.json(); 
                showToast(err.detail || 'Failed', 'fa-circle-exclamation', '#ef4444'); 
            }
        } catch (err) { 
            showToast('Error submitting review', 'fa-circle-exclamation', '#ef4444'); 
        }
    });
    
    // Back to Top
    window.addEventListener('scroll', () => {
        const btn = document.getElementById('back-to-top');
        btn.classList.toggle('show', window.scrollY > 400);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('sort-menu').classList.remove('show');
            closeDetailsModal();
            closeAuthModal();
            closeReviewModal();
        }
        // ⌘K / Ctrl+K to focus search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('search').focus();
        }
    });
    
    // Close sort menu on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.sort-dropdown')) {
            document.getElementById('sort-menu').classList.remove('show');
        }
    });
    
    // Close modals on overlay click
    ['details-modal', 'auth-modal', 'review-modal'].forEach(id => {
        document.getElementById(id).addEventListener('click', (e) => {
            if (e.target.id === id) {
                e.target.classList.add('hidden');
                e.target.classList.remove('flex');
            }
        });
    });
}

// Expose to window
window.App = {
    toggleTheme,
    updateUserSection,
    filterCategory,
    toggleSortMenu,
    setSort,
    applyFiltersAndSort
};

// Initialize
updateUserSection();
setupEventListeners();
loadPlugins();
