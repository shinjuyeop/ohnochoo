function navigateClient(client, targetUrl) {
  return new Promise((resolve) => {
    try {
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(false), 250);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        resolve(Boolean(event.data?.ok));
      };
      client.postMessage({ type: "ohnochoo:navigate", url: targetUrl }, [channel.port2]);
    } catch {
      resolve(false);
    }
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "오노추",
    body: "확인할 알림이 있어요.",
    url: "/",
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "오노추", {
      body: data.body || "확인할 알림이 있어요.",
      icon: "/assets/icons/icon-192-inverted-20261103.png",
      badge: "/assets/icons/icon-192-inverted-20261103.png",
      data: {
        url: data.url || "/",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let targetUrl = new URL("/", self.location.origin).href;
  try {
    const requested = new URL(event.notification.data?.url || "/", self.location.origin);
    if (requested.origin === self.location.origin) targetUrl = requested.href;
  } catch { /* Use home for malformed links. */ }

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          const handled = await navigateClient(client, targetUrl);
          if (!handled && "navigate" in client) {
            try { await client.navigate(targetUrl); } catch { /* Fall back if uncontrolled. */ }
          }
          try {
            return await client.focus();
          } catch { /* Fall through if focusing fails. */ }
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })(),
  );
});

self.addEventListener("fetch", () => {
  // Network-first by default. This service worker exists as the PWA base.
});
