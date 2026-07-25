/*
 * A procedural warp core.
 *
 * Everything here is built from geometry and flat colours — no textures, no
 * external files, nothing fetched. That keeps the example self-contained and
 * keeps the console looking like an Okudagram rather than a 3D viewer that
 * happens to be embedded in one.
 *
 * The contract: default-export setup(context), optionally return a controller.
 * LCARS owns the canvas, camera, controls, frame loop and teardown; this module
 * owns only what is in the scene and what changes per frame.
 */
export default function setup({ THREE, scene, camera, props, emit }) {
  const accent = new THREE.Color(props.accent ?? "#f89800");
  const cool = new THREE.Color(props.cool ?? "#9897fc");

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.PointLight(accent, 120, 60);
  key.position.set(4, 6, 5);
  scene.add(key);
  const fill = new THREE.PointLight(cool, 60, 60);
  fill.position.set(-5, -3, -4);
  scene.add(fill);

  // The core column.
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 5, 32, 1, true),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  scene.add(core);

  // Intermix chambers stacked along it.
  const chambers = [];
  const chamberGeometry = new THREE.TorusGeometry(1.05, 0.09, 12, 48);
  for (let index = 0; index < 7; index += 1) {
    const chamber = new THREE.Mesh(
      chamberGeometry,
      new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? accent : cool,
        emissive: index % 2 === 0 ? accent : cool,
        emissiveIntensity: 0.35,
        roughness: 0.4,
      }),
    );
    chamber.rotation.x = Math.PI / 2;
    chamber.position.y = -2.4 + index * 0.8;
    scene.add(chamber);
    chambers.push(chamber);
  }

  // A slow lattice of struts, for parallax when the camera orbits.
  const lattice = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.6, 1)),
    new THREE.LineBasicMaterial({ color: cool, transparent: true, opacity: 0.25 }),
  );
  scene.add(lattice);

  let level = props.level ?? 0.8;
  let elapsed = 0;

  return {
    update(delta) {
      elapsed += delta;
      lattice.rotation.y += delta * 0.08;
      lattice.rotation.x += delta * 0.02;
      // Chambers pulse in sequence, brighter the harder the core is running.
      chambers.forEach((chamber, index) => {
        const phase = elapsed * 2.4 - index * 0.5;
        chamber.material.emissiveIntensity = 0.2 + level * (0.5 + 0.5 * Math.sin(phase)) * 0.9;
      });
      core.material.opacity = 0.35 + 0.25 * level * (0.5 + 0.5 * Math.sin(elapsed * 3));
    },

    // Python can re-run the core without the scene being rebuilt.
    updateProps(next) {
      if (typeof next.level === "number") level = next.level;
    },

    dispose() {
      // Only what this module created that LCARS cannot infer; LCARS disposes
      // the scene graph itself.
      chamberGeometry.dispose();
      emit("disposed");
    },
  };
}
