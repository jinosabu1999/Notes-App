/* Velvet Notes — Service Worker
   Offline support via precache + cache-first for same-origin GETs. */

const VERSION = 'v1';
const CACHE = 'velvet-notes-' + VERSION;

// Everything the app needs while offline (the app itself is a single file)
const ASSETS = [
    './',
    'index.html',
    'manifest.webmanifest',
    'icons/icon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/maskable-512.png',
    'icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Only same-origin GET requests fall under our control
    if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

    // Navigations: network first, fall back to the cached app shell
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put('index.html', copy));
                    return res;
                })
                .catch(() => caches.match('index.html'))
        );
        return;
    }

    // Everything else: cache first, then network (and cache what we fetch)
    event.respondWith(
        caches.match(req, { ignoreSearch: true }).then((hit) => {
            return hit || fetch(req).then((res) => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(req, copy));
                }
                return res;
            });
        })
    );
});
