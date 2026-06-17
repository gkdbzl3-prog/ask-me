import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf8");
if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(json)) });
}
export const messaging = getMessaging();
