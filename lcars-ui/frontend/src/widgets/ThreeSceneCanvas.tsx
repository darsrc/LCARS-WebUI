/*
 * Managed Three.js viewport.
 *
 * The division of labour here is the whole point of the widget. LCARS owns
 * every piece of machinery that a scene would otherwise have to rebuild and
 * get wrong — the canvas, the renderer, the camera, the controls, resizing,
 * the frame loop, visibility suspension, and teardown. The project's scene
 * module owns only what is actually specific to it: what is in the scene, and
 * what changes per frame.
 *
 * That split is what keeps a scene from leaking. A module never starts its own
 * requestAnimationFrame loop and never mounts anything at document level, so
 * there is nothing for it to leave behind when its panel unmounts.
 *
 * The module is ordinary same-origin project code. It is not sandboxed and is
 * not treated as hostile; the lifecycle below is about correctness and
 * cleanup, not containment.
 */
import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "../lcars/motion";
import type { Widget } from "../types/contract";
import {
  assetUrl as resolveAssetUrl,
  disposeSceneGraph,
  loadSceneModule,
  sceneStateFrom,
  type SceneContext,
  type SceneController,
  type SceneModule,
} from "./threeScene";
import type { WidgetHandlers } from "./WidgetRenderer";

type ThreeSceneWidget = Extract<Widget, { type: "three_scene" }>;

export function ThreeSceneCanvas({
  widget,
  label,
  handlers,
}: {
  widget: ThreeSceneWidget;
  label: string;
  handlers: WidgetHandlers;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const options = widget.options;
  const honorReducedMotion = options?.honor_reduced_motion ?? true;
  const paused = (options?.paused ?? false) || (honorReducedMotion && reducedMotion);

  // Read inside the frame loop and the props effect, so a change to either does
  // not tear the scene down and rebuild it.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const controllerRef = useRef<SceneController | null>(null);
  const cameraRef = useRef<import("three").PerspectiveCamera | null>(null);
  const controlsRef = useRef<unknown>(null);
  const sceneRef = useRef<import("three").Scene | null>(null);
  const emitRef = useRef<(kind: string, payload?: Record<string, unknown>) => void>(() => {});

  emitRef.current = (kind, payload) => {
    const interaction = options?.interaction;
    const camera = cameraRef.current;
    if (!camera) return;
    const state = sceneStateFrom(
      camera,
      controlsRef.current as { target: { x: number; y: number; z: number } } | null,
      kind,
      payload,
    );
    handlers.onUiStateChange?.(widget.id, state);
    if (interaction?.mode === "server") {
      handlers.onAction(interaction.action_id ?? widget.id, { kind, state }, widget.id);
    }
  };

  // Rebuilt only when the module or the renderer-level settings change. Props
  // deliberately absent: they flow through updateProps instead, so streaming a
  // new value does not restart the scene.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let renderer: import("three").WebGLRenderer | null = null;
    let controls: { update: () => void; dispose: () => void } | null = null;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let canvas: HTMLCanvasElement | null = null;
    let onContextLost: ((event: Event) => void) | null = null;

    const run = async () => {
      const THREE = await import("three");
      if (disposed) return;

      canvas = document.createElement("canvas");
      canvas.className = "lcars-three-canvas";
      host.appendChild(canvas);

      // WebGLRenderer is WebGL2-only in current Three.js, so this is the real
      // support check rather than a stylistic preference for webgl2.
      if (!canvas.getContext("webgl2")) {
        setError("WebGL2 is not available in this browser.");
        return;
      }

      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: options?.transparent ?? true,
          antialias: true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "WebGL renderer unavailable");
        return;
      }
      renderer.setClearAlpha(options?.transparent === false ? 1 : 0);

      const cameraOptions = options?.camera;
      const camera = new THREE.PerspectiveCamera(
        cameraOptions?.fov ?? 50,
        1,
        cameraOptions?.near ?? 0.1,
        cameraOptions?.far ?? 1000,
      );
      const [px, py, pz] = cameraOptions?.position ?? [4, 3, 6];
      camera.position.set(px, py, pz);
      cameraRef.current = camera;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const controlOptions = options?.controls;
      if (controlOptions?.enabled ?? true) {
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        if (disposed) return;
        const orbit = new OrbitControls(camera, renderer.domElement);
        orbit.enableRotate = controlOptions?.orbit ?? true;
        orbit.enablePan = controlOptions?.pan ?? true;
        orbit.enableZoom = controlOptions?.zoom ?? true;
        orbit.enableDamping = controlOptions?.damping ?? true;
        orbit.autoRotate = (controlOptions?.auto_rotate ?? false) && !pausedRef.current;
        orbit.autoRotateSpeed = controlOptions?.auto_rotate_speed ?? 2;
        orbit.minDistance = controlOptions?.min_distance ?? 0.5;
        orbit.maxDistance = controlOptions?.max_distance ?? 200;
        const [tx, ty, tz] = cameraOptions?.target ?? [0, 0, 0];
        orbit.target.set(tx, ty, tz);
        orbit.update();
        // Only on 'end': a camera state per frame of a drag would be tens of
        // websocket messages for one gesture, all but the last superseded.
        orbit.addEventListener("end", () => emitRef.current("camera"));
        controls = orbit;
        controlsRef.current = orbit;
      }

      const assetUrl = (relativePath: string) =>
        resolveAssetUrl(relativePath, window.location.origin);

      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed) return;

      let needsRender = true;
      const context: SceneContext = {
        THREE,
        GLTFLoader,
        scene,
        camera,
        renderer,
        controls,
        canvas,
        props: (widget.props ?? {}) as Record<string, unknown>,
        assetUrl,
        invalidate: () => {
          needsRender = true;
        },
        emit: (kind, payload) => emitRef.current(kind, payload),
      };

      let module: SceneModule;
      try {
        module = await loadSceneModule(assetUrl(widget.module));
      } catch (err) {
        setError(
          `Scene module could not be loaded (${widget.module}): ` +
            (err instanceof Error ? err.message : String(err)),
        );
        return;
      }
      if (disposed) return;
      if (typeof module.default !== "function") {
        setError(`Scene module ${widget.module} must default-export a setup(context) function.`);
        return;
      }

      try {
        controllerRef.current = (await module.default(context)) || {};
      } catch (err) {
        setError(
          `Scene setup failed: ` + (err instanceof Error ? err.message : String(err)),
        );
        return;
      }
      if (disposed) return;
      setError(null);

      const maxRatio = options?.max_pixel_ratio ?? 2;
      const resize = () => {
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        renderer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
        renderer?.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        needsRender = true;
        try {
          controllerRef.current?.resize?.(width, height);
        } catch {
          // A scene that cannot handle a resize should not take the console
          // down with it; the next frame still renders at the new size.
        }
      };
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      // A scene scrolled out of the deck, or on a background tab, is still
      // burning GPU on frames nobody sees.
      let onScreen = true;
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          onScreen = entries.some((entry) => entry.isIntersecting);
          needsRender = true;
        },
        { threshold: 0 },
      );
      intersectionObserver.observe(host);

      onContextLost = (event: Event) => {
        event.preventDefault();
        setError("WebGL context lost. Reload the page to restore the scene.");
      };
      canvas.addEventListener("webglcontextlost", onContextLost);

      const clock = new THREE.Clock();
      const frameInterval = 1000 / (options?.fps_limit ?? 60);
      let lastFrame = 0;
      let failed = false;

      renderer.setAnimationLoop((now) => {
        if (failed || !renderer) return;
        const isPaused = pausedRef.current;
        const hidden = document.hidden || !onScreen;
        // Paused still redraws once whenever something asked it to, so a prop
        // change or a resize is visible without the loop running.
        if (hidden || (isPaused && !needsRender)) return;
        if (!isPaused && now - lastFrame < frameInterval) return;
        lastFrame = now;
        needsRender = false;

        const delta = clock.getDelta();
        try {
          if (!isPaused) controllerRef.current?.update?.(delta, clock.elapsedTime);
          controls?.update();
          renderer.render(scene, camera);
        } catch (err) {
          // One throwing frame would otherwise throw every frame, at 60Hz.
          failed = true;
          renderer.setAnimationLoop(null);
          setError(
            `Scene frame failed: ` + (err instanceof Error ? err.message : String(err)),
          );
        }
      });
    };

    void run();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (canvas && onContextLost) canvas.removeEventListener("webglcontextlost", onContextLost);
      try {
        controllerRef.current?.dispose?.();
      } catch {
        // A failing teardown must not prevent the renderer's own cleanup below.
      }
      controllerRef.current = null;
      controls?.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      if (sceneRef.current) {
        disposeSceneGraph(sceneRef.current);
        sceneRef.current = null;
      }
      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        // Without this the context stays live until the browser reclaims it,
        // and a console that revisits a page a dozen times hits the driver's
        // context limit and starts losing the oldest ones.
        renderer.forceContextLoss();
      }
      canvas?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.module, options]);

  // Props travel separately so that streaming a new value re-configures the
  // running scene instead of rebuilding it.
  useEffect(() => {
    try {
      controllerRef.current?.updateProps?.((widget.props ?? {}) as Record<string, unknown>);
    } catch {
      // A rejected prop update leaves the scene as it was, which is the
      // sensible outcome and not worth failing the panel over.
    }
  }, [widget.props]);

  return (
    <div className="lcars-chart lcars-chart--three lcars-immersive">
      {label ? <div className="lcars-chart-title">{label}</div> : null}
      <div
        className="lcars-three-host"
        ref={hostRef}
        style={widget.aspect_ratio ? { aspectRatio: `${widget.aspect_ratio}` } : undefined}
      />
      {error ? (
        <div className="lcars-shader-error">{options?.fallback ?? `SCENE ERROR: ${error}`}</div>
      ) : null}
    </div>
  );
}

export default ThreeSceneCanvas;
