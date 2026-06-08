webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)

router.post("/push/subscribe", ...)
export async function sendToOwner(username, payload) {... }
export async function sendToAuthId(authId, payload) {... }