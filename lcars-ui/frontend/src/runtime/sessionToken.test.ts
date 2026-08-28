import { describe, expect, it } from "vitest";

import {
  SESSION_TOKEN_HEADER,
  loadSessionToken,
  saveSessionToken,
  sessionTokenFromResponseHeaders,
} from "./sessionToken";

class FakeStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("session token persistence", () => {
  it("returns null when nothing has been stored yet", () => {
    expect(loadSessionToken(new FakeStorage())).toBeNull();
  });

  it("round-trips a saved token", () => {
    const storage = new FakeStorage();
    saveSessionToken("abc123", storage);
    expect(loadSessionToken(storage)).toBe("abc123");
  });

  it("treats a blank stored value as absent", () => {
    const storage = new FakeStorage();
    storage.setItem("lcars.webui.session.v1", "   ");
    expect(loadSessionToken(storage)).toBeNull();
  });

  it("tolerates storage that throws (private browsing, disabled storage)", () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadSessionToken(throwingStorage)).toBeNull();
    expect(() => saveSessionToken("token", throwingStorage)).not.toThrow();
  });
});

describe("sessionTokenFromResponseHeaders", () => {
  it("reads the lower-cased header axios normalizes to", () => {
    expect(
      sessionTokenFromResponseHeaders({ [SESSION_TOKEN_HEADER.toLowerCase()]: "rotated-token" }),
    ).toBe("rotated-token");
  });

  it("returns null when the header is absent, blank, or non-string", () => {
    expect(sessionTokenFromResponseHeaders(undefined)).toBeNull();
    expect(sessionTokenFromResponseHeaders({})).toBeNull();
    expect(sessionTokenFromResponseHeaders({ "x-lcars-session": "  " })).toBeNull();
    expect(sessionTokenFromResponseHeaders({ "x-lcars-session": 42 })).toBeNull();
  });
});
