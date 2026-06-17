import admin from "firebase-admin";
const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf8");
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.cert(JSON.parse(json)) });
}
export const messaging = admin.messaging();