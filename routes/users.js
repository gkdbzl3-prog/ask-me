import express from "express";
import { supabase } from "../supabase.js";

const router = express.Router();

router.get("/users/:username", async (req, res) => {
 try {
    const { username } = req.params;

    const { data, error } = await supabase
     .from("users")
     .select("*")
     .eq("username", username)
     .single();

    if (error) {
     return res.status(404).json({ message: "user not found", error });
    }

    return res.json(data);
 } catch (error) {
    console.error("GET /users/:username error:", error);
    return res.status(500).json({ message: "server error"});
 }
});

router.get("/users/:username/questions", async (req, res) => {

 try {
    const { username } = req.params;

    const { data: user, error: userError } = await supabase
     .from("users")
     .select("id")
     .eq("username", username)
     .single();

    if (userError || !user) {
     return res.status(404).json({ message: "user not found" });
    }

    const { data: questions, error: questionError } = await supabase
     .from("questions")
     .select("*")
     .eq("user_id", user.id)
     .order("created_at", { ascending: false });

    if (questionError) {
     return res.status(500).json({ message: "question load failed", error: questionError });
    }

   return res.json(
    questions.map((q) => ({
     id: q.id,
     text: q.text,
     isPrivate: q.is_private,
     fileUrl: q.file_url,
     fileName: q.file_name,
     answer: q.answer,
     answerFileUrl: q.answer_file_url,
     answerFileName: q.answer_file_name,
     answered: q.answered,
     likeCount: q.like_count,
     createdAtISO: q.created_at,
     answeredAtISO: q.answered_at,
    }))
   );
 } catch (error) {
    console.error("GET /users/:username/questions error:", error);
    return res.status(500).json({ message: "server error"});
 }
});

export default router;