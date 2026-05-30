export function buildQuestionInsertPayload({
  userId,
  text = "",
  isPrivate = false,
  files = [],
  askerAuthId = null,
}) {
  return {
    user_id: userId,
    text: String(text || "").trim(),
    is_private: !!isPrivate,
    files: Array.isArray(files) ? files : [],
    answer: "",
    answer_files: [],
    answered: false,
    like_count: 0,
    asker_auth_id: askerAuthId || null,
  };
}
