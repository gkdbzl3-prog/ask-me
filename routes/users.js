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

    return res.json({
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        bio: data.bio,
        avatarUrl: data.avatar_url,
        bgUrl: data.bg_url,
        xUserId: data.x_user_id,
        highlightId: data.highlight_question_id,
        createdAtISO: data.created_at,
        });

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

router.post("/users/:username/questions", async (req, res) => {
 console.log("POST /api/users/:username/questions hit");
 console.log("params:", req.params);
 console.log("body:", req.body);
 try {
    const { username } = req.params;
    const {
     text="",
     isPrivate = false,
     fileUrl = "",
     fileName = "",
    } = req.body || {};

    const trimmedText = String(text || "").trim();

    if (!trimmedText && !fileUrl) {
     return res.status(400).json({
        message: "텍스트 또는 이미지를 넣어주세요.",
     });
    }
    const { data: user, error: userError } = await supabase
     .from("users")
     .select("id")
     .eq("username", username)
     .single();

    if (userError || !user) {
     return res.status(404).json({ message: "user not found" });
    }

    const insertPayload = {
     user_id: user.id,
     text: trimmedText,
     is_private: !!isPrivate,
     file_url: fileUrl || "",
     file_name: fileName || "",
     answer: "",
     answer_file_url: "",
     answer_file_name: "",
     answered: false,
     like_count: 0,
    };
    console.log("insertPayload:", insertPayload);
    const { data: inserted, error: insertError } = await supabase
     .from("questions")
     .insert(insertPayload)
     .select("*")
     .single();
    console.log("inserted:", inserted);
    console.log("insertError:", insertError);
    if (insertError) {
    console.error("POST /users/:username/questions insert error:", insertError);
    return res.status(500).json({
        message: "question insert failed",
        error: insertError,
        });
    }

   return res.status(201).json({
    id: inserted.id,
    text: inserted.text,
    isPrivate: inserted.is_private,
    fileUrl: inserted.file_url,
    fileName: inserted.file_name,
    answer: inserted.answer,
    answerFileUrl: inserted.answer_file_url,
    answerFileName: inserted.answer_file_name,
    answered: inserted.answered,
    likeCount: inserted.like_count,
    createdAtISO: inserted.created_at,
    answeredAtISO: inserted.answered_at,
   });
 } catch (error) {
    console.error("POST /users/:username/questions error:", error);
    return res.status(500).json({ message: "server error"});
 }
});

export default router;