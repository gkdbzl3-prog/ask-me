import express from "express";
import {
  loadArchivePosts,
  saveArchivePosts,
  mergeArchivePosts,
} from ".../data/archiveStore.js";

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

    matches.forEach((tag) => {
      const cleanTag = tag.replace("#","");

      if (!hashtagMap[cleanTag]) {
        hashtagMap[cleanTag] = {
          hashtag: cleanTag,
          count: 0,
          images: [],
          postUrls: [],
        };
      }

      hashtagMap[cleanTag].count += 1;

      if (Array.isArray(post.images)) {
        hashtagMap[cleanTag].images.push(...post.images);
      }

      if (post.postUrl) {
        hashtagMap[cleanTag].postUrls.push(post.postUrl);
      }
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

    if (!ownerId || !username) {
      return res.status(400).json({
        message: "ownerId 또는 username 없음",
      });
    }
 
    const rawPosts = loadArchivePosts();
    const groupedHashtags = buildHashtagGroups(rawPosts);

    return res.json({
      ownerId,
      username,
      source: "db",
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

  if (!ownerId || !username) {
    return res.status(400).json({
      message: "ownerId 또는 username 없음",
    });
  }

  if (!accessToken) {
    return res.status(401).json({
      message: "X access token 없음",
    });
  }

  let rawPosts = [];

  const xRes = await fetch(
    `https://api.x.com/2/users/${ownerId}/tweets?max_results=100&expansions=attachments.media_keys&tweet.fields=attachments,text&media.fields=url,type`,
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

  rawPosts = mapXPostsToRawPosts(
    xJson.data,
    xJson.includes,
    username
  );
  

  const archivePosts = rawPosts.filter((post) => {
    const hasImages = Array.isArray(post.images) && post.images.length > 0;
    const hasHashtags = /#([A-Za-z0-9가-힣_]+)/g.test(post.text || "");

    return hasImages && hasHashtags;
  });
    
    const oldPosts = loadArchivePosts();
    const mergedPosts = mergeArchivePosts(oldPosts, archivePosts);

    saveArchivePosts(mergedPosts);

    const groupedHashtags = buildHashtagGroups(mergedPosts);

  console.log(
    "sync archivePosts:",
    archivePosts.map((post) => ({
      id: post.id,
      text: post.text,
      imageCount: post.images.length,
      images: post.images,
    }))
  );
  

  const groupedHshtags = buildHashtagGroups(archivePosts);

  return res.json({
    ok: true,
    source: "x",
    ownerId,
    username,
    fetchedCount: rawPosts.length,
    savedCandidateCount: archivePosts.length,
    totalSavedCount: mergedPosts.length,
    hashtags: groupedHshtags,
  });

} catch (error) {
  console.error("archive sync error:", error);
  
  return res.status(500).json({
    message: "archive sync error",
    error: String(error),
  });
}
});
  




export default router;