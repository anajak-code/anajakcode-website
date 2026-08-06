import { escapeHtml, categoryIcons } from './utils.js';
import { Auth } from './auth.js';
import { PluginsAPI } from './api.js';
import { showSuccess, showError } from './notifications.js';
import { Storage } from './storage.js';

export const Modals = {
    /**
     * Open plugin details modal
     */
    openPluginDetails(plugin) {
        const icon = categoryIcons[plugin.category] || categoryIcons.default;
        const rating = plugin.rating || 0;
        const stars = Array(5).fill(0).map((_, i) => 
            `<i class="fas fa-star" style="color: ${i < Math.floor(rating) ? '#fbbf24' : 'var(--text-muted)'};"></i>`
        ).join('');
        
        const content = document.getElementById('details-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="p-8">
                <div class="flex items-start gap-5 mb-6 flex-wrap">
                    <div class="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 cat-${plugin.category}" style="background: var(--bg-tertiary); font-size: 2rem;">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-2 flex-wrap">
                            <span class="badge badge-category">${escapeHtml(plugin.category)}</span>
                            <span class="badge badge-version">v${escapeHtml(plugin.version)}</span>
                        </div>
                        <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">${escapeHtml(plugin.name)}</h2>
                        <p class="text-sm" style="color: var(--text-muted);">
                            by ${escapeHtml(plugin.author || 'Unknown')} · ${plugin.downloads_count.toLocaleString()} downloads
                        </p>
                        ${rating > 0 ? `<div class="flex items-center gap-2 mt-2"><div class="flex gap-0.5">${stars}</div><span class="text-sm font-semibold text-amber-400">${rating.toFixed(1)}</span></div>` : ''}
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-3 mb-6 pb-6" style="border-bottom: 1px solid var(--border-color);">
                    <div class="text-center p-3 rounded-xl" style="background: var(--bg-tertiary);">
                        <div class="text-lg font-bold" style="color: var(--text-primary);">${plugin.size_mb} MB</div>
                        <div class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">Size</div>
                    </div>
                    <div class="text-center p-3 rounded-xl" style="background: var(--bg-tertiary);">
                        <div class="text-lg font-bold" style="color: var(--text-primary);">v${escapeHtml(plugin.version)}</div>
                        <div class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">Version</div>
                    </div>
                    <div class="text-center p-3 rounded-xl" style="background: var(--bg-tertiary);">
                        <div class="text-lg font-bold" style="color: var(--text-primary);">${plugin.downloads_count.toLocaleString()}</div>
                        <div class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">Downloads</div>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h3 class="text-sm font-bold mb-2 uppercase tracking-wider" style="color: var(--text-secondary);">Description</h3>
                    <p class="text-sm leading-relaxed" style="color: var(--text-primary);">${escapeHtml(plugin.description)}</p>
                </div>
                
                ${plugin.install_command ? `
                    <div class="mb-6">
                        <h3 class="text-sm font-bold mb-2 uppercase tracking-wider" style="color: var(--text-secondary);">Install Command</h3>
                        <div class="code-block">
                            <button class="code-copy" onclick="window.UI.copyCode('${escapeHtml(plugin.install_command)}')"><i class="fas fa-copy"></i></button>
                            <code>${escapeHtml(plugin.install_command)}</code>
                        </div>
                    </div>
                ` : ''}
                
                <div class="flex gap-3">
                    <button onclick="window.Plugins.download(${plugin.id}, '${escapeHtml(plugin.name)}'); window.Modals.closePluginDetails();" class="btn-primary flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                        <i class="fas fa-download"></i> Download Now
                    </button>
                    <button onclick="window.Modals.openReviewModal(${plugin.id}, '${escapeHtml(plugin.name)}')" class="btn-ghost px-4 py-3 rounded-xl flex items-center justify-center gap-2">
                        <i class="fas fa-star text-amber-400"></i> Review
                    </button>
                </div>
            </div>
        `;
        
        this.show('details-modal');
    },
    
    /**
     * Open review modal
     */
    openReviewModal(pluginId, pluginName) {
        if (!Auth.isAuthenticated()) {
            showError('Please login to review');
            this.closePluginDetails();
            window.location.href = '/login/';
            return;
        }
        
        document.getElementById('review-plugin-id').value = pluginId;
        document.getElementById('review-plugin-name').textContent = pluginName;
        document.getElementById('review-rating').value = 0;
        document.getElementById('review-comment').value = '';
        
        document.querySelectorAll('#star-selector i').forEach(s => s.classList.remove('active'));
        
        this.closePluginDetails();
        this.show('review-modal');
    },
    
    /**
     * Show modal
     */
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close modal
     */
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        // Re-enable scroll only if no other modals are open
        const openModal = document.querySelector('.modal-overlay.flex');
        if (!openModal) {
            document.body.style.overflow = '';
        }
    },
    
    closePluginDetails() {
        this.close('details-modal');
    },
    
    closeReviewModal() {
        this.close('review-modal');
    },
    
    /**
     * Set review rating
     */
    setRating(rating) {
        document.getElementById('review-rating').value = rating;
        document.querySelectorAll('#star-selector i').forEach((s, i) => {
            s.classList.toggle('active', i < rating);
        });
    },
    
    /**
     * Submit review form
     */
    async submitReview(e) {
        e.preventDefault();
        
        const pluginId = document.getElementById('review-plugin-id').value;
        const rating = parseInt(document.getElementById('review-rating').value);
        const comment = document.getElementById('review-comment').value;
        
        if (rating === 0) {
            showError('Please select a rating');
            return;
        }
        
        try {
            const res = await PluginsAPI.addReview(pluginId, rating, comment);
            if (res.ok) {
                showSuccess('Review submitted! Awaiting approval.');
                this.closeReviewModal();
            } else {
                const err = await res.json();
                showError(err.detail || 'Failed to submit review');
            }
        } catch (err) {
            showError('Error submitting review');
        }
    }
};

// Global exports for onclick handlers
window.Modals = Modals;
