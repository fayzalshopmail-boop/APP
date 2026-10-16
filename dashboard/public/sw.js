// Service Worker for VSC POS - 100% Offline-First PWA
const CACHE_NAME = 'vsc-pos-cache-v5';

// Pre-cache core application shell routes and assets
const PRECACHE_ASSETS = [
  '/',
  '/customers',
  '/inventory',
  '/due',
  '/loans',
  '/loyalty',
  '/mechanics',
  '/suppliers',
  '/expenses',
  '/reports',
  '/settings',
  '/sms',
  '/staff',
  '/api/manifest',
  '/api/favicon',
  '/icon.svg',
  '/notification.mp3'
];

// Install: Cache all core assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline app shell');
      return Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[SW] Precache skipped for ${asset}:`, err);
          })
        )
      );
    })
  );
});

// Activate: Remove older caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Offline-First strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // 2. Skip Firebase API & Google Auth requests (Firestore SDK handles its own IndexedDB offline cache)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com') ||
    url.hostname.includes('fcmregistrations.googleapis.com')
  ) {
    return;
  }

  // 3. Static Media Assets (icons, images, audio, fonts) -> Cache First, update in background
  if (
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.startsWith('/api/favicon')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          fetch(request)
            .then((res) => {
              if (res && res.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, res));
              }
            })
            .catch(() => {});
          return cached;
        }

        return fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return res;
          })
          .catch(() => caches.match(request));
      })
    );
    return;
  }

  // 4. Next.js Code chunks (/_next/), Pages, and RSC payloads -> Network First, fallback to Cache
  // Ensures new features and UI updates are loaded immediately, with 100% offline fallback
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        // Strip query parameters (?_rsc=...) and try matching base path
        if (url.search) {
          const basePath = url.origin + url.pathname;
          const cachedBase = await caches.match(basePath);
          if (cachedBase) return cachedBase;
        }

        // For navigation requests, fallback to exact path or root '/'
        if (request.mode === 'navigate') {
          const cachedPath = await caches.match(url.pathname);
          if (cachedPath) return cachedPath;

          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{background:#0b0e14;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}h2{color:#60a5fa}button{background:#2563eb;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;margin-top:15px}</style></head><body><h2>📴 আপনি অফলাইনে আছেন</h2><p>অ্যাপটি অফলাইনে লোড করা হচ্ছে...</p><button onclick="window.location.reload()">পুনরায় চেষ্টা করুন</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }

        return new Response('Offline', { status: 503 });
      })
  );
});

// Firebase Cloud Messaging (Push Notifications in background)
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

  const firebaseConfig = {
    apiKey: "AIzaSyATCc5eD9GRqd3_cm9Ja67ZASIVIwrL66c",
    authDomain: "shop-3bf5e.firebaseapp.com",
    projectId: "shop-3bf5e",
    storageBucket: "shop-3bf5e.firebasestorage.app",
    messagingSenderId: "964563299091",
    appId: "1:964563299091:web:15aec08af139ead80a88e6"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'VSC শপ নোটিফিকেশন';
    const options = {
      body: payload.notification?.body || '',
      icon: '/icon.svg',
      data: payload.data
    };
    self.registration.showNotification(title, options);
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  });
} catch (e) {
  // FCM offline fallback
}
