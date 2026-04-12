import express from "express";

const router = express.Router();

router.get("/x/login", (req,res) => {
 const clientId = process.env.X_CLIENT_ID;
 const redirectUri = process.env.X_REDIRECT_URL;
 const state = crypto.randomBytes(16).toString("hex")

 const scope = ["tweet.read", "users.read"].join(" ");
 const authUrl =
  `https://twitter.com/i/oauth2/authorize` +
  `?response_type=code` +
  `&client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&scope=${encodeURIComponent(scope)}` +
  `&state=${encodeURIComponent(state)}` +
  `&code_challenge=challenge` +
  `&code_challenge_method=plain`;

 res.redirect(authUrl);
});

router.get("/x/callback", async (req,res) => {
 const code = req.query.code;
 const clientId = process.env.X_CLIENT_ID;
 const clientSecret = process.env.X_CLIENT_SECRET;
 const redirectUri = process.env.X_REDIRECT_URL;

 if(!code) {
 return res.status(400).send("code 없음");
 }

 res.send(`callback 도착, code: ${code}`);
});

export default router;