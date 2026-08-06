// Helper functions used across the app

export function animateCounter(el, target, duration = 1500) {
    const start = 0;
    const startTime = performance.now();
    const isLargeNumber = target > 1000;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = Math.floor(start + (target - start) * eased);
        
        if (isLargeNumber && current >= 1000) {
            el.textContent = (current / 1000).toFixed(1) + 'K';
        } else {
            el.textContent = current.toLocaleString();
        }
        
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

export function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
