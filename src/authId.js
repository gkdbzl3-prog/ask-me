// 익명 질문자 식별자(authId)는 localStorage에 한 번 발급해 계속 쓴다.
// 이 값이 바뀌면 자기가 보낸 질문을 더 이상 자기 것으로 알아보지 못해
// isMine이 꺼지고 삭제·좋아요가 서버에서 막힌다. 그래서 "이미 쓸 만한 값이면
// 절대 새로 만들지 않는다"가 유일한 규칙이고, 그 판단이 여기 있다.
//
// 예전 정규식은 [0-9af](b~e 누락)와 [0-9a-f][12](12자리가 아니라 2자리)
// 때문에 실제 UUID를 전부 거부했다. 그래서 페이지를 열 때마다 새 id가 발급돼
// 새로고침 한 번에 남이 됐다.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// crypto.randomUUID가 없는 브라우저에서 쓰는 대체 형식: `${Date.now()}-${hex}`.
// 이것도 유효한 값으로 봐야 한다 — 아니면 그 브라우저에선 매번 새로 발급된다.
const FALLBACK_RE = /^\d{10,}-[0-9a-z]{4,}$/i;

export function isValidAuthId(value) {
  if (typeof value !== "string") return false;
  const id = value.trim();
  if (!id) return false;
  return UUID_RE.test(id) || FALLBACK_RE.test(id);
}

export function createAuthId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
