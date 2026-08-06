import { escapeHtml } from './utils.js';

let toastContainer = null;
let toastTimeout = null;

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 24px;
                right: 24px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }
    }
    return toastContainer;
}

export function showToast(msg, icon = 'fa-check-circle', color = '#10b981', duration = 3500) {
    const container = getToastContainer();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        pointer-events: auto;
        animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 280px;
        max-width: 400px;
    `;
    
    toast.innerHTML = `
        <div class="toast-icon-wrapper" style="
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            background: ${color}20;
        ">
            <i class="fas ${icon}" style="color: ${color};"></i>
        </div>
        <div class="toast-msg" style="
            flex: 1;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
        ">${escapeHtml(msg)}</div>
        <button class="toast-close" style="
            width: 28px;
            height: 28px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            transition: all 0.2s;
        ">
            <i class="fas fa-times text-xs"></i>
        </button>
    `;
    
    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
        hideToast(toast);
    });
    
    // Hover effect
    toast.querySelector('.toast-close').addEventListener('mouseenter', (e) => {
        e.currentTarget.style.background = 'var(--bg-tertiary)';
    });
    toast.querySelector('.toast-close').addEventListener('mouseleave', (e) => {
        e.currentTarget.style.background = 'transparent';
    });
    
    container.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
        hideToast(toast);
    }, duration);
    
    return toast;
}

export function hideToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.style.animation = 'toastIn 0.3s ease reverse forwards';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

export function showSuccess(msg) {
    return showToast(msg, 'fa-check-circle', '#10b981');
}

export function showError(msg) {
    return showToast(msg, 'fa-circle-exclamation', '#ef4444');
}

export function showWarning(msg) {
    return showToast(msg, 'fa-triangle-exclamation', '#f59e0b');
}

export function showInfo(msg) {
    return showToast(msg, 'fa-circle-info', '#06b6d4');
}
