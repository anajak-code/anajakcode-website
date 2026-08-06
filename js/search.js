import { debounce } from './utils.js';
import { PluginsAPI } from './api.js';

export const Search = {
    currentFilter: '',
    currentSort: 'newest',
    allPlugins: [],
    filteredPlugins: [],
    
    /**
     * Initialize with plugins array
     */
    setPlugins(plugins) {
        this.allPlugins = plugins;
        this.apply();
    },
    
    /**
     * Set filter by category
     */
    setFilter(category) {
        this.currentFilter = category;
        
        // Update UI
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.remove('active');
        });
        
        const activeChip = document.querySelector(`.filter-chip[data-category="${category}"]`);
        if (activeChip) activeChip.classList.add('active');
        
        this.apply();
    },
    
    /**
     * Set sort order
     */
    setSort(sort, label) {
        this.currentSort = sort;
        
        document.getElementById('sort-label').textContent = label;
        document.querySelectorAll('.sort-option').forEach(opt => opt.classList.remove('active'));
        
        const activeOption = document.querySelector(`.sort-option[data-sort="${sort}"]`);
        if (activeOption) activeOption.classList.add('active');
        
        // Close menu
        const menu = document.getElementById('sort-menu');
        if (menu) menu.classList.remove('show');
        
        this.apply();
    },
    
    /**
     * Apply current filter and sort
     */
    apply() {
        let plugins = [...this.allPlugins];
        
        // Filter by category
        if (this.currentFilter) {
            plugins = plugins.filter(p => p.category === this.currentFilter);
        }
        
        // Sort
        switch (this.currentSort) {
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
                const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
                plugins = plugins.filter(p => favorites.includes(p.id));
                break;
        }
        
        this.filteredPlugins = plugins;
        
        // Dispatch event for UI to listen
        const event = new CustomEvent('pluginsFiltered', {
            detail: { plugins: this.filteredPlugins, total: this.allPlugins.length }
        });
        document.dispatchEvent(event);
    },
    
    /**
     * Search handler with debounce
     */
    initSearch() {
        const searchInput = document.getElementById('search');
        if (!searchInput) return;
        
        const debouncedSearch = debounce(async (query) => {
            if (query.length < 2) {
                this.apply();
                return;
            }
            
            try {
                const plugins = await PluginsAPI.search(query);
                this.filteredPlugins = plugins;
                
                const event = new CustomEvent('pluginsFiltered', {
                    detail: { plugins, total: this.allPlugins.length, isSearch: true }
                });
                document.dispatchEvent(event);
            } catch (err) {
                console.error('Search failed:', err);
            }
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.trim());
        });
    }
};

window.Search = Search;
