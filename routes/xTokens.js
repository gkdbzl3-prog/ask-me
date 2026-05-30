export const X_LONG_LIVED_COOKIE_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;

export function createXTokenCookies({
  accessToken,
  refreshToken,
  expiresIn,
  xUserId,
  isProduction,
  now = Date.now(),
}) {
  const baseOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  };
  const accessMaxAge = Number(expiresIn || 0) * 1000;
  const cookies = {
    x_access_token: {
      value: accessToken,
      options: { ...baseOptions, maxAge: accessMaxAge },
    },
    x_token_expires_at: {
      value: String(now + accessMaxAge),
      options: { ...baseOptions, maxAge: accessMaxAge },
    },
  };

  if (refreshToken) {
    cookies.x_refresh_token = {
      value: refreshToken,
      options: {
        ...baseOptions,
        maxAge: X_LONG_LIVED_COOKIE_MAX_AGE_MS,
      },
    };
  }

  if (xUserId) {
    cookies.x_user_id = {
      value: xUserId,
      options: {
        ...baseOptions,
        signed: true,
        maxAge: X_LONG_LIVED_COOKIE_MAX_AGE_MS,
      },
    };
  }

  return cookies;
}

export function setXTokenCookies(res, tokenData, xUserId, isProduction) {
  const cookies = createXTokenCookies({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    xUserId,
    isProduction,
  });

  Object.entries(cookies).forEach(([name, cookie]) => {
    res.cookie(name, cookie.value, cookie.options);
  });
}

export function createXLogoutCookies({ isProduction }) {
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  };

  return [
    "x_access_token",
    "x_refresh_token",
    "x_token_expires_at",
    "x_oauth_state",
    "x_code_verifier",
    "x_user_id",
  ].map((name) => ({ name, options }));
}

export function clearXTokenCookies(res, isProduction) {
  createXLogoutCookies({ isProduction }).forEach(({ name, options }) => {
    res.clearCookie(name, options);
  });
}

export function createXRefreshTokenBody({ refreshToken, clientId }) {
  return new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
}
