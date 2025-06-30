self.addEventListener('push', (event) => {
  const payload = event.data?.json() || {
    title: 'New Message',
    body: 'You have a notification',
    icon: '/icons/icon-192x192.png',
    data: { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      image: payload.image,
      data: payload.data,
      vibrate: [200, 100, 200],
      badge: '/icons/badge.png'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});