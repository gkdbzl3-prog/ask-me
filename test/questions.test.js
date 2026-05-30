import test from "node:test";
import assert from "node:assert/strict";
import { buildQuestionInsertPayload } from "../routes/questionPayload.js";

test("allows anonymous questions without an asker auth id", () => {
  const payload = buildQuestionInsertPayload({
    userId: "user-1",
    text: "  익명 질문입니다  ",
    isPrivate: false,
    files: [],
  });

  assert.equal(payload.user_id, "user-1");
  assert.equal(payload.text, "익명 질문입니다");
  assert.equal(payload.asker_auth_id, null);
});

test("keeps local anonymous browser id when provided", () => {
  const payload = buildQuestionInsertPayload({
    userId: "user-1",
    text: "",
    isPrivate: true,
    files: [{ fileUrl: "https://example.com/a.png", fileName: "a.png" }],
    askerAuthId: "browser-anon-id",
  });

  assert.equal(payload.is_private, true);
  assert.equal(payload.asker_auth_id, "browser-anon-id");
  assert.deepEqual(payload.files, [
    { fileUrl: "https://example.com/a.png", fileName: "a.png" },
  ]);
});
