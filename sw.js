const precacheResources = [
    '/',
    '/index.html',
    '/style.css',
    '/index.js',
    '/JSDOM.js',
    '/purify.js',
    '/Readability.js',
    '/sw.js',
    "/colorEditor.js",
]

// Choose a cache name
const cacheName = 'cache-v1';

// When the service worker is installing, open the cache and add the precache resources to it
self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(precacheResources)));
    event.waitUntil(self.skipWaiting()); // Activate worker immediately
});


function downloadCache() {
    return caches.open(cacheName).then((cache) => cache.addAll(precacheResources));
}

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim()); // Become available to all pages
    console.log('Service worker activate event!');
});

// When there's an incoming fetch request, try and respond with a precached resource, otherwise fall back to the network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            var f = fetch(event.request);
            f.catch((error) => {
                console.log("could not fetch!", error)
            });
            return f;
        }),
    );
});

self.addEventListener('message', async (event) => {
    const data = event.data;
    if (data.command == "clearCache") {
        caches.delete(cacheName);
        await downloadCache();
        event.ports[0].postMessage({
            command: "clearCache",
            status: "success"
        });
    }
});