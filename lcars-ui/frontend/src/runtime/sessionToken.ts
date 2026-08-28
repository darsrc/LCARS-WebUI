/**
 * Client-side half of session identity (see server/sessions.py).
 *
 * The server mints an opaque session token and hands it back via a response
 * header on /lcars/manifest (and any other HTTP endpoint that resolves a
 * session). This module persists that token in sessionStorage — scoped to
 * one browser tab, surviving reloads, NOT copied by opening a new tab from
 * history/bookmarks, but copied by an explicit "duplicate tab", which is
 * exactly the case the server's cloned-tab detection exists to catch.
 *
 * The token travels back to the server as the `X-Lcars-Session` header on
 * plain HTTP requests, and as a `session` query parameter on WebSocket/SSE
 * connections (those two browser APIs cannot set custom headers). It is
 * never logged.
 */

export const SESSION_TOKEN_HEADER = "X-Lcars-Session";
export const SESSION_TOKEN_QUERY = "session";

const STORAGE_KEY = "lcars.webui.session.v1";

const storageOrNull = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

export const loadSessionToken = (
  storage: Pick<Storage, "getItem"> | null = storageOrNull(),
): string | null => {
  if (!storage) return null;
  try {
    const value = storage.getItem(STORAGE_KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
};

export const saveSessionToken = (
  token: string,
  storage: Pick<Storage, "setItem"> | null = storageOrNull(),
): void => {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, token);
  } catch {
    // sessionStorage can be disabled (private browsing, quota). The app
    // still works for this request; it just re-mints a token next time.
  }
};

/**
 * Read a rotated/freshly-minted session token off an Axios-shaped response.
 *
 * Axios lower-cases response header names, so this reads the lower-case
 * form regardless of how the server cased it on the wire.
 */
export const sessionTokenFromResponseHeaders = (
  headers: Record<string, unknown> | undefined,
): string | null => {
  const value = headers?.[SESSION_TOKEN_HEADER.toLowerCase()];
  return typeof value === "string" && value.trim() ? value : null;
};
