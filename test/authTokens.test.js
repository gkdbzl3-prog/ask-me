import test from "node:test";
import assert from "node:assert/strict";
import {
  createXRefreshTokenBody,
  createXTokenCookies,
  createXLogoutCookies,
  X_LONG_LIVED_COOKIE_MAX_AGE_MS,
} from "../routes/xTokens.js";

test("keeps X refresh and owner identity cookies long-lived", () => {
  const cookies = createXTokenCookies({
    accessToken: "access",
    refreshToken: "refresh",
    expiresIn: 7200,
    xUserId: "12345",
    isProduction: true,
    now: 1_000,
  });

  assert.equal(cookies.x_access_token.options.maxAge, 7_200_000);
  assert.equal(cookies.x_token_expires_at.value, "7201000");
  assert.equal(cookies.x_refresh_token.options.maxAge, X_LONG_LIVED_COOKIE_MAX_AGE_MS);
  assert.equal(cookies.x_user_id.options.maxAge, X_LONG_LIVED_COOKIE_MAX_AGE_MS);
  assert.equal(cookies.x_refresh_token.options.path, "/");
  assert.equal(cookies.x_user_id.options.path, "/");
  assert.equal(cookies.x_user_id.options.signed, true);
});

test("clears X auth cookies with the same root path used when setting them", () => {
  const cookies = createXLogoutCookies({ isProduction: true });

  assert.deepEqual(
    cookies.map((cookie) => [cookie.name, cookie.options.path]),
    [
      ["x_access_token", "/"],
      ["x_refresh_token", "/"],
      ["x_token_expires_at", "/"],
      ["x_oauth_state", "/"],
      ["x_code_verifier", "/"],
      ["x_user_id", "/"],
    ]
  );
});

test("uses the X OAuth refresh_token grant type", () => {
  const body = createXRefreshTokenBody({
    refreshToken: "refresh",
    clientId: "client",
  });

  assert.equal(body.get("grant_type"), "refresh_token");
  assert.equal(body.get("refresh_token"), "refresh");
  assert.equal(body.get("client_id"), "client");
});
