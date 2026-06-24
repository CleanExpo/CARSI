// CARSI LMS Service Worker — PWA + Push Notifications
const CACHE_NAME = 'carsi-v3';

function shouldBypassFetch(url) {
  return (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next')
  );
}

// Install — cache critical shell assets (valid routes only)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        ['/', '/courses', '/dashboard/student'].map((url) =>
          cache.add(url).catch((e) => console.warn('[sw] precache skip', url, e)),
        ),
      ),
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

// Fetch — do not intercept admin/API/RSC or document navigations
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypassFetch(url)) return;

  event.respondWith(
    (async () => {
      try {
        return await fetch(event.request);
      } catch (err) {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        console.warn('[sw] network error, no cache', event.request.url, err);
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })(),
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
