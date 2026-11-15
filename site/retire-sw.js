// One-time retirement of the original blog worker. Only its known cache
// namespace is removed; /magic/ uses a distinct calcdm: namespace.
self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith("main-") ||
              ["precache-v1", "runtime"].includes(name),
          )
          .map((name) => caches.delete(name)),
      );
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      await Promise.all(
        clients
          .filter((client) => new URL(client.url).pathname === "/")
          .map((client) => client.navigate(client.url)),
      );
    })(),
  );
});
