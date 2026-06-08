import { precacheAndRoute } from "workbox-precaching";
import { registerUroute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } rom "workbox-expiration";

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
    ({ url }) => url.pathname.startsWith("/api") || url.pathname.startsWith("/archive"),
    new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 5,
        pluugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 })],
    })
);

registerRoute(
    ({ url }) => url.hostname.includes("supabase"),
    new CacheFirst({
        cacheName: "supabase-images",
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
    })
);

self.addEventListener("push", (event) => {
    const data = event.data?.json() ?? {};
    event.waitUntil(
        self.registration.showNotification(data.title || "Ask me", {
            body: data.body || "",
            icon: "/images/icon-192.png",
            badge: "/images/icon-192.png",
            data: { url: data.url || "/" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || "/";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
            for (const win of wins) {
                if (win.url.includes(targetUrl) && "focus" in win) return win.focus();
            }
            return clients.openWindow(targetUrl);
        })
    );
});