import { AppState, categoryIcons } from './api.js';

let authMode = 'login';
let toastTimeout = null;

// Render Plugins
export function renderPlugins(plugins) {
    const grid = document.getElementById('plugins-grid');
    const resultsCount = document.getElementById('results-count');
    
    resultsCount.textContent = plugins.length === AppState.allPlugins.length 
        ? 'All Plugins' 
        : `${plugins.length} Plugin${plugins.length !== 1 ? 's' : ''} Found`;
    
    if (plugins.length === 0) {
        grid.innerHTML = `
            <div class="empty-state col-span-full">
                <div class="empty-state-icon">
                    <i class="fas fa-magnifying-glass"></i>
                </div>
                <h3 class="text-xl font-bold mb-2" style="color: var(--text-primary);">No plugins found</h3>
                <p>Try adjusting your search or filter</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = plugins.map(p => {
        const rating = p.rating || 0;
        const stars = Array(5).fill(0).map((_, i) => 
            `<i class="fas fa-star ${i < Math.floor(rating) ? 'text-amber-400' : ''}" style="color: ${i < Math.floor(rating) ? '#fbbf24' : 'var(--text-muted)'}; font-size: 11px;"></i>`
        ).join('');
        
        const icon = categoryIcons[p.category] || categoryIcons.default;
        const isFav = AppState.favorites.includes(p.id);
        
        // Determine badges
        const isNew = p.created_at && (new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24) < 30;
        const isHot = p.downloads_count > 1000;
        
        return `
            <div class="plugin-card glass-card rounded-2xl p-6 relative">
                <button class="favorite-btn ${isFav ? 'active' : ''}" onclick="window.API.toggleFavorite(${p.id})" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                    <i class="fas fa-heart"></i>
                </button>
                
                <div class="plugin-thumbnail cat-${p.category}" onclick="window.UI.openDetailsModal(${p.id})">
                    <i class="fas ${icon}"></i>
                </div>
                
                <div class="flex items-center gap-2 mb-3 flex-wrap">
                    <span class="badge badge-category">${p.category}</span>
                    <span class="badge badge-version">v${p.version}</span>
                    ${isNew ? '<span class="badge badge-new"><i class="fas fa-sparkles"></i> NEW</span>' : ''}
                    ${isHot ? '<span class="badge badge-hot"><i class="fas fa-fire"></i> HOT</span>' : ''}
                </div>
                
                <h3 class="text-lg font-bold mb-2 cursor-pointer hover:text-emerald-400 transition" onclick="window.UI.openDetailsModal(${p.id})">${p.name}</h3>
                <p class="text-sm line-clamp-2 mb-4" style="color: var(--text-secondary);">${p.description}</p>
                
                ${rating > 0 ? `
                    <div class="flex items-center gap-2 mb-4">
                        <div class="flex gap-0.5">${stars}</div>
                        <span class="text-xs font-semibold text-amber-400">${rating.toFixed(1)}</span>
                    </div>
                ` : ''}
                
                <div class="flex items-center gap-3 text-xs mb-5 pb-5" style="color: var(--text-muted); border-bottom: 1px solid var(--border-color);">
                    <span class="flex items-center gap-1"><i class="fas fa-user"></i>${p.author || 'Unknown'}</span>
                    <span>·</span>
                    <span class="flex items-center gap-1"><i class="fas fa-hard-drive"></i>${p.size_mb}MB</span>
                    <span>·</span>
                    <span class="flex items-center gap-1"><i class="fas fa-download"></i>${p.downloads_count.toLocaleString()}</span>
                </div>
                
                <div class="flex justify-between items-center gap-2">
                    <button onclick="window.UI.openReviewModal(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5">
                        <i class="fas fa-star text-amber-400"></i> Review
                    </button>
                    <button onclick="window.API.downloadPlugin(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 flex-1 justify-center">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Plugin Details Modal
export function openDetailsModal(id) {
    const p = AppState.allPlugins.find(pl => pl.id === id);
    if (!p) return;
    
    const icon = categoryIcons[p.category] || categoryIcons.default;
    const rating = p.rating || 0;
    const stars = Array(5).fill(0).map((_, i) => 
        `<i class="fas fa-star ${i < Math.floor(rating) ? 'text-amber-400' : ''}" style="color: ${i < Math.floor(rating) ? '#fbbf24' : 'var(--text-muted)'};"></i>`
    ).join('');
    
    document.getElementById('details-content').innerHTML = `
        <div class="p-8">
            <div class="flex items-start gap-5 mb-6 flex-wrap">
                <div class="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 cat-${p.category}" style="background: var(--bg-tertiary); font-size: 2rem;">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                        <span class="badge badge-category">${p.category}</span>
                        <span class="badge badge-version">v${p.version}</span>
                    </div>
                    <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">${p.name}</h2>
                    <p class="text-sm" style="color: var(--text-muted);">
                        by ${p.author || 'Unknown'} · ${p.downloads_count.toLocaleString()} downloads
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
                    <div class="text-lg font-bold" style="color: var(--text-primary);">${p.version}</div>
                    <div class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">Version</div>
                </div>
                <div class="text-center p-3 rounded-xl" style="background: var(--bg-tertiary);">
                    <div class="text-lg font-bold" style="color: var(--text-primary);">${p.downloads_count.toLocaleString()}</div>
                    <div class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">Downloads</div>
                </div>
            </div>
            
            <div class="mb-6">
                <h3 class="text-sm font-bold mb-2 uppercase tracking-wider" style="color: var(--text-secondary);">Description</h3>
                <p class="text-sm leading-relaxed" style="color: var(--text-primary);">${p.description}</p>
            </div>
            
            ${p.install_command ? `
                <div class="mb-6">
                    <h3 class="text-sm font-bold mb-2 uppercase tracking-wider" style="color: var(--text-secondary);">Install Command</h3>
                    <div class="code-block">
                        <button class="code-copy" onclick="window.UI.copyCode('${p.install_command}')"><i class="fas fa-copy"></i></button>
                        <code>${p.install_command}</code>
                    </div>
                </div>
            ` : ''}
            
            <div class="flex gap-3">
                <button onclick="window.API.downloadPlugin(${p.id}, '${p.name.replace(/'/g, "\\'")}'); window.UI.closeDetailsModal();" class="btn-primary flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                    <i class="fas fa-download"></i> Download Now
                </button>
                <button onclick="window.UI.sharePlugin(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="btn-ghost w-12 h-12 rounded-xl flex items-center justify-center">
                    <i class="fas fa-share-nodes"></i>
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('details-modal').classList.remove('hidden');
    document.getElementById('details-modal').classList.add('flex');
}

export function closeDetailsModal() {
    document.getElementById('details-modal').classList.add('hidden');
    document.getElementById('details-modal').classList.remove('flex');
}

export function copyCode(code) {
    navigator.clipboard.writeText(code);
    showToast('Copied to clipboard', 'fa-copy', '#10b981');
}

export function sharePlugin(id, name) {
    const url = `${window.location.origin}?plugin=${id}`;
    if (navigator.share) {
        navigator.share({ title: name, text: `Check out ${name} plugin`, url });
    } else {
        navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard', 'fa-link', '#10b981');
    }
}

// Auth Modal
export function openAuthModal(mode) {
    authMode = mode;
    document.getElementById('auth-title').textContent = mode === 'login' ? 'Welcome Back' : 'Create Account';
    document.getElementById('auth-subtitle').textContent = mode === 'login' ? 'Sign in to your account' : 'Join the community';
    document.getElementById('auth-submit-text').textContent = mode === 'login' ? 'Sign In' : 'Create Account';
    document.getElementById('email-field').classList.toggle('hidden', mode === 'login');
    document.getElementById('auth-switch-text').textContent = mode === 'login' ? "Don't have an account?" : "Already have an account?";
    document.getElementById('auth-switch-btn').textContent = mode === 'login' ? 'Register' : 'Login';
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('auth-modal').classList.add('flex');
}

export function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('auth-modal').classList.remove('flex');
    document.getElementById('auth-form').reset();
}

export function toggleAuthMode() { 
    openAuthModal(authMode === 'login' ? 'register' : 'login'); 
}

// Review Modal
export function openReviewModal(pluginId, pluginName) {
    if (!AppState.currentUser) { 
        showToast('Please login to review', 'fa-circle-exclamation', '#f59e0b'); 
        openAuthModal('login'); 
        return; 
    }
    document.getElementById('review-plugin-id').value = pluginId;
    document.getElementById('review-plugin-name').textContent = pluginName;
    document.getElementById('review-rating').value = 0;
    document.getElementById('review-comment').value = '';
    document.querySelectorAll('#star-selector i').forEach(s => s.classList.remove('active'));
    document.getElementById('review-modal').classList.remove('hidden');
    document.getElementById('review-modal').classList.add('flex');
}

export function closeReviewModal() {
    document.getElementById('review-modal').classList.add('hidden');
    document.getElementById('review-modal').classList.remove('flex');
}

export function setRating(rating) {
    document.getElementById('review-rating').value = rating;
    document.querySelectorAll('#star-selector i').forEach((s, i) => {
        s.classList.toggle('active', i < rating);
    });
}

// Toast
export function showToast(msg, icon = 'fa-check', color = '#10b981') {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    document.getElementById('toast-icon').className = `fas ${icon}`;
    document.getElementById('toast-icon').style.color = color;
    document.getElementById('toast-icon-wrapper').style.background = color + '20';
    toast.classList.remove('hidden');
    toast.classList.add('flex');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(hideToast, 3500);
}

export function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('hidden');
    toast.classList.remove('flex');
}

// Expose to window
window.UI = {
    renderPlugins,
    openDetailsModal,
    closeDetailsModal,
    copyCode,
    sharePlugin,
    openAuthModal,
    closeAuthModal,
    toggleAuthMode,
    openReviewModal,
    closeReviewModal,
    setRating,
    showToast,
    hideToast
};
