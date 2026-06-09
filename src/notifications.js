
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map((e) => e.charCodeAt(0)));
}

export async function subscribeToPush({ authId, username = null }) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("이 브라우저는 푸시 미지원");
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const reg = await navigator.serviceWorker.ready;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
        subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
                import.meta.env.VITE_VAPID_PUBLIC_KEY
            ),
        });
    }

    await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, authId, username }),
    });
}