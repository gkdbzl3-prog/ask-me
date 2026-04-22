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
       files: q.files || [],
       answer: q.answer,
       answerFiles: q.answer_files || [],
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
     console.log("req.params:", req.params);
    console.log("req.body:", req.body);

    const { username } = req.params;
    const {
       text = "",
       isPrivate = false,
       files = [],
       askerAuthId = null,
    } = req.body || {};

      console.log("parsed body:", {
      username,
      text,
      isPrivate,
      files,
      askerAuthId,
    });
      
    const trimmedText = String(text || "").trim();
console.log("trimmedText:", trimmedText);
    console.log("files length:", Array.isArray(files) ? files.length : "not-array");
      if (!trimmedText && files.length === 0) {
        console.log("blocked: empty text and files");
     return res.status(400).json({
        message: "텍스트 또는 이미지를 넣어주세요.",
     });
    }
    const { data: user, error: userError } = await supabase
     .from("users")
     .select("id")
     .eq("username", username)
     .single();

      console.log("user lookup result:", user);
    console.log("user lookup error:", userError);
      
      
    if (userError || !user) {
     return res.status(404).json({ message: "user not found" });
    }

    const insertPayload = {
       user_id: user.id,
       text: trimmedText,
       is_private: !!isPrivate,
       files: files || [],
       answer: "",
       answer_files: [],
       answered: false,
       like_count: 0,
       asker_auth_id: askerAuthId,
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
    return res.status(500).json({
        message: "question insert failed",
        error: insertError,
        });
    }

   return res.status(201).json({
      id: inserted.id,
      text: inserted.text,
      isPrivate: inserted.is_private,
      files: inserted.files || [],
      answer: inserted.answer,
      answerFiles: inserted.answer_files || [],
      answered: inserted.answered,
      likeCount: inserted.like_count,
      askerAuthId: inserted.asker_auth_id,
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
    const { id } = req.params;
    const {
     answer = "", 
     answerFiles = [],
    } = req.body || {};

    const trimmedAnswer = String(answer || "").trim();

    if (!trimmedAnswer && answerFiles.length === 0) {
       return res.status(400).json({
          message: "텍스트 또는 이미지를 넣어주세요.",
       })
    }

    const updatePayload = {
       answer: trimmedAnswer,
       answer_files: answerFiles || [],
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
        message: "answer update failed",
        error: updateError,
     });
    }

    return res.json({
       id: updated.id,
       text: updated.text,
       isPrivate: updated.is_private,
       files: updated.files || [],
       answer: updated.answer,
       answerFiles: updated.answer_files || [],
       answered: updated.answered,
       likeCount: updated.like_count,
       createdAtISO: updated.created_at,
       answeredAtISO: updated.answered_at,
       askerAuthId: updated.asker_auth_id,
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
      } = req.body || {};

      const updatePayload = {
         display_name: displayName || "",
         bio: bio || "",
         avatar_url: avatarUrl || "",
         bg_url: bgUrl || "",
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
         bio: updated.bio,
         avatarUrl: updated.avatar_url,
         bgUrl: updated.bg_url,
         xUserId: updated.x_user_id,
         createdAtISO: updated.created_at,
       askerAuthId: updated.asker_auth_id,         
      });
   } catch (error) {
      console.error("PATCH /users/:username/profile server error:", error);
      return res.status(500).json({ message: "server error" });
   }
});

router.delete("/questions/:id", async (req, res) => {
   try {
      const { id } = req.params;
      const {
      requesterAuthId = "",
         requesterXUserId = "",
      } = req.body || {};
      
      const {data: question, error: questionError } = await supabase
      .from("questions")
      .select("id, user_id, asker_auth_id")
      .eq("id",id)
      .single();
      
      if (questionError || !question) {
         return res.status(404).json({ message: "question not found" });
      }
      
      const { data: ownerUser, error: ownerError } = await supabase
         .from("users")
         .select("x_user_id")
         .eq("id", question.user_id)
         .single();
      
      if (ownerError || !ownerUser) {
         return res.status(404).json({ message: "owner not found" });
      }

      const isAsker =
         !!requesterAuthId &&
         question.asker_auth_id === requesterAuthId;
      
      const isOwner =
         !!requesterXUserId &&
         ownerUser.x_user_id === requesterXUserId;
      if (!isAsker && !isOwner) {
         return res.status(403).json({ message: "forbidden" });
      }
   

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
      const { id } = req.params;

      const updatePayload = {
         answer: "",
         answer_files: [],
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
         files: updated.files,
         answer: updated.answer,
         answerFiles: updated.answer_files,
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
