/**
 * Service Worker - Optimized for Performance
 * يدعم: Caching, FCM, Offline Support
 */

// استيراد Firebase
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
// يُولَّد من متغيرات البيئة وقت البناء (vite.config.js) — لا مفاتيح في المستودع.
importScripts('/firebase-config.js');

const CACHE_NAME = 'store-cache-v6';
const STATIC_CACHE = 'store-static-v6';
const IMAGE_CACHE = 'store-images-v6';

// الملفات الثابتة للكاش
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/notification-badge.svg',
];

// Firebase config (يُولَّد وقت البناء في /firebase-config.js)
firebase.initializeApp(self.__FIREBASE_CONFIG__);

const messaging = firebase.messaging();

// ===== Installation =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ===== Activation =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== IMAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => clients.claim())
  );
});

// ===== Fetch Handler with Caching Strategy =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل طلبات غير HTTP
  if (!url.protocol.startsWith('http')) return;

  // تجاهل طلبات POST/PUT/DELETE - لا يمكن تخزينها في الكاش
  if (request.method !== 'GET') return;

  // API requests - Network First (GET only)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // الصور - Cache First مع تحديث في الخلفية
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Static assets - Cache First
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages - Network First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default - Network First
  event.respondWith(networkFirst(request));
});

// ===== Caching Strategies =====
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // فقط cache الطلبات الناجحة من نوع GET
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      // clone قبل استخدام الـ response
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      // clone قبل استخدام الـ response
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

// ===== FCM Background Messages =====
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] FCM Background:', payload);

  const data = payload.data || {};
  const notificationTitle = payload.notification?.title || `🛒 طلب جديد`;
  const notificationOptions = {
    body: payload.notification?.body || 'لديك طلب جديد في متجرك',
    icon: payload.notification?.icon || '/favicon.svg',
    badge: '/notification-badge.svg',
    tag: 'order-' + (data.orderNumber || Date.now()),
    vibrate: [200, 100, 200],
    requireInteraction: true,
    renotify: true,
    actions: [
      { action: 'view', title: '👁️ عرض' },
      { action: 'dismiss', title: '❌ إغلاق' }
    ],
    data: data
  };

  // إرسال رسالة للنوافذ المفتوحة
  self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((windowClients) => {
      windowClients.forEach((client) => {
        client.postMessage({ type: 'NEW_ORDER_RECEIVED', data: data });
      });
    });

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ===== Push Notifications (Fallback) =====
self.addEventListener('push', (event) => {
  let data = { title: 'طلب جديد! 🛒', body: 'لديك طلب جديد', data: {} };
  
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* Keep the fallback notification for malformed push payloads. */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/notification-badge.svg',
      tag: 'new-order',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: data.data
    })
  );
});

// ===== Notification Click =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/admin/dashboard?tab=orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes('/admin') && 'focus' in client) {
            return client.focus().then(() => {
              client.postMessage({ type: 'NAVIGATE_TO_ORDERS' });
            });
          }
        }
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
  );
});

// ===== Message Handler =====
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
