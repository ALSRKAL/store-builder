


importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
// يُولَّد من متغيرات البيئة وقت البناء (vite.config.js) — لا مفاتيح في المستودع.
importScripts('/firebase-config.js');

firebase.initializeApp(self.__FIREBASE_CONFIG__);

const messaging = firebase.messaging();


messaging.onBackgroundMessage((payload) => {
  console.log('[FCM-SW] Background Message:', payload);

  const data = payload.data || {};
  const customerName = data.customerName || '';
  const orderNumber = data.orderNumber || '';
  
  const notificationTitle = payload.notification?.title || `🛒 طلب جديد من ${customerName}`;
  const notificationOptions = {
    body: payload.notification?.body || 'لديك طلب جديد في متجرك',
    icon: payload.notification?.icon || '/favicon.svg',
    badge: '/notification-badge.svg',
    tag: 'order-' + (orderNumber || Date.now()),
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    renotify: true,
    actions: [
      { action: 'view', title: '👁️ عرض' },
      { action: 'dismiss', title: '❌ إغلاق' }
    ],
    data: data
  };

  // إرسال رسالة لجميع النوافذ المفتوحة لتحديث الطلبات
  self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((windowClients) => {
      windowClients.forEach((client) => {
        client.postMessage({ 
          type: 'NEW_ORDER_RECEIVED',
          data: data
        });
      });
    });

  return self.registration.showNotification(notificationTitle, notificationOptions);
});


self.addEventListener('notificationclick', (event) => {
  console.log('[FCM-SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

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
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// تثبيت وتفعيل
self.addEventListener('install', () => {
  console.log('[FCM-SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[FCM-SW] Activated');
  event.waitUntil(clients.claim());
});
