import { assetUrl, disposeSceneGraph, sceneStateFrom } from "./threeScene";

describe("assetUrl", () => {
  test("resolves a relative path against the assets mount", () => {
    expect(assetUrl("scenes/core.js", "https://console.local")).toBe(
      "https://console.local/lcars/assets/scenes/core.js",
    );
  });

  test("tolerates a leading ./ or /", () => {
    expect(assetUrl("./scenes/core.js", "https://console.local")).toBe(
      "https://console.local/lcars/assets/scenes/core.js",
    );
    expect(assetUrl("/scenes/core.js", "https://console.local")).toBe(
      "https://console.local/lcars/assets/scenes/core.js",
    );
  });

  test("keeps nested paths under the mount", () => {
    expect(assetUrl("a/b/c/model.glb", "https://console.local")).toBe(
      "https://console.local/lcars/assets/a/b/c/model.glb",
    );
  });
});

describe("sceneStateFrom", () => {
  const camera = { position: { x: 1, y: 2, z: 3 }, zoom: 1.5 } as never;

  test("reads the camera pose and the controls target", () => {
    const state = sceneStateFrom(camera, { target: { x: 4, y: 5, z: 6 } }, "camera");

    expect(state).toEqual({
      camera_position: [1, 2, 3],
      camera_target: [4, 5, 6],
      zoom: 1.5,
      last_event: "camera",
      payload: null,
    });
  });

  test("falls back to the origin when there are no controls", () => {
    expect(sceneStateFrom(camera, null, "camera").camera_target).toEqual([0, 0, 0]);
  });

  test("carries a custom module payload", () => {
    const state = sceneStateFrom(camera, null, "hotspot", { part: "nacelle" });

    expect(state.last_event).toBe("hotspot");
    expect(state.payload).toEqual({ part: "nacelle" });
  });
});

describe("disposeSceneGraph", () => {
  /** A stand-in for Object3D.traverse over a flat list. */
  const graphOf = (children: unknown[]) => ({
    traverse: (visit: (object: never) => void) => children.forEach((child) => visit(child as never)),
  });

  test("disposes geometries, materials and their textures", () => {
    const geometry = { dispose: vi.fn() };
    const map = { isTexture: true, dispose: vi.fn() };
    const material = { map, dispose: vi.fn() };

    disposeSceneGraph(graphOf([{ geometry, material }]) as never);

    expect(geometry.dispose).toHaveBeenCalledOnce();
    expect(material.dispose).toHaveBeenCalledOnce();
    expect(map.dispose).toHaveBeenCalledOnce();
  });

  test("handles multi-material meshes", () => {
    const first = { dispose: vi.fn() };
    const second = { dispose: vi.fn() };

    disposeSceneGraph(graphOf([{ material: [first, second] }]) as never);

    expect(first.dispose).toHaveBeenCalledOnce();
    expect(second.dispose).toHaveBeenCalledOnce();
  });

  test("ignores objects that carry neither geometry nor material", () => {
    expect(() => disposeSceneGraph(graphOf([{}, { name: "group" }]) as never)).not.toThrow();
  });

  test("does not mistake a plain object property for a texture", () => {
    const userData = { note: "not a texture" };
    const material = { userData, dispose: vi.fn() };

    expect(() => disposeSceneGraph(graphOf([{ material }]) as never)).not.toThrow();
    expect(material.dispose).toHaveBeenCalledOnce();
  });
});
