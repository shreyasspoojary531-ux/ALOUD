import * as THREE from "three";

export const WARP_FIELD_VARIANTS = ["streaks", "letters", "keycaps", "hyperspace"];

export const WARP_FIELD_DEFAULTS = {
  variant: "streaks",
  speed: 15,
  streakOpacity: 0.8,
  tileOpacity: 0.95,
  fov: 75,
  brightness: 1,
  hue: 0,
  saturation: 1,
  cameraZ: 0,
  centerX: 0,
  centerY: 0,
};

const RECYCLE_Z = 200;
const RESET_Z = -1600;

function createStreakLayer(group, settings, opacity) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(settings.count * 6);
  const colors = new Float32Array(settings.count * 6);
  const palette = settings.palette.map((hex) => new THREE.Color(hex));

  for (let index = 0; index < settings.count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * settings.radiusSpread + settings.radiusMin;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = (Math.random() - 0.5) * 1800;
    const length = Math.random() * settings.lengthSpread + settings.lengthMin;

    positions[index * 6] = x;
    positions[index * 6 + 1] = y;
    positions[index * 6 + 2] = z;
    positions[index * 6 + 3] = x;
    positions[index * 6 + 4] = y;
    positions[index * 6 + 5] = z + length;

    const color = palette[Math.floor(Math.random() * palette.length)];
    colors[index * 6] = color.r;
    colors[index * 6 + 1] = color.g;
    colors[index * 6 + 2] = color.b;
    colors[index * 6 + 3] = color.r;
    colors[index * 6 + 4] = color.g;
    colors[index * 6 + 5] = color.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: opacity * settings.opacityScale,
    blending: THREE.AdditiveBlending,
  });

  const streaks = new THREE.LineSegments(geometry, material);
  group.add(streaks);

  return {
    update(step) {
      for (let index = 0; index < settings.count; index += 1) {
        positions[index * 6 + 2] += step;
        positions[index * 6 + 5] += step;
        if (positions[index * 6 + 2] > RECYCLE_Z) {
          const length = positions[index * 6 + 5] - positions[index * 6 + 2];
          positions[index * 6 + 2] = RESET_Z;
          positions[index * 6 + 5] = RESET_Z + length;
        }
      }
      geometry.attributes.position.needsUpdate = true;
    },
    setOpacity(streakOpacity) {
      const scaled = streakOpacity * settings.opacityScale;
      if (material.opacity !== scaled) material.opacity = scaled;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createTileLayer(group, opacity) {
  const geometry = new THREE.PlaneGeometry(12, 28);
  const template = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const tiles = [];
  let lastOpacity = opacity;

  for (let index = 0; index < 50; index += 1) {
    const material = template.clone();
    material.color.setHex(
      Math.random() > 0.6 ? 0x34d399 : Math.random() > 0.4 ? 0x10b981 : 0xa7f3d0
    );
    const mesh = new THREE.Mesh(geometry, material);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 450 + 80;
    mesh.position.x = Math.cos(angle) * radius;
    mesh.position.y = Math.sin(angle) * radius;
    mesh.position.z = (Math.random() - 0.5) * 1800;
    mesh.lookAt(0, 0, mesh.position.z + 100);

    const scale = Math.random() * 1.6 + 0.6;
    mesh.scale.set(scale, scale, scale);
    group.add(mesh);
    tiles.push(mesh);
  }

  return {
    update(step) {
      tiles.forEach((tile) => {
        tile.position.z += step;
        if (tile.position.z > RECYCLE_Z) tile.position.z = RESET_Z;
      });
    },
    setOpacity(_streakOpacity, tileOpacity) {
      if (lastOpacity === tileOpacity) return;
      tiles.forEach((tile) => {
        tile.material.opacity = tileOpacity;
      });
      lastOpacity = tileOpacity;
    },
    dispose() {
      geometry.dispose();
      template.dispose();
      tiles.forEach((tile) => tile.material.dispose());
    },
  };
}

const STREAK_SETTINGS = {
  streaks: {
    count: 500,
    radiusMin: 15,
    radiusSpread: 750,
    lengthMin: 60,
    lengthSpread: 180,
    palette: [0x10b981, 0x059669, 0x34d399, 0x6ee7b7, 0xffffff],
    opacityScale: 1,
  },
};

export function createWarpFieldRenderer(canvas, getOptions) {
  const startOptions = getOptions();
  const variant = WARP_FIELD_VARIANTS.includes(startOptions.variant)
    ? startOptions.variant
    : WARP_FIELD_DEFAULTS.variant;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02040a, 0.0003);

  const camera = new THREE.PerspectiveCamera(startOptions.fov || 75, 1, 0.1, 2000);
  camera.position.set(startOptions.centerX || 0, startOptions.centerY || 0, startOptions.cameraZ || 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const group = new THREE.Group();
  scene.add(group);

  const layers = [
    createStreakLayer(
      group,
      STREAK_SETTINGS[variant] || STREAK_SETTINGS.streaks,
      startOptions.streakOpacity
    ),
    createTileLayer(group, startOptions.tileOpacity),
  ];

  const clock = new THREE.Clock();
  let elapsed = 0;

  return {
    resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    },
    render() {
      const options = getOptions();
      if (camera.fov !== (options.fov || 75)) {
        camera.fov = options.fov || 75;
        camera.updateProjectionMatrix();
      }
      camera.position.x = options.centerX || 0;
      camera.position.y = options.centerY || 0;
      camera.position.z = options.cameraZ || 0;
      camera.lookAt(options.centerX || 0, options.centerY || 0, -1000);

      const delta = Math.min(clock.getDelta(), 0.1);
      elapsed += delta;
      const step = (options.speed || 15) * 60 * delta;
      layers.forEach((layer) => {
        layer.setOpacity?.(options.streakOpacity, options.tileOpacity);
        layer.update?.(step, elapsed);
      });
      renderer.render(scene, camera);
    },
    dispose() {
      layers.forEach((layer) => layer.dispose());
      renderer.dispose();
    },
  };
}
