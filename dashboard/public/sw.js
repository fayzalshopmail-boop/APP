// Service Worker for VSC POS - 100% Offline-First PWA
const CACHE_NAME = 'vsc-pos-cache-v10';

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
  '/offline.html',
  '/manifest.json',
  '/api/manifest',
  '/api/favicon',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/icon.png',
  '/icon.svg',
  '/notification.mp3',
  '/firebase/firebase-app-compat.js',
  '/firebase/firebase-messaging-compat.js'
];

// Install: Cache all core assets AND automatically discover & cache Next.js runtime chunks
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Pre-caching offline app shell');

      // 1. Pre-cache defined static shell assets
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[SW] Precache skipped for ${asset}:`, err);
          })
        )
      );

      // 2. Discover and pre-cache scripts & CSS referenced in the root HTML
      try {
        const rootRes = await fetch('/');
        if (rootRes && rootRes.status === 200) {
          const html = await rootRes.clone().text();
          await cache.put('/', rootRes);

          const scriptRegex = /src="(\/_next\/static\/[^"]+)"/g;
          const cssRegex = /href="(\/_next\/static\/[^"]+)"/g;
          const chunkUrls = [];
          let m;
          while ((m = scriptRegex.exec(html)) !== null) chunkUrls.push(m[1]);
          while ((m = cssRegex.exec(html)) !== null) chunkUrls.push(m[1]);

          await Promise.allSettled(
            chunkUrls.map((chunk) =>
              fetch(chunk).then((res) => {
                if (res && res.status === 200) {
                  return cache.put(chunk, res);
                }
              }).catch(() => {})
            )
          );
          console.log(`[SW] Pre-cached ${chunkUrls.length} Next.js runtime chunks for offline launch`);
        }
      } catch (err) {
        console.warn('[SW] Could not auto-discover Next.js runtime chunks:', err);
      }
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

// Fetch: Offline-First strategy with resilient fallback
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

  // 3. Skip development HMR and WebSockets in dev mode only
  if (
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.includes('/_next/static/development') ||
    url.pathname.includes('/__nextjs_') ||
    request.headers.get('upgrade') === 'websocket'
  ) {
    return;
  }

  // 4. Next.js Static Chunks (/_next/static/...) -> Network First with Offline Fallback
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 5. Static Media Assets (icons, images, audio, fonts, local vendor scripts) -> Cache First
  if (
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.startsWith('/firebase/') ||
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

  // 6. Navigation Requests (HTML Pages) -> Network First with Multi-Tier Offline Fallback
  if (request.mode === 'navigate') {
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
          // Tier 1: Try exact requested URL in cache
          const cachedExact = await caches.match(request, { ignoreSearch: true });
          if (cachedExact) return cachedExact;

          // Tier 2: Try origin + pathname in cache
          const cachedPath = await caches.match(url.origin + url.pathname);
          if (cachedPath) return cachedPath;

          // Tier 3: Try root page ('/') in cache
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;

          // Tier 4: Fallback to standalone offline.html
          const cachedOffline = await caches.match('/offline.html');
          if (cachedOffline) return cachedOffline;

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{background:#0b0e14;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}h2{color:#60a5fa}button{background:#2563eb;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;margin-top:15px}</style></head><body><h2>📴 আপনি অফলাইনে আছেন</h2><p>অ্যাপটি অফলাইনে লোড করা হচ্ছে...</p><button onclick="window.location.reload()">পুনরায় চেষ্টা করুন</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 7. Data APIs and other GET requests -> Network First, Fallback to Cache
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
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
  );
});

// Firebase Cloud Messaging (Push Notifications in background)
try {
  // Use local vendored scripts for 100% offline startup reliability
  importScripts('/firebase/firebase-app-compat.js');
  importScripts('/firebase/firebase-messaging-compat.js');

  const firebaseConfig = {
    apiKey: "AIzaSyATCc5eD9GRqd3_cm9Ja67ZASIVIwrL66c",
    authDomain: "shop-3bf5e.firebaseapp.com",
    projectId: "shop-3bf5e",
    storageBucket: "shop-3bf5e.firebasestorage.app",
    messagingSenderId: "964563299091",
    appId: "1:964563299091:web:15aec08af139ead80a88e6"
  };

  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  if (typeof firebase !== 'undefined' && firebase.messaging && firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'VSC শপ নোটিফিকেশন';
      const body = payload.notification?.body || payload.data?.body || '';
      const clickUrl = payload.data?.url || payload.data?.link || '/';
      
      const options = {
        body: body,
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200],
        tag: payload.data?.tag || `vsc-${Date.now()}`,
        renotify: true,
        requireInteraction: true,
        data: {
          url: clickUrl,
          ...payload.data
        }
      };
      return self.registration.showNotification(title, options);
    });

    self.addEventListener('notificationclick', (event) => {
      event.notification.close();
      const rawUrl = event.notification.data?.url || event.notification.data?.link || '/';
      const urlToOpen = new URL(rawUrl, self.location.origin).href;
      
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
  }
} catch (e) {
  // FCM offline fallback
  console.warn('[SW] Firebase messaging init skipped or offline:', e);
}
