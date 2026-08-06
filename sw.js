// Service Worker for AnajakCode PWA
const CACHE_NAME = 'anajakcode-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    '/js/utils.js',
    '/js/api.js',
    '/js/ui.js',
    '/js/app.js',
    // External CDN (will be cached on first visit)
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap'
];

// ============================================
// INSTALL EVENT - Cache static assets
// ============================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                // Use addAll but don't fail install if some CDN fails
                return Promise.allSettled(
                    STATIC_ASSETS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`[SW] Failed to cache: ${url}`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting(); // Activate immediately
            })
    );
});

// ============================================
// ACTIVATE EVENT - Clean old caches
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        // Delete caches that don't match current versions
                        return name !== STATIC_CACHE && name !== DYNAMIC_CACHE;
                    })
                    .map((name) => {
                        console.log(`[SW] Deleting old cache: ${name}`);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Activated and ready');
            return self.clients.claim(); // Take control immediately
        })
    );
});

// ============================================
// FETCH EVENT - Serve from cache or network
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests (POST, PUT, DELETE, etc.)
    if (request.method !== 'GET') return;

    // Skip chrome-extension, cross-origin API calls that need fresh data
    if (url.origin !== location.origin && !url.href.includes('cdnjs.cloudflare.com') && !url.href.includes('fonts.googleapis.com') && !url.href.includes('cdn.tailwindcss.com')) {
        // For external API calls (like anajakcode.site/api), always go network-first
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(
                    JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                );
            })
        );
        return;
    }

    // Strategy 1: Cache-First for static assets (CSS, JS, fonts, images)
    if (request.destination === 'style' || 
        request.destination === 'script' || 
        request.destination === 'font' ||
        request.destination === 'image' ||
        url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot)$/)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    // Only cache successful responses
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                }).catch(() => {
                    // Fallback for offline images
                    if (request.destination === 'image') {
                        return new Response('', { status: 404 });
                    }
                });
            })
        );
        return;
    }

    // Strategy 2: Network-First for HTML pages (always fresh)
    if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Update cache with fresh copy
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cached version if offline
                    return caches.match(request).then((cached) => {
                        return cached || caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // Strategy 3: Stale-While-Revalidate for everything else
    event.respondWith(
        caches.match(request).then((cached) => {
            const fetchPromise = fetch(request).then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});

// ============================================
// MESSAGE EVENT - Listen for skipWaiting command
// ============================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ============================================
// BACKGROUND SYNC (Optional) - Queue failed POST requests
// ============================================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-reviews') {
        console.log('[SW] Syncing pending reviews...');
        // Implement background sync logic here if needed
    }
});

// ============================================
// PUSH NOTIFICATIONS (Optional)
// ============================================
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New update available!',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('AnajakCode', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked', event);
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
