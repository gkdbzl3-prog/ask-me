import express from "express";

const router = express.Router();

router.get("/hashtags", (req,res) => {
 const ownerId = req.query.ownerId || "";

 const rawPosts = [
   {
   id: "1",
   text: "오늘의 다꾸 #날이_좋은_날 #루틴",
   images: ["/images/sample1.jpg", "/images/sample2.jpg:"],
   postUrl: "#",
    },
    {
   id: "2",
   text: "공부 끝 #루틴 #공부기록",
   images: ["/images/sample3.jpg"],
   postUrl: "#",
    },
    {
   id: "3",
   text: "오늘은 열공함 #공부기록",
   images: ["/images/sample4.jpg","/images/sample5.jpg"],
   postUrl: "#",
    },  
  ];

 const hashtagMap = {};

 rawPosts.forEach((post) => {
  const matches = post.text.match(/#([A-Za-z0-9가-힣_]+)/g) || [];

 matches.forEach((tag) => {
  const cleanTag = tag.replace("#", "");

  if (!hashtagMap[cleanTag]) {
    hashtagMap[cleanTag] = {
      hashtag: cleanTag,
      count: 0,
      images: [],
      postUrls: [],
    };
 }

  hashtagMap[cleanTag].count += 1;
  hashtagMap[cleanTag].images.push(...post.images);
  hashtagMap[cleanTag].postUrls.push(post.postUrl);
  });
 });

 const groupedHashtags = Object.values(hashtagMap)
  .map((item) => ({
  ...item,
  images: item.images.slice(0,6),
  }))
  .sort((a,b) => b.count - a.count);


 res.json(groupedHashtags);
});


export default router;