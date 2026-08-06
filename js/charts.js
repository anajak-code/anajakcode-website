import { PluginsAPI, AdminAPI } from './api.js';
import { Theme } from './theme.js';
import { animateCounter } from './utils.js';

let chartInstances = {};

export const Charts = {
    /**
     * Render overview line chart (downloads trend)
     */
    renderOverview(dailyData, elementId = 'overviewChart') {
        const canvas = document.getElementById(elementId);
        if (!canvas || !window.Chart) return;
        
        const ctx = canvas.getContext('2d');
        if (chartInstances.overview) chartInstances.overview.destroy();
        
        const textColor = Theme.isDark() ? '#94a3b8' : '#64748b';
        const gridColor = Theme.isDark() ? 'rgba(51, 65, 85, 0.3)' : 'rgba(0, 0, 0, 0.05)';
        
        const labels = [];
        const data = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            
            const found = (dailyData || []).find(item => item.date === dateStr);
            data.push(found ? found.count : 0);
        }
        
        chartInstances.overview = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Downloads',
                    data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } }
                }
            }
        });
    },
    
    /**
     * Render top plugins bar chart
     */
    renderTopPlugins(topPlugins, elementId = 'topPluginsChart') {
        const canvas = document.getElementById(elementId);
        if (!canvas || !window.Chart) return;
        
        const ctx = canvas.getContext('2d');
        if (chartInstances.topPlugins) chartInstances.topPlugins.destroy();
        
        const textColor = Theme.isDark() ? '#94a3b8' : '#64748b';
        const labels = (topPlugins || []).map(p => p.name);
        const data = (topPlugins || []).map(p => p.downloads_count);
        
        if (labels.length === 0) {
            ctx.canvas.parentElement.innerHTML = '<div style="text-align:center; padding: 60px; color: var(--text-muted);">No data yet</div>';
            return;
        }
        
        chartInstances.topPlugins = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Downloads',
                    data,
                    backgroundColor: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: textColor } },
                    y: { ticks: { color: textColor, stepSize: 1 } }
                }
            }
        });
    },
    
    /**
     * Render category doughnut chart
     */
    renderCategory(categories, elementId = 'categoryChart') {
        const canvas = document.getElementById(elementId);
        if (!canvas || !window.Chart) return;
        
        const ctx = canvas.getContext('2d');
        if (chartInstances.category) chartInstances.category.destroy();
        
        const textColor = Theme.isDark() ? '#94a3b8' : '#64748b';
        
        if (!categories || categories.length === 0) {
            ctx.canvas.parentElement.innerHTML = '<div style="text-align:center; padding: 60px; color: var(--text-muted);">No data yet</div>';
            return;
        }
        
        chartInstances.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(c => c.category),
                datasets: [{
                    data: categories.map(c => c.count),
                    backgroundColor: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor, padding: 15 }
                    }
                }
            }
        });
    },
    
    /**
     * Refresh all charts (used when theme changes)
     */
    refresh() {
        // Charts will be re-rendered on next data load
    },
    
    /**
     * Destroy all chart instances
     */
    destroyAll() {
        Object.values(chartInstances).forEach(chart => {
            if (chart) chart.destroy();
        });
        chartInstances = {};
    }
};

window.Charts = Charts;
