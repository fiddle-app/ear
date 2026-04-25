// Ear Tuner — Service Worker
// Pre-caches the app shell; runtime-caches sound samples.

const CACHE_VER    = '2026-04-25 19:45';  // stamped by deploy.sh — do not edit manually
const STATIC_CACHE = `ear-tuner-static-${CACHE_VER}`;
const FONT_CACHE   = 'ear-tuner-fonts';
const SOUND_CACHE  = 'ear-tuner-sounds';

// Paths are relative to this sw.js file. In prod (sw.js at /ear/sw.js) they
// resolve under /ear/; in dev (sw.js at /sw.js) they resolve under root.
// One set of strings works for both.
const PRECACHE = [
  './',
  'index.html',
  'style.css',
  'soundfont-player.min.js',
  'fonts/fonts.css',
  'fonts/inconsolata-latin.woff2',
  'fonts/nunito-latin.woff2',
  'js/constants.js',
  'js/persistence.js',
  'js/log.js',
  'js/audio-ctx.js',
  'js/audio.js',
  'js/game.js',
  'js/render.js',
  'js/ui.js',
  'js/boot.js',
  'resources/app-icon-180.png',
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
