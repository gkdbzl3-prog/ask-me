import express from "express";

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
    const accessToken = req.cookies.x_access_token;

    if (!ownerId || !username) {
      return res.status(400).json({
        message: "ownerId 또는 username 없음",
      });
    }
 
    let rawPosts = [];
    let source = "mock";

    if (accessToken) {
      const xRes = await fetch(
        `https://api.x.com/2/users/${ownerId}/tweets?max_results=20&expansions=attachments.media_keys&tweet.fields=attachments,text&media.fields=url,type`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

 

      console.log("xRes.ok:", xRes.ok, "status:", xRes.status);

      const xJson = await xRes.json();
      console.log("xJson:", JSON.stringify(xJson, null, 2));


      if (xRes.ok) {
        rawPosts = mapXPostsToRawPosts(
          xJson.data,
          xJson.includes,
          username
        );
        source = "x";
      } else {
        console.log("X API 실패, mock fallback 사용");
        console.log("X API error payload:", xJson);
      }

      if (rawPosts.length === 0) {
        rawPosts = [
          {
            id: "1001",
            text: "오늘의 다꾸 #날이_좋은_날 #루틴",
            images: ["/images/sample1.jpg", "/images/sample2.jpg"],
            postUrl: "#",
          },
          {
            id: "1002",
            text: "공부끝 #공부기록 #루틴",
            images: ["/images/sample3.jpg"],
            postUrl: "#",
          },
          {
            id: "1003",
            text: "정리중 #공부기록",
            images: ["/images/sample4.jpg", "/images/sample5.jpg"],
            postUrl: "#",
          },
        ];
        source = "mock";
      }

      const groupedHashtags = buildHashtagGroups(rawPosts);

      return res.json({
        ownerId,
        username,
        source,
        rawPostCount: rawPosts.length,
        hashtags: groupedHashtags,
      });
      console.log("archive ownerId:", ownerId);
      console.log("archive username:", username);
      console.log("has accessToken:", !!accessToken);
    } catch (error) {
      console.error("archive hashtags error:", error);
      return res.status(500).json({ message: "archive hashtags error", error: String(error), });
    }
  }};




export default router;