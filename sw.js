// Ear Tuner — Service Worker
// Pre-caches the app shell; runtime-caches fonts and sound samples.

const CACHE_VER   = 'v1';
const STATIC_CACHE = `ear-tuner-static-${CACHE_VER}`;
const FONT_CACHE   = 'ear-tuner-fonts';
const SOUND_CACHE  = 'ear-tuner-sounds';

const PRECACHE = [
  '/ear/',
  '/ear/index.html',
  '/ear/soundfont-player.min.js',
];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  const keep = [STATIC_CACHE, FONT_CACHE, SOUND_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Font files (versioned, immutable) — cache-first
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(event.request, FONT_CACHE));
    return;
  }

  // Font CSS from googleapis — stale-while-revalidate
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(event.request, FONT_CACHE));
    return;
  }

  // Sound samples — cache-first after first load
  if (url.pathname.includes('/sounds/')) {
    event.respondWith(cacheFirst(event.request, SOUND_CACHE));
    return;
  }

  // Everything else (app shell, soundfont-player.min.js) — cache-first
  event.respondWith(cacheFirst(event.request, STATIC_CACHE));
});

// ── Strategies ────────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchP = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchP;
}
