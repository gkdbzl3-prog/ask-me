import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

precacheAndRoute(self.__WB_MANIFEST);

// /api, /archive는 캐시하지 않는다. 예전에는 NetworkFirst로 24시간 담아뒀는데,
// 질문을 지운 직후의 목록 재조회가 캐시에서 올 수 있었다 — 서버에서는 지워졌는데
// 화면에는 그대로 남아, 누른 사람 눈에는 "아무 일도 안 일어난" 것처럼 보였다.
// 앱 껍데기(정적 파일)는 precache가 맡으므로 오프라인에서도 화면은 뜬다.
registerRoute(
    ({ url }) => url.pathname.startsWith("/api") || url.pathname.startsWith("/archive"),
    new NetworkOnly()
);

// 새 워커가 바로 일을 맡는다. 예전에는 열린 탭을 다 닫을 때까지 옛 워커가
// 살아 있어서, 캐시 규칙을 바꿔도 쓰던 사람에게는 한참 동안 옛 규칙이 돌았다.
// 넘어오는 길에 옛 NetworkFirst가 담아둔 /api 응답도 버린다.
self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            await caches.delete("api-cache");
            await self.clients.claim();
        })()
    );
});

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