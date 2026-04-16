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
     .order("created_at", { ascending: true });

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
       askerAuthId: q.asker_auth_id,
    }))
   );
 } catch (error) {
    console.error("GET /users/:username/questions error:", error);
    return res.status(500).json({ message: "server error"});
 }
});

router.post("/users/:username/questions", async (req, res) => {
 console.log("POST /api/users/:username/questions hit");

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
   
    if (insertError) {
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

router.patch("/questions/:id/answer", async (req, res) => {
 console.log("PATCH /api/questions/:id/answer hit");
 console.log("params:", req.params);
 console.log("body:", req.body);

 try {
    const { id} = req.params;
    const {
     answer = "", 
     answerFileUrl = "",
     answerFileName = "",
    } = req.body || {};

    const trimmedAnswer = String(answer || "").trim();

    if (!trimmedAnswer && !answerFileUrl) {
     return res.status(400).json({
        message: "텍스트 또는 이미지를 넣어주세요.",
     });
    }

    const updatePayload = {
     answer: trimmedAnswer,
     answer_file_url: answerFileUrl || "",
     answer_file_name: answerFileName || "",
     answered: true,
     answered_at: new Date().toISOString(),
    };

    console.log("updatePayload:", updatePayload);

    const { data: updated, error: updateError } = await supabase
     .from("questions")
     .update(updatePayload)
     .eq("id", id)
     .select("*")
     .single();

    console.log("updated:", updated);
    console.log("updateError:", updateError);

    if (updateError) {
     return res.status(500).json({
        message: "answer update failde",
        error: updateError,
     });
    }

    return res.json({
     id: updated.id,
     text: updated.text,
     isPrivate: updated.is_private,
     fileUrl: updated.file_url,
     fileName: updated.file_name,
     answer: updated.answer,
     answerFileUrl: updated.answer_file_url,
     answerFileName: updated.answer_file_name,
     answered: updated.answered,
     likeCount: updated.like_count,
     createdAtISO: updated.created_at,
     answeredAtISO: updated.answered_at,
    });
 } catch (error) {
    console.error("PATCH /questions/:id/answer error:", error);
    return res.status(500).json({ message: "server error"});
}
});

router.patch("/users/:username/profile", async (req, res) => {
   try {
      const { username } = req.params;
      const {
         displayName = "",
         bio = "",
         avatarUrl = "",
         bgUrl = "",
         highlightId = null,
      } = req.body || {};

      const updatePayload = {
         display_name: displayName || "",
         bio: bio || "",
         avatar_url: avatarUrl || "",
         bg_url: bgUrl || "",
         highlight_question_id: highlightId || null,
      };

      const { data: updated, error } = await supabase
         .from("users")
         .update(updatePayload)
         .eq("username", username)
         .select("*")
         .single();
      if (error) {
         console.error("PATCH /users/:username/profile error:", error);
         return res.status(500).json({
            message: "profile update failed",
            error,
         });
      }

      return res.json({
         id: updated.id,
         username: updated.username,
         displayName: updated.display_name,
         bio: updated.bg_url,
         xUserId: updated.x_user_id,
         highlightId: updated.highlight_question_id,
         createdAtISO: updated.created_at,
      });
   } catch (error) {
      console.error("PATCH /users/:username/profile server erroor:", error);
      return res.status(500).json({ message: "server error" });
   }
});

router.delete("/questions/:id", async (req, res) => {
   try {
      const { data: { user },
      } = await supabase.auth.getUser();
      const { id } = req.params;

      const { error } = await supabase
         .from("questions")
         .delete()
         .eq("id", id);
      
      if (error) {
         console.error("DELETE /questions/:id error:", error);
         return res.status(500).json({
            message: "question delete failed",
            error,
         });
      }

      return res.json({ ok: true, deletedId: id });
   } catch (error) {
      console.error("DELETE /questions/:id server error:", error);
      return res.status(500).json({ message: "server error" });
   }
});


router.patch("/questions/:id/answer/delete", async (req, res) => {
   try {
      const { id } = req.paramas;

      const updatePayload = {
         answer: "",
         answer_file_url: "",
         answer_file_name: "",
         answered: false,
         answered_at: null,
      };

      const { data: updated, error } = await supabase
         .from("questions")
         .update(updatePayload)
         .eq("id", id)
         .select("*")
         .single();
      
      if (error) {
         console.error("PATCH /questions/:id/answer/delete error:", error);
         return res.status(500).json({
            message: "answer delete failed",
            error,
         });
      }

      return res.json({
         id: updated.id,
         text: updated.text,
         isPrivate: updated.is_private,
         fileUrl: updated.file_url,
         fileName: updated.file_name,
         answer: updated.answer,
         answerFileUrl: updated.answer_file_url,
         answerFileName: updated.answer_file_name,
         answered: updated.answered,
         likeCount: updated.like_count,
         createdAtISO: updated.created_at,
         answeredAtISO: updated.answered_at,
      });
   } catch (error) {
      console.error("PATCH /questions/:id/answer/delete server error:", error);
      return res.status(500).json({ message: "server error" });
   }
});



export default router;
