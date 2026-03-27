const CACHE_NAME = "otec-v2";
const PRECACHE_URLS = ["/", "/logo-intranet.webp", "/logo-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = { title: "Mi OTEC", body: "Tienes una nueva notificación." };
  try { data = event.data.json(); } catch { data.body = event.data.text(); }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Mi OTEC", {
      body: data.body,
      icon: "/logo-icon.svg",
      badge: "/logo-icon.svg",
      tag: "otec-notif",
      renotify: true,
      data: { url: data.url ?? "/alumno/notificaciones" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/alumno/notificaciones";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
