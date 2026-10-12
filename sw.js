// Service worker: lets the app open offline and be installed on iOS.
// Strategy: network first, falling back to the cached copy.
// Bump CACHE_NAME whenever files change so devices pick up the update.

const CACHE_NAME = 'ytshelves-v11';

const APP_FILES = [
  './',
  'index.html',
  'styles.css',
  'config.js',
  'js/util.js',
  'js/auth.js',
  'js/storage.js',
  'js/youtube.js',
  'js/layout.js',
  'js/feed.js',
  'js/views.js',
  'js/main.js',
  'manifest.json',
  'icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle our own files; Google APIs go straight to the network.
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
