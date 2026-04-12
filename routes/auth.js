import express from "express";

const router = express.Router();

router.get("/x/login", (req,res) => {
 const mockUsername = "idmulluhaeyadae";
 res.redirect(`/auth/x/callback?username=${encodeURIComponent(mockUsername)}`);
});

router.get("/x/callback", (req,res) => {
 const username = req.query.username || "";

 res.send(`
  <!doctype html>
  <himl lang="ko">
   <head>
    <meta charset="UTF-8" />
    <title>X Auth Callback</title>
   </head>
   <body>
    <script>
    localStorage.setItem("isXConnected", "true");
    localStorage.setItem("connectedXId", ${JSON.stringify(username)});
    localStorage.setItem("twitterId", ${JSON.stringify(username)});
    window.location.href = "http://localhost:5173";
    </script>
   </body>
  </html>
 `);
});

export default router;