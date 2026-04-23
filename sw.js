// Ear Tuner — Service Worker
// Pre-caches the app shell; runtime-caches sound samples.

const CACHE_VER    = '2026-04-22 21:10';  // stamped by deploy.sh — do not edit manually
const STATIC_CACHE = `ear-tuner-static-${CACHE_VER}`;
const FONT_CACHE   = 'ear-tuner-fonts';
const SOUND_CACHE  = 'ear-tuner-sounds';

const PRECACHE = [
  '/ear/',
  '/ear/index.html',
  '/ear/style.css',
  '/ear/soundfont-player.min.js',
  '/ear/fonts/fonts.css',
  '/ear/fonts/inconsolata-latin.woff2',
  '/ear/fonts/nunito-latin.woff2',
  '/ear/js/constants.js',
  '/ear/js/persistence.js',
  '/ear/js/log.js',
  '/ear/js/audio-ctx.js',
  '/ear/js/audio.js',
  '/ear/js/game.js',
  '/ear/js/render.js',
  '/ear/js/ui.js',
  '/ear/js/boot.js',
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

  // Sound samples — cache-first after first load
  // (not in PRECACHE — too large for first install; cached on demand)
  if (url.pathname.includes('/sounds/')) {
    event.respondWith(cacheFirst(event.request, SOUND_CACHE));
    return;
  }

  // Everything else (app shell, JS, fonts) — cache-first
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
