self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'BloodLink alert';
  const options = {
    body: payload.body || 'A new blood request needs attention.',
    icon: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: payload.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find((client) => client.url.startsWith(self.location.origin));

      if (existingClient) {
        existingClient.focus();
        return existingClient.navigate(targetUrl);
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
