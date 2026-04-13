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
  const mediaKeys = post.attachments?.media_key || [];

 const images = mediaKeys
  .map((key) => mediaMap.get(key))
  .filter(Boolean)
  .filter((media) => media.type === "photo" && media.url)
  .map((media) => media.url);

 return {
  id: post.id,
  tex: post.text || "",
  images,
  postUrl: username
    ? `https://x.com/${username}/status/${post.id}`
    : `https//x.com/i/web/status/${post.id}`,
  };
 });
}

function buildHashtagGroups(rawPosts) {
 const hashtagMap = {};

 rawPosts.forEach((post) => {
  const matches = post.text.match(/#([A-Za-z0-9가-힣_]+)/g) || [];

    matches.forEach((tag) => {
      const cleanTag = tag.replace("#","");

      if (!hashtagMap[cleanTag]) {
        hashtagMap[cleanTag] = {
          hashtag: cleanTag,
          coung: 0,
          images: [],
          postUrls: [],
        };
      }

      hashtag.Map[cleanTag].count += 1;

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


router.get("/hashtags", (req,res) => {
 try {
  const ownerId = req.query.ownerId || "";
  const username = req.query.username || "";

//   const accessToken = "유저 access token";
//   const userId = ownerId;

//   const xRes = await fetch(
// `https://api.x.com/2/users/${userId}/tweets?max_results=20&expansions=attachments.media_keys&tweet.fields=
// attachments,text&media.fields=uri,type",
//   {
//     headers: {
//       Authorization: `Bearer ${accessToken}`,
//     },
//   }
//  );

//  const xJson = await xRes.json();

//  const raqPosts = mapXPostsToRawPosts(
//   xJson.data,
//   xJson.includes,
//   username
//  );

  const mockXResponse = {
    data: [
      {
      id: "1001",
      text: "오늘의 다꾸 #날이_좋은_날 #루틴",
      attachments: { media_keys: ["3_aaa","3_bbb"] },
      },
      {
      id: "1002",
      text: "공부 끝 #공부기록 #루틴",
      attachments: { media_keys: ["3_ccc"] },
      },
      {id: "1003",
      text: "정리중 #공부기록",
      attachments: { media_keys: ["3_add", "3_eee"] },
      },
    ],
    includes: {
      media: [
        {media_key: "3_aaa", type: "photo", url: "/images/sample1.jpg"},
        {media_key: "3_bbb", type: "photo", url: "/images/sample2.jpg"},
        {media_key: "3_ccc", type: "photo", url: "/images/sample3.jpg"},
        {media_key: "3_ddd", type: "photo", url: "/images/sample4.jpg"},
        {media_key: "3_eee", type: "photo", url: "/images/sample5.jpg"},
      ],
    },
  };


 const rawPosts = mapXPostsToRawPosts(
  mockXResponse.data,
  mockXResponse.includes,
  username
 );

 const groupedHashtags = buildHashtagGroups(rawPosts);

  return res.json({
    ownerId,
    username,
    rawPostCount: rawPosts.length,
    hashtags: groupedHashtags,
  });
 } catch (error) {
  console.error("archive hashtags error:", error);
  return res.status(500).json({ message: "archive hashtags error" });
 }
});


export default router;