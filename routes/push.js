import express from "express";
import webpush from "web-push";
import { supabase } from "../supabase.js";

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

router.post("/push/unsubscribe", async (rq, res) => {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ message: "endpoint required" });
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) return res.status(500).json({ message: "unsubscripbe failed", error });
});

async function sendToRows(rows, payload) {
    console.log("push rows:", rows?.length);
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


export async function sendToOwner(username, payload) {
    const { data } = await supabase.from("push_subscriptions").select("*").eq("username", username);
    await sendToRows(data, payload);
}

export async function sendToAuthId(authId, payload) {
    if (!authId) return;
    const { data } = await supabase.from("push_subscriptions").select("*").eq("auth_id", authId);
    await sendToRows(data, payload);
}

export default router;