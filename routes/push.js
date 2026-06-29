import express from "express";
import webpush from "web-push";
import { supabase } from "../supabase.js";
import { messaging } from "./firebase.js";

const router = express.Router();

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY)

router.post("/push/subscribe", async (req, res) => {
    const { subscription, authId, username = null } = req.body || {};
    if (!subscription?.endpoint) {
        return res.status(400).json({ message: "invalid subscription" });
    }
    const { error } = await supabase.from("push_subscriptions").upsert(
        {
            endpoint: subscription.endpoint,
            p256dh: subscription.keys?.p256dh || "",
            auth: subscription.keys?.auth || "",
            auth_id: authId || "",
            username: username || null,
        },
        { onConflict: "endpoint" }
    );
    if (error) return res.status(500).json({ message: "subscribe failed", error });
    return res.json({ ok: true });
});

router.post("/push/unsubscribe", async (req, res) => {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ message: "endpoint required" });
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) return res.status(500).json({ message: "unsubscripbe failed", error });
    return res.json({ ok: true });
});

router.post("/push/register-device", async (req, res) => {
    const { token, platform = null, authId = null, username = null } = req.body || {};
    if (!token) return res.status(400).json({ message: "token required" });
    const { error } = await supabase.from("device_tokens").upsert(
        { token, platform, auth_id: authId, username },
        { onConflict: "token" }
    );
    if (error) return res.status(500).json({ message: "register failed", error });
    return res.json({ ok: true });
});

async function sendToRows(rows, payload) {

    await Promise.all(
        (rows || []).map(async (row) => {
            const sub = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
            try {
                await webpush.sendNotification(sub, JSON.stringify(payload));
            } catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
                } else {
                    console.error("push send error:", err.statusCode);
                }
            }
        })
    );
}

async function sendFcm(tokens, payload) {
    if (!tokens?.length) return;
    const r = await messaging.sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        android: {
            priority: "high",
            notification: {
                channelId: "askme_high",
                priority: "high",
                sound: "알림",
            },
        },
        data: { url: payload.url || "/" },
    });
    r.responses.forEach((resp, i) => {
        if (!resp.success) {
            const code = resp.error?.code || "";
            if (code.includes("not-registered") || code.includes("invalid-argument")) {
                supabase.from("device_tokens").delete().eq("token", tokens[i]); // 죽은 토큰 정리
            }
        }
    });
}

export async function sendToOwner(username, payload) {
    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("username", username);
    await sendToRows(subs, payload);                          // 웹
    const { data: devs } = await supabase.from("device_tokens").select("token").eq("username", username);
    await sendFcm((devs || []).map(d => d.token), payload);   // 앱(FCM)
}

export async function sendToAuthId(authId, payload) {
    if (!authId) return;
    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("auth_id", authId);
    await sendToRows(subs, payload);
    const { data: devs } = await supabase.from("device_tokens").select("token").eq("auth_id", authId);
    await sendFcm((devs || []).map(d => d.token), payload);
}

export default router;