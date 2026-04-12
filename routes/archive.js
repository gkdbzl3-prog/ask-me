import express from "express";

const router = express.Router();

router.get("/posts", (req,res) => {
 const ownerId = req.query.ownerId || "";
 const tag = req.query.tag || "";

 const posts = [
   {
   id: "post_1",
   hashtag: tag,
   images: [
        "/images/sample1.jpg",
        "/images/sample2.jpg",
        "/images/sample3.jpg",
      ],
      postUrl: "#",
      createdAt: "2026-04-12T12:00:00.000Z",
    },
    {
      id: "post_2",
      hashtag: tag,
      images: [
        "/images/sample4.jpg",
        "/images/sample5.jpg",
      ],
      postUrl: "#",
      createdAt: "2026-04-10T12:00:00.000Z",
    },
  ];

 res.json(posts);
});


export default router;