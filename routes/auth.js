import express from "express";
import crpyto from "crypto";

const router = express.Router();

const base64UrlEncode = (buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g,"-")
    .replace(/\//g,"_")
    .replace(/=+$/,"");
const createCodeVerifier = () => {
 return base64UrlEncode(crypto.randomBytes(32));
};

const createCodeChallenge = (verifier) => {
 return base64UrlEncode(
    crypto.createHah("sha256").update(verifier).digest()
 );
};

router.get("/x/login", (req,res) => {
 const clientId = process.env.X_CLIENT_ID;
 const redirectUri = process.env.X_REDIRECT_URL;

 const state = base64UrlEncode(crypto.randomBytes(16));
 const codeVerifier = createCodeVerifier();
 const codeChallenge = createCodeChallenge(codeVerifier);

 res.cookie("x_oauth_state", state, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
 });

 const scope = ["tweet.read", "users.read"].join(" ");

 const authUrl =
  `https://twitter.com/i/oauth2/authorize` +
  `?response_type=code` +
  `&client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&scope=${encodeURIComponent(scope)}` +
  `&state=${encodeURIComponent(state)}` +
  `&code_challenge=${encodeURIComponent(codeChallenge)}` +
  `&code_challenge_method=S256`;

 res.redirect(authUrl);
});

router.get("/x/callback", async (req,res) => {
 const code = req.query.code;
 const state = req.query.state;

 const savedState = req.cookies.x_oauth_state;
 const codeVerifier = req.cookies.x_code_verifier;

 if (!code || !state) {
    return res.status(400).send("code 또는 state 없음");
 }

 if (!savedState || state !== savedState) {
    return res.status(400).send("state 불일치");
 }

 if (!codeVerifier) {
    return res.status(400).send("code_verifier 없음");
 }


 const clientId = process.env.X_CLIENT_ID;
 const clientSecret = process.env.X_CLIENT_SECRET;
 const redirectUri = process.env.X_REDIRECT_URL;


 res.send(`callback 도착, code: ${code}`);
});

export default router;