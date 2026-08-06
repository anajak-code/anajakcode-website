import { Storage } from './storage.js';

export const Theme = {
    current: 'dark',
    
    init() {
        this.current = Storage.getTheme();
        this.apply();
        this.updateIcon();
    },
    
    apply() {
        document.documentElement.setAttribute('data-theme', this.current);
    },
    
    toggle() {
        this.current = this.current === 'dark' ? 'light' : 'dark';
        Storage.setTheme(this.current);
        this.apply();
        this.updateIcon();
        
        // Re-render charts if they exist (colors may change)
        if (window.Charts && window.Charts.refresh) {
            window.Charts.refresh();
        }
    },
    
    updateIcon() {
        const icon = document.getElementById('theme-icon');
        if (!icon) return;
        
        icon.className = this.current === 'dark' 
            ? 'fas fa-sun text-amber-400'
            : 'fas fa-moon text-slate-600';
    },
    
    isDark() {
        return this.current === 'dark';
    },
    
    isLight() {
        return this.current === 'light';
    }
};

window.Theme = Theme;
