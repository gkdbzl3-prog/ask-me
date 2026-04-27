import express from "express";
import {
  loadArchivePosts,
  saveArchivePosts,
  updateArchivePostVisibility,
} from "../data/archiveStore.js";

const router = express.Router();

function mapXPostsToRawPosts(xData,xIncludes, username = "") {
  const mediaMap = new Map();

  if (Array.isArray(xIncludes?.media)) {
    for (const media of xIncludes.media) {
      mediaMap.set(media.media_key, media);
    }
  }

 const posts = Array.isArray(xData) ? xData : [];

 return posts.map((post) => {
  const mediaKeys = post.attachments?.media_keys || [];

 const images = mediaKeys
  .map((key) => mediaMap.get(key))
  .filter(Boolean)
  .filter((media) => media.type === "photo" && media.url)
  .map((media) => media.url);

 return {
  id: post.id,
  text: post.text || "",
  images: [...new Set(images)].slice(0,8),
  postUrl: username
    ? `https://x.com/${username}/status/${post.id}`
    : `https://x.com/i/web/status/${post.id}`,
  };
 });
}

function buildHashtagGroups(rawPosts) {
 const hashtagMap = {};

  rawPosts.forEach((post) => {
    const text = post?.text || "";
    const matches = text.match(/#([A-Za-z0-9가-힣_]+)/g) || [];
    const hasImages = Array.isArray(post.images) && post.images.length > 0;
    if (!hasImages || matches.length === 0) return;

    matches.forEach((tag) => {
      const cleanTag = tag.replace("#", "");

      if (!hashtagMap[cleanTag]) {
        hashtagMap[cleanTag] = {
          hashtag: cleanTag,
          count: 0,
          images: [],
          postUrls: [],
          posts: [],
        };
      }

      hashtagMap[cleanTag].count += 1;
      hashtagMap[cleanTag].images.push(...post.images);


      if (post.postUrl) {
        hashtagMap[cleanTag].postUrls.push(post.postUrl);
      }

      hashtagMap[cleanTag].posts.push({
        id: post.id,
        text: post.text || "",
        images: post.images || [],
        postUrl: post.postUrl || "#",
        hidden: post.hidden === true,
      });
    });
  });

  return Object.values(hashtagMap)
    .map((item) => ({
    ...item,
    images: item.images.slice(0, 8),
    postUrls: item.postUrls.slice(0, 8),
    }))
    .sort((a, b) => b.count - a.count);
}



router.get("/hashtags", async (req, res) => {
  try {
    const ownerId = req.query.ownerId || "";
    const username = req.query.username || "";
    const includeHidden = req.query.includeHidden === "true";

    if (!ownerId || !username) {
      return res.status(400).json({
        message: "ownerId 또는 username 없음",
      });
    }
 
    const rawPosts = await loadArchivePosts(ownerId, includeHidden);
    const groupedHashtags = buildHashtagGroups(rawPosts);

    return res.json({
      ownerId,
      username,
      source: "supabase",
      rawPostCount: rawPosts.length,
      hashtags: groupedHashtags,
    });

  } catch (error) {
    console.error("archive hashtags error:", error);

    return res.status(500).json({
      message: "archive hashtags error",
      error: String(error),
    });
  }
});

router.post("/sync", async (req, res) => {
  
  try {
    const ownerId = req.query.ownerId || req.body.ownerId || "";
    const username = req.query.username || req.body.username || "";
    const accessToken = req.cookies.x_access_token;
    const refreshToken = req.cookies.x_refresh_token;

  if (!ownerId || !username) {
    return res.status(400).json({
      message: "ownerId 또는 username 없음",
    });
    }
    
    if (!accessToken && refreshToken) {
      accessToken = await refreshXAccessToken(refreshToken, res);
    }
  

  if (!accessToken) {
    return res.status(401).json({
      message: "X access token 없음",
    });
  }

    let rawPosts = [];    
    let allRawPosts = [];
    let paginationToken = null;
    let page = 0;
    const maxPages = 32;



    do {
      const params = new URLSearchParams({
        max_results: "100",
        exclude: "retweets.replies",
        expansions: "attachments.media_keys",
        "tweet.fields": "attachments,text,created_at",
        "media.fields": "url,type",
      });

      if (paginationToken) {
        params.set("pagination_token", paginationToken);
      }

      const xRes = await fetch(
      `https://api.x.com/2/users/${ownerId}/tweets?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
  

      console.log("sync xRes.ok:", xRes.ok, "status:", xRes.status);

      const xJson = await xRes.json();
      console.log("sync xJson:", JSON.stringify(xJson, null, 2));


      if (!xRes.ok) {
        return res.status(xRes.status).json({
          message: "X API sync 실패",
          error: xJson,
        });
      }

      allRawPosts.push(
        ...mapXPostsToRawPosts(xJson.data, xJson.includes, username)
      );
    
      paginationToken = xJson.meta?.next_token || null;
      page += 1;
    } while (paginationToken && page < maxPages);

    rawPosts = allRawPosts;
    
    const hashtagPosts = rawPosts.filter((post) =>
      /#([A-Za-z09가-힣_]+)/g.test(post.text || "")
    );
    
    const imagePosts = rawPosts.filter(
      (post) => Array.isArray(post.images) && post.images.length > 0
    );
  

    const archivePosts = rawPosts.filter((post) => {
      const text = post.text || "";

    const hasImages = Array.isArray(post.images) && post.images.length > 0;
      const hasHashtags = /#([A-Za-z0-9가-힣_]+)/g.test(text);

      const isRetweet = text.startsWith("RT @");
      const isReply = text.startsWith("@");

      return hasImages && hasHashtags && !isRetweet && !isReply;
  });
    
    const oldPosts = loadArchivePosts();

  
    const savedRows = await saveArchivePosts(ownerId, username, archivePosts);
    const rawPostsFromDb = await loadArchivePosts(ownerId, true);
    const groupedHashtags = buildHashtagGroups(rawPostsFromDb);

  return res.json({
    ok: true,
    source: "x",
    ownerId,
    username,
    fetchedCount: rawPosts.length,
    hashtagPostCount: hashtagPosts.length,
    imagePostCount: imagePosts.length,
    savedCandidateCount: archivePosts.length,
    totalSavedCount: rawPostsFromDb.length,
    savedRowsCount: savedRows.length,
    hashtags: groupedHashtags,
  });
console.log("sync page:", page + 1, "ok:", xRes.ok, "status:", xRes.status);
} catch (error) {
  console.error("archive sync error:", error);
  
  return res.status(500).json({
    message: "archive sync error",
    error: String(error),
  });
}
});
  
router.patch("/posts/:postId/visibility", async (req, res) => {
  try {
    const { postId } = req.params;
    const hidden = req.body.hidden === true;
    const ownerId = req.query.ownerId || "";
    const username = req.query.username || "";
    const includeHidden = req.query.includeHidden === "true";

    if (!ownerId || !username) {
      return res.status(400).json({
        message: "ownerId 또는 username 없음",
      });
    }

    const updatedPost = await updateArchivePostVisibility(postId, hidden);
    const postsForResponse = await loadArchivePosts(ownerId, includeHidden);
    const groupedHashtags = buildHashtagGroups(postsForResponse);

    return res.json({
      ok: true,
      postId,
      hidden,
      updatedPost,
      rawPostCount: postsForResponse.length,
      hashtags: groupedHashtags,
    });
  } catch (error) {
    console.error("archive visibility error:", error);

    return res.status(500).json({
      message: "archive visibility error",
      error: String(error),
    });
  }
});

async function refreshXAccessToken(refreshToken, res) {
  const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-wwww-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh-token",
      refresh_token: refreshToken,
      client_id: process.env.X_CLIENT_ID,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    console.log("X refresh 실패:", toeknData);
    return null;
  }

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("x_access_token", tokenData.access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: tokenData.expires_in * 1000,
  });

  if (tokenData.refresh_token) {
    res.cookie("x_refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  res.cookie(
    "x_token_expires_at",
    String(Date.now() + tokenData.expires_in * 1000),
    {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: tokenData.expires_in * 1000,
    }
  );

  return tokenData.access_token;
}


export default router;