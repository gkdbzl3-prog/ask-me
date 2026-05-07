import express from "express";
import {
  loadArchivePosts,
  saveArchivePosts,
  updateArchivePostVisibility,
} from "../data/archiveStore.js";

const router = express.Router();

function mapXPostsToRawPosts(xData, xIncludes, username = "") {
  const mediaMap = new Map();

  if (Array.isArray(xIncludes?.media)) {
    for (const media of xIncludes.media) {
      mediaMap.set(media.media_key, media);
    }
  }

  const posts = Array.isArray(xData) ? xData : [];

  return posts.map((post) => {
    const mediaKeys = post.attachments?.media_keys || [];

    const mediaItems = mediaKeys
      .map((key) => mediaMap.get(key))
      .filter(Boolean)
      .map((media) => {
        if (media.type === "photo") {
          return {
            type: "photo",
            url: media.url,
            previewUrl: media.url,
          };
        }

        if (media.type === "video" || media.type === "animated_gif") {
          const mp4 = media.variants
            ?.filter((v) => v.content_type === "video/mp4" && v.url)
            ?.sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))[0];

          return {
            type: media.type,
            url: mp4?.url || "",
            previewUrl: media.preview_image_url || "",
          };
        }

        return null;
      })
      .filter(Boolean)
      .filter((item) => item.url || item.previewUrl);

    return {
      id: post.id,
      text: post.text || "",
      media: mediaItems.slice(0, 8),
      images: mediaItems
        .filter((item) => item.type === "photo")
        .map((item) => item.url)
        .slice(0, 8),
      postUrl: username
        ? `https://x.com/${username}/status/${post.id}`
        : `https://x.com/i/web/status/${post.id}`,
      createdAt: post.created_at || null,
    };
  });
}


function buildHashtagGroups(rawPosts) {
  const hashtagMap = {};

  rawPosts.forEach((post) => {
    const text = post?.text || "";
    const matches = text.match(/#([A-Za-z0-9가-힣_]+)/g) || [];

    const media = post.media?.length
      ? post.media
      : (post.images || []).map((url) => ({
        type: "photo",
        url,
        previewUrl: url,
      }));

    const hasMedia = Array.isArray(media) && media.length > 0;

    if (!hasMedia || matches.length === 0) return;

    matches.forEach((tag) => {
      const cleanTag = tag.replace("#", "");

      if (!hashtagMap[cleanTag]) {
        hashtagMap[cleanTag] = {
          hashtag: cleanTag,
          count: 0,
          images: [],
          media: [],
          postUrls: [],
          posts: [],
        };
      }

      hashtagMap[cleanTag].count += 1;
      hashtagMap[cleanTag].media.push(...media);
      hashtagMap[cleanTag].images.push(
        ...media
          .filter((item) => item.type === "photo")
          .map((item) => item.url)
      );


      if (post.postUrl) {
        hashtagMap[cleanTag].postUrls.push(post.postUrl);
      }

      hashtagMap[cleanTag].posts.push({
        id: post.id,
        text: post.text || "",
        media,
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
      media: item.media.slice(0, 8),
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
  console.log("archive sync cookie names:", Object.keys(req.cookies || {}));
  console.log("archive sync has cookie header:", !!req.headers.cookie);

  try {
    const ownerId = req.query.ownerId || req.body.ownerId || "";
    const username = req.query.username || req.body.username || "";
    let accessToken = req.cookies.x_access_token;
    const refreshToken = req.cookies.x_refresh_token;

    console.log("has accessToken:", !!accessToken);
    console.log("has refreshToken:", !!refreshToken);

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
    let rateLimit = null;
    const maxPages = 32;



    do {
      rateLimit = {
        limit: xRes.headers.get("x-rate-limit-limit"),
        remaining: xRes.headers.get("x-rate-limit-remaining"),
        reset: xRes.headers.get("x-rate-limit-reset"),
      };

      const params = new URLSearchParams({
        max_results: "100",
        exclude: "retweets,replies",
        expansions: "attachments.media_keys",
        "tweet.fields": "attachments,text,created_at",
        "media.fields": "url,type,preview_image_url,variants,duration_ms,width,height",
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



      console.log("X rate limit:", rateLimit);

      if (xRes.status === 429) {
        return res.status(429).json({
          message: "X API rate limit 초과",
          rateLimit,
        });
      }


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

      const hasMedia =
        Array.isArray(post.media) && post.media.length > 0;

      const hasHashtags = /#([A-Za-z0-9가-힣_]+)/g.test(text);

      const isRetweet = text.startsWith("RT @");
      const isReply = text.startsWith("@");

      return hasMedia && hasHashtags && !isRetweet && !isReply;
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
      rateLimit,
    });
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
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh-token",
      refresh_token: refreshToken,
      client_id: process.env.X_CLIENT_ID,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    console.log("X refresh 실패:", tokenData);
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