import { render, screen, waitFor } from "@testing-library/react";

import type { ThreeSceneWidget } from "../types/contract";
import { ThreeSceneCanvas } from "./ThreeSceneCanvas";
import { loadSceneModule } from "./threeScene";

vi.mock("./threeScene", async () => {
  const actual = await vi.importActual<typeof import("./threeScene")>("./threeScene");
  return { ...actual, loadSceneModule: vi.fn() };
});

// Three.js itself is stubbed: none of its real behaviour is under test here,
// and jsdom has no GPU to give it. What is under test is the host's lifecycle
// around it — that setup is called, that teardown releases, that each failure
// mode reaches the in-panel fallback instead of the console.
const setAnimationLoop = vi.fn();
const rendererDispose = vi.fn();
const forceContextLoss = vi.fn();

vi.mock("three", () => {
  class Vector3 {
    x = 0;
    y = 0;
    z = 0;
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }
  return {
    WebGLRenderer: class {
      domElement = document.createElement("canvas");
      setClearAlpha = vi.fn();
      setPixelRatio = vi.fn();
      setSize = vi.fn();
      setAnimationLoop = setAnimationLoop;
      dispose = rendererDispose;
      forceContextLoss = forceContextLoss;
    },
    PerspectiveCamera: class {
      position = new Vector3();
      zoom = 1;
      aspect = 1;
      updateProjectionMatrix = vi.fn();
    },
    Scene: class {
      traverse = vi.fn();
    },
    Clock: class {
      elapsedTime = 0;
      getDelta = () => 0.016;
    },
    Vector3,
  };
});

/** Handlers the host registered on the controls, by event name. */
const orbitListeners = new Map<string, () => void>();

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: class {
    target = {
      x: 0,
      y: 0,
      z: 0,
      set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
    };
    enableRotate = true;
    enablePan = true;
    enableZoom = true;
    enableDamping = true;
    autoRotate = false;
    autoRotateSpeed = 2;
    minDistance = 0;
    maxDistance = 0;
    update = vi.fn();
    dispose = vi.fn();
    addEventListener = (event: string, handler: () => void) => {
      orbitListeners.set(event, handler);
    };
  },
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({ GLTFLoader: class {} }));

// jsdom implements neither observer. The host uses both — one to size the
// canvas, one to stop drawing when the panel scrolls out of the deck.
class StubObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
vi.stubGlobal("ResizeObserver", StubObserver);
vi.stubGlobal("IntersectionObserver", StubObserver);

const widget = (overrides: Partial<ThreeSceneWidget> = {}): ThreeSceneWidget => ({
  id: "scene",
  type: "three_scene",
  module: "scenes/core.js",
  props: {},
  ...overrides,
});

const handlers = { onAction: vi.fn(), onUiStateChange: vi.fn() };

/** jsdom returns null for every context; give the host a WebGL2 to find. */
const withWebgl2 = () =>
  vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation((kind: string) => (kind === "webgl2" ? ({} as never) : null));

beforeEach(() => {
  vi.clearAllMocks();
  orbitListeners.clear();
  vi.mocked(loadSceneModule).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ThreeSceneCanvas", () => {
  test("falls back in-panel when WebGL2 is unavailable", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(<ThreeSceneCanvas handlers={handlers} label="Core" widget={widget()} />);

    expect(await screen.findByText(/WebGL2 is not available/)).toBeInTheDocument();
  });

  test("shows the configured fallback text instead of the raw error", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(
      <ThreeSceneCanvas
        handlers={handlers}
        label="Core"
        widget={widget({
          options: {
            fallback: "WARP CORE OFFLINE",
          } as ThreeSceneWidget["options"],
        })}
      />,
    );

    expect(await screen.findByText("WARP CORE OFFLINE")).toBeInTheDocument();
  });

  test("reports a module that cannot be loaded", async () => {
    withWebgl2();
    vi.mocked(loadSceneModule).mockRejectedValue(new Error("404"));

    render(<ThreeSceneCanvas handlers={handlers} label="Core" widget={widget()} />);

    expect(await screen.findByText(/Scene module could not be loaded/)).toBeInTheDocument();
  });

  test("reports a module with no default export", async () => {
    withWebgl2();
    vi.mocked(loadSceneModule).mockResolvedValue({});

    render(<ThreeSceneCanvas handlers={handlers} label="Core" widget={widget()} />);

    expect(await screen.findByText(/must default-export a setup/)).toBeInTheDocument();
  });

  test("reports a setup() that throws", async () => {
    withWebgl2();
    vi.mocked(loadSceneModule).mockResolvedValue({
      default: () => {
        throw new Error("bad geometry");
      },
    });

    render(<ThreeSceneCanvas handlers={handlers} label="Core" widget={widget()} />);

    expect(await screen.findByText(/Scene setup failed/)).toBeInTheDocument();
  });

  test("calls setup with a context and starts the frame loop", async () => {
    withWebgl2();
    const setup = vi.fn().mockReturnValue({});
    vi.mocked(loadSceneModule).mockResolvedValue({ default: setup });

    render(<ThreeSceneCanvas handlers={handlers} label="Core" widget={widget()} />);

    await waitFor(() => expect(setup).toHaveBeenCalledOnce());
    const context = setup.mock.calls[0][0];
    expect(context.scene).toBeDefined();
    expect(context.camera).toBeDefined();
    expect(typeof context.assetUrl).toBe("function");
    expect(typeof context.emit).toBe("function");
    expect(setAnimationLoop).toHaveBeenCalled();
  });

  test("hands props to setup and later updates without rebuilding", async () => {
    withWebgl2();
    const updateProps = vi.fn();
    const setup = vi.fn().mockReturnValue({ updateProps });
    vi.mocked(loadSceneModule).mockResolvedValue({ default: setup });

    const { rerender } = render(
      <ThreeSceneCanvas handlers={handlers} label="Core" widget={widget({ props: { rpm: 1 } })} />,
    );
    await waitFor(() => expect(setup).toHaveBeenCalledOnce());
    expect(setup.mock.calls[0][0].props).toEqual({ rpm: 1 });

    rerender(
      <ThreeSceneCanvas handlers={handlers} label="Core" widget={widget({ props: { rpm: 2 } })} />,
    );

    await waitFor(() => expect(updateProps).toHaveBeenCalledWith({ rpm: 2 }));
    // The scene was reconfigured, not torn down and rebuilt.
    expect(setup).toHaveBeenCalledOnce();
  });

  test("emits camera state to Python when a gesture ends", async () => {
    withWebgl2();
    vi.mocked(loadSceneModule).mockResolvedValue({ default: () => ({}) });

    render(
      <ThreeSceneCanvas
        handlers={handlers}
        label="Core"
        widget={widget({
          options: {
            camera: { target: [1, 2, 3] },
            interaction: { mode: "server", action_id: "scene-moved" },
          } as ThreeSceneWidget["options"],
        })}
      />,
    );
    await waitFor(() => expect(orbitListeners.has("end")).toBe(true));

    orbitListeners.get("end")!();

    expect(handlers.onAction).toHaveBeenCalledWith(
      "scene-moved",
      {
        kind: "camera",
        state: {
          // The default camera placement, since only the target was overridden.
          camera_position: [4, 3, 6],
          camera_target: [1, 2, 3],
          zoom: 1,
          last_event: "camera",
          payload: null,
        },
      },
      "scene",
    );
  });

  test("emits nothing to Python for a local-only scene, but still tracks ui state", async () => {
    withWebgl2();
    vi.mocked(loadSceneModule).mockResolvedValue({ default: () => ({}) });

    render(<ThreeSceneCanvas handlers={handlers} label="Core" widget={widget()} />);
    await waitFor(() => expect(orbitListeners.has("end")).toBe(true));

    orbitListeners.get("end")!();

    expect(handlers.onAction).not.toHaveBeenCalled();
    expect(handlers.onUiStateChange).toHaveBeenCalledOnce();
  });

  test("the camera pose is emitted only when a gesture ends, never per frame", async () => {
    withWebgl2();
    vi.mocked(loadSceneModule).mockResolvedValue({ default: () => ({}) });

    render(
      <ThreeSceneCanvas
        handlers={handlers}
        label="Core"
        widget={widget({
          options: {
            interaction: { mode: "server", action_id: "scene-moved" },
          } as ThreeSceneWidget["options"],
        })}
      />,
    );
    await waitFor(() => expect(setAnimationLoop).toHaveBeenCalled());

    // Drive a hundred frames of what would be a drag.
    const frame = setAnimationLoop.mock.calls[0][0] as (now: number) => void;
    for (let i = 0; i < 100; i += 1) frame(i * 16);

    expect(handlers.onAction).not.toHaveBeenCalled();
  });

  test("releases the renderer and its context on unmount", async () => {
    withWebgl2();
    const dispose = vi.fn();
    vi.mocked(loadSceneModule).mockResolvedValue({ default: () => ({ dispose }) });

    const { unmount } = render(
      <ThreeSceneCanvas handlers={handlers} label="Core" widget={widget()} />,
    );
    await waitFor(() => expect(setAnimationLoop).toHaveBeenCalled());

    unmount();

    await waitFor(() => expect(dispose).toHaveBeenCalledOnce());
    expect(rendererDispose).toHaveBeenCalledOnce();
    // Without forceContextLoss the WebGL context outlives the component and a
    // console that revisits pages runs the driver out of contexts.
    expect(forceContextLoss).toHaveBeenCalledOnce();
    expect(setAnimationLoop).toHaveBeenLastCalledWith(null);
  });

  test("a scene whose teardown throws still releases the renderer", async () => {
    withWebgl2();
    vi.mocked(loadSceneModule).mockResolvedValue({
      default: () => ({
        dispose: () => {
          throw new Error("bad cleanup");
        },
      }),
    });

    const { unmount } = render(
      <ThreeSceneCanvas handlers={handlers} label="Core" widget={widget()} />,
    );
    await waitFor(() => expect(setAnimationLoop).toHaveBeenCalled());

    expect(() => unmount()).not.toThrow();
    await waitFor(() => expect(rendererDispose).toHaveBeenCalledOnce());
  });
});
