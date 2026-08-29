import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertManifestVersion,
  isManifest,
  MANIFEST_SCHEMA_VERSION,
  ManifestVersionError,
} from "./contract";

const goldenManifestPath = resolve(process.cwd(), "../fixtures/golden/manifest.v2.json");
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

  test("rejects invalid strict_renderer", () => {
    if (typeof goldenManifest !== "object" || goldenManifest === null) {
      throw new Error("goldenManifest must be an object");
    }
    const src = goldenManifest as Record<string, unknown>;
    const meta = src.meta as Record<string, unknown>;
    const bad = {
      ...src,
      meta: {
        ...meta,
        strict_renderer: "unknown",
      },
    };
    expect(isManifest(bad)).toBe(false);
  });

  test("rejects invalid row scaffold metadata", () => {
    if (typeof goldenManifest !== "object" || goldenManifest === null) {
      throw new Error("goldenManifest must be an object");
    }
    const src = goldenManifest as Record<string, unknown>;
    const pages = src.pages as Record<string, unknown>;
    const main = pages.main as Record<string, unknown>;
    const rows = [...(main.rows as Array<Record<string, unknown>>)];
    rows[0] = {
      ...rows[0],
      strict_lane_mode: "not-a-lane-mode",
    };
    const bad = {
      ...src,
      pages: {
        ...pages,
        main: {
          ...main,
          rows,
        },
      },
    };
    expect(isManifest(bad)).toBe(false);
  });
});

describe("contract: manifest version negotiation", () => {
  const asObject = (value: unknown): Record<string, unknown> => {
    if (typeof value !== "object" || value === null) {
      throw new Error("goldenManifest must be an object");
    }
    return value as Record<string, unknown>;
  };

  test("the golden manifest declares the version this client implements", () => {
    const meta = asObject(asObject(goldenManifest).meta);
    expect(meta.version).toBe(MANIFEST_SCHEMA_VERSION);
    expect(() => assertManifestVersion(goldenManifest)).not.toThrow();
  });

  test("a v1 manifest is rejected with both versions named", () => {
    const src = asObject(goldenManifest);
    const v1 = { ...src, meta: { ...asObject(src.meta), version: "1.1.0" } };

    expect(() => assertManifestVersion(v1)).toThrow(ManifestVersionError);
    try {
      assertManifestVersion(v1);
      throw new Error("assertManifestVersion must throw for a v1 manifest");
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestVersionError);
      const versionError = error as ManifestVersionError;
      expect(versionError.received).toBe("1.1.0");
      expect(versionError.expected).toBe(MANIFEST_SCHEMA_VERSION);
      // Both versions appear in the human-readable message, the way
      // parseEnvelope reports a protocol mismatch.
      expect(versionError.message).toContain('"1.1.0"');
      expect(versionError.message).toContain('"2.0"');
    }
  });

  test("a manifest with no version at all is rejected too", () => {
    const src = asObject(goldenManifest);
    const meta = { ...asObject(src.meta) };
    delete meta.version;
    expect(() => assertManifestVersion({ ...src, meta })).toThrow(ManifestVersionError);
    expect(() => assertManifestVersion(null)).toThrow(ManifestVersionError);
  });

  test("the standalone validator rejects a v1 manifest outright", () => {
    const src = asObject(goldenManifest);
    const v1 = { ...src, meta: { ...asObject(src.meta), version: "1.1.0" } };
    // Not just the explicit guard: the generated schema pins meta.version too.
    expect(isManifest(v1)).toBe(false);
  });
});

describe("contract: color enum", () => {
  const asObject = (value: unknown): Record<string, unknown> => value as Record<string, unknown>;

  test("a retired color token no longer validates against the schema", () => {
    const src = asObject(goldenManifest);
    const layout = asObject(src.layout);
    const withDeadToken = {
      ...src,
      layout: { ...layout, header: { ...asObject(layout.header), color: "purple" } },
    };
    expect(isManifest(withDeadToken)).toBe(false);
  });

  // Guard: every token the renderer can resolve to a themed accent must remain
  // schema-legal. Read the enum straight from the generated schema rather than
  // validating the whole golden manifest once per colour -- that is 15 full AJV
  // passes over 177 $defs, which times out and tests nothing extra.
  test("every color the renderer resolves is still schema-legal", () => {
    const schemaPath = resolve(process.cwd(), "../fixtures/golden/schema.v2.json");
    const schema = JSON.parse(readFileSync(schemaPath, "utf-8")) as string;
    const rendered = [
      "orange", "golden-tanoi", "pale-canary", "neon-carrot", "atomic-tangerine",
      "blue", "anakiwa", "mariner", "bahama-blue", "lilac", "hopbush", "eggplant",
      "red", "yellow", "white",
    ];
    const legal = new Set(JSON.stringify(schema).match(/"[a-z-]+"/g) ?? []);
    for (const color of rendered) {
      expect(legal.has(`"${color}"`)).toBe(true);
    }
    // and one real validation, so the enum and the validator cannot drift apart
    const src = asObject(goldenManifest);
    const layout = asObject(src.layout);
    expect(
      isManifest({
        ...src,
        layout: { ...layout, header: { ...asObject(layout.header), color: "orange" } },
      }),
    ).toBe(true);
  });
});
