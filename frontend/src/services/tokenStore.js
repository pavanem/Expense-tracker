// Access token lives in memory only — never localStorage/sessionStorage,
// so it isn't readable by any injected script the way a storage-based
// token would be. It naturally clears on tab close/refresh, at which point
// AuthContext's bootstrap-on-mount silently re-derives a new one from the
// httpOnly refresh cookie (see AuthContext.jsx), which is what actually
// delivers the "stay logged in for a month" behavior.

let accessToken = null;
let onSessionExpired = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

/** AuthContext registers itself here so apiClient can trigger a logout/redirect after a failed silent refresh. */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

export function notifySessionExpired() {
  if (onSessionExpired) onSessionExpired();
}
