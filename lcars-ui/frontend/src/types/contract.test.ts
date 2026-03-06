import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { isManifest } from "./contract";

const goldenManifestPath = resolve(process.cwd(), "../fixtures/golden/manifest.v1.json");
const goldenManifest = JSON.parse(readFileSync(goldenManifestPath, "utf-8")) as unknown;

describe("contract: isManifest", () => {
  test("accepts the generated backend golden manifest without shape drift", () => {
    expect(isManifest(goldenManifest)).toBe(true);
  });

  test("rejects null", () => {
    expect(isManifest(null)).toBe(false);
  });

  test("rejects missing meta fields", () => {
    if (typeof goldenManifest !== "object" || goldenManifest === null) {
      throw new Error("goldenManifest must be an object");
    }
    const bad = { ...(goldenManifest as Record<string, unknown>), meta: { version: "1.0.0" } };
    expect(isManifest(bad)).toBe(false);
  });

  test("rejects empty pages object", () => {
    if (typeof goldenManifest !== "object" || goldenManifest === null) {
      throw new Error("goldenManifest must be an object");
    }
    const bad = { ...(goldenManifest as Record<string, unknown>), pages: {} };
    expect(isManifest(bad)).toBe(false);
  });

  test("rejects missing layout.header.title", () => {
    if (typeof goldenManifest !== "object" || goldenManifest === null) {
      throw new Error("goldenManifest must be an object");
    }
    const src = goldenManifest as Record<string, unknown>;
    const layout = src.layout as Record<string, unknown>;
    const bad = {
      ...src,
      layout: {
        ...layout,
        header: { color: "orange" },
      },
    };
    expect(isManifest(bad)).toBe(false);
  });

  test("rejects non-array sidebar items", () => {
    if (typeof goldenManifest !== "object" || goldenManifest === null) {
      throw new Error("goldenManifest must be an object");
    }
    const src = goldenManifest as Record<string, unknown>;
    const layout = src.layout as Record<string, unknown>;
    const bad = {
      ...src,
      layout: {
        ...layout,
        sidebar: { position: "left", items: "not-an-array" },
      },
    };
    expect(isManifest(bad)).toBe(false);
  });

  test("rejects invalid visual_language", () => {
    if (typeof goldenManifest !== "object" || goldenManifest === null) {
      throw new Error("goldenManifest must be an object");
    }
    const src = goldenManifest as Record<string, unknown>;
    const meta = src.meta as Record<string, unknown>;
    const bad = {
      ...src,
      meta: {
        ...meta,
        visual_language: "unsupported",
      },
    };
    expect(isManifest(bad)).toBe(false);
  });
});
