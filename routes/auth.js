import express from "express";
import { randomBytes, createHash } from "crypto";

const router = express.Router();

const base64UrlEncode = (buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g,"-")
    .replace(/\//g,"_")
    .replace(/=+$/,"");

const createCodeVerifier = () => {
 return base64UrlEncode(randomBytes(32));
};

const createCodeChallenge = (verifier) => {
 return base64UrlEncode(
    createHash("sha256").update(verifier).digest()
 );
};

router.get("/x/login", (req,res) => {
 const clientId = process.env.X_CLIENT_ID;
 const redirectUri = process.env.X_REDIRECT_URI;

 const state = randomBytes(16).toString("hex");
 const codeVerifier = createCodeVerifier();
 const codeChallenge = createCodeChallenge(codeVerifier);

 res.cookie("x_oauth_state", state, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
 });

 res.cookie("x_code_verifier", codeVerifier, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
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
 try {
 console.log("=== X CALLBACK START ===");
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
 console.log("code:", req.query.code);
 console.log("state:", req.query.state);
 console.log("savedState:", req.cookies.x_oauth_state);
 console.log("codeVerifier:", req.cookies.x_code_verifier);
 const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
   method: "POST",
   headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
         "Basic " +
         Buffer.from(
            `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
         ).toString("base64"),
   },
   body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.X_REDIRECT_URI,
      code_verifier: codeVerifier,
   }),
 });

 const tokenData = await tokenRes.json();
 console.log("tokenData:", tokenData);

 if (!tokenData.access_token) {
   return res.status(400).send(
      `토큰 교환 실패: ${JSON.stringify(tokenData)}`
      );
 }

 const userRes = await fetch("https://api.x.com/2/users/me", {
   headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
   },
 });

 const userData = await userRes.json();
 console.log("userData:", userData);

 if(!userData?.data?.username) {
   return res.status(400).send(
      `유저 정보 조회 실패: ${JSON.stringify(userData)}`
   );
 }

 res.send(`
   <!doctype html>
   <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <title>X Auth Success</title>
    </head>
    <body>
      <script>
      localStorage.setItem("isXConnected", "true");
      localStorage.setItem("connectedXId", "${userData.data.username}");
      window.location.href = "https://ask-me.fly.dev";
      </script>
    </body>
   </html>`);
 } catch (error) {
   console.error("X callback error:", error);
   res.status(500).send("콜백 처리 중 오류 발생");
 }
});

export default router;

