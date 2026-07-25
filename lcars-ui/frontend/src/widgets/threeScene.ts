/*
 * The parts of the Three.js host that are worth testing on their own: asset URL
 * resolution, the state envelope sent back to Python, GPU teardown, and the
 * module load itself.
 *
 * The loader lives here rather than inline in the component so that the failure
 * paths — module missing, module exporting the wrong thing — can be driven from
 * a test. They are the paths most likely to be hit by a real project and the
 * least likely to be exercised by hand.
 */
import type { Object3D, PerspectiveCamera, Scene, Texture, WebGLRenderer } from "three";

/** Where the server mounts `assets_dir`. Kept in step with app.py. */
export const ASSET_BASE = "/lcars/assets/";

/** What a scene module receives. Everything it may touch is reachable here. */
export type SceneContext = {
  THREE: typeof import("three");
  /** Handed over ready-made so a scene need not know the examples/jsm path. */
  GLTFLoader: typeof import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader;
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: unknown;
  canvas: HTMLCanvasElement;
  props: Record<string, unknown>;
  /** Resolve a path relative to assets_dir into a URL the browser can fetch. */
  assetUrl: (relativePath: string) => string;
  /** Request a redraw. Only meaningful while the scene is paused. */
  invalidate: () => void;
  /** Send a named event, with optional JSON payload, back to Python. */
  emit: (kind: string, payload?: Record<string, unknown>) => void;
};

/** What a scene module may return. Every member is optional. */
export type SceneController = {
  update?: (delta: number, elapsed: number) => void;
  resize?: (width: number, height: number) => void;
  updateProps?: (props: Record<string, unknown>) => void;
  dispose?: () => void;
};

export type SceneModule = {
  default?: (context: SceneContext) => SceneController | void | Promise<SceneController | void>;
};

export type SceneState = {
  camera_position: [number, number, number];
  camera_target: [number, number, number];
  zoom: number;
  last_event: string;
  payload: Record<string, unknown> | null;
};

type TargetedControls = { target: { x: number; y: number; z: number } } | null | undefined;

/** Resolve an assets-relative path against the mount, for use in the browser. */
export const assetUrl = (relativePath: string, origin: string): string =>
  new URL(relativePath.replace(/^\.?\//, ""), new URL(ASSET_BASE, origin)).href;

/**
 * Load a scene module by URL.
 *
 * Separate from the component so tests can substitute it; `@vite-ignore` keeps
 * the bundler from trying to resolve a URL only known at runtime.
 */
export const loadSceneModule = async (url: string): Promise<SceneModule> =>
  (await import(/* @vite-ignore */ url)) as SceneModule;

/** The envelope Python receives, from whatever the camera and controls now say. */
export const sceneStateFrom = (
  camera: Pick<PerspectiveCamera, "position" | "zoom">,
  controls: TargetedControls,
  kind: string,
  payload?: Record<string, unknown>,
): SceneState => ({
  camera_position: [camera.position.x, camera.position.y, camera.position.z],
  camera_target: controls ? [controls.target.x, controls.target.y, controls.target.z] : [0, 0, 0],
  zoom: camera.zoom,
  last_event: kind,
  payload: payload ?? null,
});

/**
 * Free everything the scene graph allocated on the GPU.
 *
 * Three.js does not do this on its own: dropping the last reference to a mesh
 * releases the JavaScript object but leaves its buffers and textures resident
 * in the driver. A console that navigates between pages would accumulate them
 * until the context is lost.
 */
export const disposeSceneGraph = (root: Object3D): void => {
  root.traverse((object) => {
    const mesh = object as { geometry?: { dispose?: () => void }; material?: unknown };
    mesh.geometry?.dispose?.();
    const material = mesh.material;
    if (!material) return;
    for (const entry of (Array.isArray(material) ? material : [material]) as Array<
      Record<string, unknown> & { dispose?: () => void }
    >) {
      // A material's texture slots are its own properties; there is no
      // enumeration API, so the values are swept for anything disposable.
      for (const value of Object.values(entry)) {
        if (value && typeof value === "object" && "isTexture" in value) {
          (value as Texture).dispose?.();
        }
      }
      entry.dispose?.();
    }
  });
};
