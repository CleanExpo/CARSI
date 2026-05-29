// CARSI LMS Service Worker — PWA + Push Notifications
const CACHE_NAME = 'carsi-v2';

// Install — cache critical shell assets (valid routes only)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/courses', '/dashboard/student']),
    ),
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

// Fetch — do not intercept document navigations (avoids broken HTML streams in dev)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});

// Push — show notification
self.addEventListener('push', (event) => {
  let data = {
    title: 'CARSI',
    body: 'You have a new notification.',
    url: '/dashboard/student',
  };
  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch (_) {
      /* ignore */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url },
      tag: 'carsi-notification',
      renotify: true,
    }),
  );
});

// Notification click — open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification.data?.url ?? '/dashboard/student';
  const url = raw === '/student' || raw.startsWith('/student/') ? `/dashboard${raw}` : raw;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
