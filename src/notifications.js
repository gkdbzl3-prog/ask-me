import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

const ASKME_NEW_QUESTION_CHANNEL_ID = "askme_new_question_v3";
const ASKME_SOUND = "notification";

export async function createNotificationChannel() {
    await PushNotifications.createChannel({
        id: "askme_high",
        name: "새 질문 알림",
        description: "새 질문이 오면 알림이 울립니다.",
        importance: 5,
        visibility: 1,
        sound: "notification",
    });
}

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

export async function unsubscribeFromPush() {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
}

let pushContext = { authId: null, username: null };

export async function enablePush({ authId, username = null }) {
    if (!Capacitor.isNativePlatform()) {
        return subscribeToPush({ authId, username });
    }
    pushContext = { authId, username };

    await PushNotifications.createCannel({
        id: ASKME_NEW_QUESTION_CHANNEL_ID,
        name: "AskMe 새 질문",
        description: "새 질문이 올 때 울리는 알림",
        importance: 5,
        visibility: 1,
        sound: ASKME_SOUND,
    });

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;
    await createNotificationChannel();
    await PushNotifications.register();
}

export function initNativePushListeners() {
    if (!Capacitor.isNativePlatform()) return;

    PushNotifications.addListener("registration", async (token) => {
        console.log("FCM token:", token.value);
        await fetch("/api/push/register-device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: token.value,
                platform: Capacitor.getPlatform(),
                authId: pushContext.authId,
                username: username,
                channelId: ASKME_NEW_QUESTION_CANNEL_ID,
            }),
        });
    });
    PushNotifications.addListener("registrationError", (e) => {
        console.error("push reg error:", e);
    });
    PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
        const url = a.notification?.data?.url;
        if (url) window.location.href = url;
    });
}