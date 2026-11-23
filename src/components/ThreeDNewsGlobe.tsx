import {
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  Layers,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useNewspaper } from '../contexts/NewspaperContext';
import { NEWS_BUREAUS } from '../data/seedArticles';
import { BureauLocation } from '../types/newspaper';

type CameraPreset = 'editorial' | 'polar' | 'orbital' | 'bureau';
type FinishSwatch = 'titanium' | 'obsidian' | 'brass';

function latLngToVector3(lat: number, lng: number, radius: number, out: THREE.Vector3): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  out.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  return out;
}

function createProceduralEarthTexture(): { colorMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const w = 1024;
  const h = 512;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = w;
  cCanvas.height = h;
  const ctx = cCanvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = w;
  bCanvas.height = h;
  const bCtx = bCanvas.getContext('2d')!;

  // Deep maritime slate ocean
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#132136');
  grad.addColorStop(0.5, '#0c1729');
  grad.addColorStop(1, '#101d31');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  bCtx.fillStyle = '#181818';
  bCtx.fillRect(0, 0, w, h);

  // Subtle editorial cartography graticule
  ctx.strokeStyle = 'rgba(120, 165, 220, 0.14)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 12; i++) {
    const x = (w / 12) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let j = 1; j < 6; j++) {
    const y = (h / 6) * j;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Stylized landmass silhouettes (Americas, Eurasia, Africa, Australia)
  const continents: Array<Array<[number, number]>> = [
    // North America
    [[140, 85], [275, 72], [315, 118], [288, 178], [242, 220], [198, 200], [160, 152]],
    // South America
    [[268, 250], [335, 268], [358, 325], [322, 415], [286, 435], [268, 330]],
    // Europe
    [[470, 88], [568, 80], [585, 145], [520, 175], [472, 155]],
    // Africa
    [[476, 185], [565, 185], [610, 255], [575, 365], [528, 392], [492, 300], [462, 238]],
    // Asia
    [[572, 76], [820, 74], [875, 132], [835, 208], [740, 240], [648, 218], [584, 154]],
    // Australia
    [[790, 315], [875, 312], [892, 372], [820, 385], [780, 355]],
  ];

  continents.forEach((poly) => {
    ctx.fillStyle = '#23364f';
    ctx.strokeStyle = '#476891';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    poly.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    bCtx.fillStyle = '#a8a8a8';
    bCtx.beginPath();
    poly.forEach(([x, y], idx) => (idx === 0 ? bCtx.moveTo(x, y) : bCtx.lineTo(x, y)));
    bCtx.closePath();
    bCtx.fill();
  });

  // Glowing editorial network arcs between major news bureaus
  ctx.strokeStyle = 'rgba(225, 38, 45, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(165, 145);
  ctx.quadraticCurveTo(350, 70, 505, 118);
  ctx.quadraticCurveTo(690, 95, 868, 156);
  ctx.stroke();

  const colorMap = new THREE.CanvasTexture(cCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  return { colorMap, bumpMap };
}

function createBrushedMetalTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    const shade = 115 + Math.floor((Math.sin(y * 0.43) + 1) * 24);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, y, 256, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function ThreeDNewsGlobe() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { bureaus, publishedArticles, openArticle, selectedBureauId, setSelectedBureauId } = useNewspaper();

  const [selectedBureau, setSelectedBureau] = useState<BureauLocation>(
    () => bureaus.find((b) => b.id === selectedBureauId) || bureaus[0]
  );
  const activeBureauInfo = bureaus.find((b) => b.id === selectedBureau.id) || selectedBureau;
  const [autoRotate, setAutoRotate] = useState(true);
  const [explodeView, setExplodeView] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('editorial');
  const [finish, setFinish] = useState<FinishSwatch>('titanium');
  const [dockOpen, setDockOpen] = useState(true);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const controlsStateRef = useRef({
    autoRotate: true,
    explodeTarget: 0,
    preset: 'editorial' as CameraPreset,
    finish: 'titanium' as FinishSwatch,
    focusBureau: selectedBureau,
  });

  useEffect(() => {
    controlsStateRef.current.autoRotate = autoRotate;
    controlsStateRef.current.explodeTarget = explodeView ? 1 : 0;
    controlsStateRef.current.preset = cameraPreset;
    controlsStateRef.current.finish = finish;
    controlsStateRef.current.focusBureau = selectedBureau;
  }, [autoRotate, explodeView, cameraPreset, finish, selectedBureau]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 560;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    const gl = renderer.getContext();
    const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbgExt ? String(gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b101b);
    scene.fog = new THREE.FogExp2(0x0b101b, 0.032);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 7.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4.2;
    controls.maxDistance = 12.5;
    controls.maxPolarAngle = Math.PI * 0.85;

    // Warm key + cool fill studio lighting
    const hemi = new THREE.HemisphereLight(0xaac8ff, 0x161d2b, 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.4);
    keyLight.position.set(5.5, 7.2, 5.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.15);
    rimLight.position.set(-5.5, 2.5, -4.5);
    scene.add(rimLight);

    const brushedTex = createBrushedMetalTexture();
    const { colorMap, bumpMap } = createProceduralEarthTexture();

    // Shared materials updated by finish swatch
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.28,
      roughnessMap: brushedTex,
    });
    const accentTrimMat = new THREE.MeshStandardMaterial({
      color: 0xe1262d,
      metalness: 0.45,
      roughness: 0.35,
    });
    const darkChassisMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.55,
      roughness: 0.45,
    });

    // Studio floor disc
    const floorGeo = new THREE.CircleGeometry(14, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0e1524,
      metalness: 0.15,
      roughness: 0.85,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.45;
    floor.receiveShadow = true;
    scene.add(floor);

    // 1. COMPOSITE GIMBAL STAND GROUP
    const standGroup = new THREE.Group();
    const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.75, 0.22, 48), darkChassisMat);
    basePlinth.position.y = -2.34;
    basePlinth.receiveShadow = true;
    basePlinth.castShadow = true;
    standGroup.add(basePlinth);

    const brassCollar = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.32, 0.12, 48), metalMat);
    brassCollar.position.y = -2.18;
    standGroup.add(brassCollar);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.45, 24), metalMat);
    stem.position.y = -1.94;
    standGroup.add(stem);

    // Half-arc gimbal cradle
    const cradleGeo = new THREE.TorusGeometry(2.05, 0.055, 16, 64, Math.PI * 1.15);
    const cradle = new THREE.Mesh(cradleGeo, metalMat);
    cradle.rotation.z = -Math.PI * 0.575;
    standGroup.add(cradle);

    // North & south trunnion caps
    const topPin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 16), metalMat);
    topPin.position.set(0, 1.98, 0);
    standGroup.add(topPin);

    const botPin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 16), metalMat);
    botPin.position.set(0, -1.98, 0);
    standGroup.add(botPin);
    scene.add(standGroup);

    // 2. COMPOSITE PLANETARY GLOBE GROUP
    const globeGroup = new THREE.Group();
    globeGroup.rotation.z = THREE.MathUtils.degToRad(14);
    scene.add(globeGroup);

    const earthRadius = 1.72;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: colorMap,
      bumpMap,
      bumpScale: 0.035,
      metalness: 0.2,
      roughness: 0.62,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.castShadow = true;
    earthMesh.receiveShadow = true;
    globeGroup.add(earthMesh);

    // Translucent outer atmosphere shell
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.045, 48, 36);
    const atmosMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.12,
      roughness: 0.15,
      transmission: 0.35,
      side: THREE.FrontSide,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    globeGroup.add(atmosMesh);

    // Equatorial & Orbital Rings
    const eqRing = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.018, 12, 96), metalMat);
    eqRing.rotation.x = Math.PI / 2;
    globeGroup.add(eqRing);

    const dataRing = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.012, 10, 96), accentTrimMat);
    dataRing.rotation.x = Math.PI / 2.6;
    dataRing.rotation.y = 0.4;
    globeGroup.add(dataRing);

    // Bureau Beacon Meshes (Pickable)
    const beaconHitTargets: THREE.Mesh[] = [];
    const beaconGroups: Array<{ group: THREE.Group; basePos: THREE.Vector3; normal: THREE.Vector3; head: THREE.Mesh; bureau: BureauLocation }> = [];
    const scratchVec = new THREE.Vector3();

    NEWS_BUREAUS.forEach((bureau) => {
      const bGroup = new THREE.Group();
      const basePos = latLngToVector3(bureau.lat, bureau.lng, earthRadius, scratchVec).clone();
      const normal = basePos.clone().normalize();
      bGroup.position.copy(basePos);
      bGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.03, 16), metalMat);
      plinth.position.y = 0.015;
      bGroup.add(plinth);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.16, 10), metalMat);
      mast.position.y = 0.09;
      bGroup.add(mast);

      const headMat = new THREE.MeshStandardMaterial({
        color: bureau.id === selectedBureau.id ? 0xfbbf24 : 0xe1262d,
        emissive: bureau.id === selectedBureau.id ? 0xf59e0b : 0x991b1b,
        emissiveIntensity: 0.9,
        metalness: 0.3,
        roughness: 0.25,
      });
      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), headMat);
      head.position.y = 0.2;
      head.userData = { bureauId: bureau.id };
      bGroup.add(head);

      beaconHitTargets.push(head);
      beaconGroups.push({ group: bGroup, basePos, normal, head, bureau });
      globeGroup.add(bGroup);
    });

    // 3. COMPOSITE BROADCAST SATELLITES
    function createSatellite(): THREE.Group {
      const sat = new THREE.Group();
      const bus = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.1), darkChassisMat);
      sat.add(bus);

      const foilCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 12), metalMat);
      foilCollar.rotation.z = Math.PI / 2;
      sat.add(foilCollar);

      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        metalness: 0.65,
        roughness: 0.22,
      });
      const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.28), wingMat);
      leftWing.position.z = 0.21;
      sat.add(leftWing);

      const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.28), wingMat);
      rightWing.position.z = -0.21;
      sat.add(rightWing);

      const dish = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.045, 16, 1, true), metalMat);
      dish.position.y = -0.07;
      dish.rotation.x = Math.PI;
      sat.add(dish);
      return sat;
    }

    const sat1 = createSatellite();
    const sat2 = createSatellite();
    scene.add(sat1);
    scene.add(sat2);

    // Raycaster & pointer interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const updatePointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerMove = (ev: PointerEvent) => {
      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(beaconHitTargets, false);
      if (hits.length > 0) {
        const bId = hits[0].object.userData.bureauId as string;
        const matched = NEWS_BUREAUS.find((b) => b.id === bId);
        setHoveredCity(matched ? `${matched.city} (${matched.country})` : null);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredCity(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dx = ev.clientX - pointerDownPos.x;
      const dy = ev.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return;

      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(beaconHitTargets, false);
      if (hits.length > 0) {
        const bId = hits[0].object.userData.bureauId as string;
        const matched = NEWS_BUREAUS.find((b) => b.id === bId);
        if (matched) {
          setSelectedBureau(matched);
          setSelectedBureauId(matched.id);
          setAutoRotate(false);
          setCameraPreset('bureau');
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver for responsive viewport
    const resizeObs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, entry.contentRect.width);
        const h = Math.max(320, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObs.observe(container);

    // Animation loop with exponential damping & software-GL throttle
    let animId = 0;
    let lastTime = performance.now();
    let explodeCurrent = 0;
    let satPhase = 0;
    const targetCamPos = new THREE.Vector3(0, 2.2, 7.6);
    const desiredGoal = new THREE.Vector3();
    let userDragging = false;
    controls.addEventListener('start', () => {
      userDragging = true;
    });
    controls.addEventListener('end', () => {
      userDragging = false;
    });

    const afterDraw = (cb: () => void) => {
      if (isSoftwareGl) {
        setTimeout(() => requestAnimationFrame(cb), 28);
      } else {
        requestAnimationFrame(cb);
      }
    };

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const state = controlsStateRef.current;

      // Update finish material
      if (state.finish === 'titanium') {
        metalMat.color.setHex(0x94a3b8);
        metalMat.roughness = 0.28;
      } else if (state.finish === 'obsidian') {
        metalMat.color.setHex(0x263142);
        metalMat.roughness = 0.38;
      } else {
        metalMat.color.setHex(0xd4a44a);
        metalMat.roughness = 0.24;
      }

      if (state.autoRotate) {
        globeGroup.rotation.y += dt * 0.22;
      }

      // Exploded inspection separation
      explodeCurrent = THREE.MathUtils.damp(explodeCurrent, state.explodeTarget, 5, dt);
      atmosMesh.scale.setScalar(1 + explodeCurrent * 0.14);
      eqRing.scale.setScalar(1 + explodeCurrent * 0.18);
      dataRing.scale.setScalar(1 + explodeCurrent * 0.24);
      standGroup.position.y = -explodeCurrent * 0.45;
      beaconGroups.forEach((b) => {
        b.group.position.copy(b.basePos).addScaledVector(b.normal, explodeCurrent * 0.34);
        const isSelected = b.bureau.id === state.focusBureau.id;
        const hMat = b.head.material as THREE.MeshStandardMaterial;
        hMat.color.setHex(isSelected ? 0xfbbf24 : 0xe1262d);
        hMat.emissive.setHex(isSelected ? 0xf59e0b : 0x991b1b);
        b.head.scale.setScalar(isSelected ? 1.35 : 1);
      });

      // Orbit satellites
      satPhase += dt * 0.55;
      sat1.position.set(Math.cos(satPhase) * 2.68, Math.sin(satPhase * 0.8) * 0.85, Math.sin(satPhase) * 2.68);
      sat1.lookAt(0, 0, 0);
      sat2.position.set(
        Math.cos(-satPhase * 0.8 + 2.1) * 2.95,
        Math.cos(satPhase * 0.9) * 1.15,
        Math.sin(-satPhase * 0.8 + 2.1) * 2.95
      );
      sat2.lookAt(0, 0, 0);

      // Smooth damped camera preset motion when user isn't dragging
      if (!userDragging) {
        if (state.preset === 'editorial') {
          desiredGoal.set(0, 1.9, 7.2);
        } else if (state.preset === 'polar') {
          desiredGoal.set(0.4, 6.2, 3.8);
        } else if (state.preset === 'orbital') {
          desiredGoal.set(5.4, 2.6, 5.4);
        } else if (state.preset === 'bureau') {
          const bWorld = latLngToVector3(state.focusBureau.lat, state.focusBureau.lng, 5.2, scratchVec);
          bWorld.applyEuler(globeGroup.rotation);
          desiredGoal.copy(bWorld).add(new THREE.Vector3(0, 0.8, 0));
        }

        targetCamPos.x = THREE.MathUtils.damp(camera.position.x, desiredGoal.x, 3.5, dt);
        targetCamPos.y = THREE.MathUtils.damp(camera.position.y, desiredGoal.y, 3.5, dt);
        targetCamPos.z = THREE.MathUtils.damp(camera.position.z, desiredGoal.z, 3.5, dt);
        if (camera.position.distanceTo(desiredGoal) > 0.04 && state.preset !== 'editorial') {
          camera.position.copy(targetCamPos);
        }
      }

      controls.update();
      renderer.render(scene, camera);
      animId = 1;
      afterDraw(() => {
        if (animId !== 0) tick();
      });
    };

    tick();

    return () => {
      animId = 0;
      resizeObs.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      roomEnv.dispose();
      envTex.dispose();
      pmrem.dispose();
      colorMap.dispose();
      bumpMap.dispose();
      brushedTex.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [setSelectedBureauId]);

  const bureauArticle =
    publishedArticles.find((a) =>
      (a.locationName || '').toLowerCase().includes(selectedBureau.city.toLowerCase())
    ) || publishedArticles[0];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#E1262D] font-bold">
            Interactive 3D Newsroom Telemetry
          </span>
          <h2 className="font-display text-3xl font-bold text-neutral-900 dark:text-white mt-1">
            Global Broadcast Globe Studio
          </h2>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
          Drag to orbit, scroll to inspect, or click any glowing bureau beacon on the planetary gimbal to inspect live regional dispatches.
        </p>
      </div>

      {/* WebGL Viewport Container */}
      <div className="relative h-[560px] rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-[#0b101b]">
        {/* Isolated empty Three.js mount container */}
        <div ref={mountRef} className="absolute inset-0" />

        {/* Solid opaque info card (NO backdrop-blur over WebGL) */}
        <div className="absolute top-4 left-4 z-10 w-72 sm:w-80 bg-[#111827] border border-neutral-700 rounded-md p-4 text-white shadow-xl">
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-amber-300 uppercase tracking-wider">
            <span>{activeBureauInfo.city} Bureau</span>
            <span>{activeBureauInfo.weatherTempC || 'Live'}</span>
          </div>
          <h3 className="font-display text-base font-bold mt-1">{activeBureauInfo.deskFocus}</h3>
          {hoveredCity && (
            <div className="mt-1.5 text-[11px] font-mono text-sky-300">
              Hovering beacon: {hoveredCity}
            </div>
          )}
          {bureauArticle && (
            <div className="mt-3 pt-3 border-t border-neutral-800">
              <div className="text-[11px] text-neutral-400">Latest Dispatch</div>
              <button
                type="button"
                onClick={() => openArticle(bureauArticle)}
                className="text-left text-xs font-semibold text-white hover:text-[#E1262D] mt-0.5 line-clamp-2 cursor-pointer flex items-start gap-1"
              >
                <span className="flex-1">{bureauArticle.title}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Bottom Control Dock (Solid surface, <= 15% height) */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex justify-center pointer-events-none">
          <div className="pointer-events-auto bg-[#111827] border border-neutral-700 rounded-md px-3 py-2 text-white shadow-xl max-w-4xl w-full">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Compass className="w-4 h-4 text-[#E1262D]" />
                <span>Studio Controls</span>
              </div>
              <button
                type="button"
                onClick={() => setDockOpen((v) => !v)}
                className="text-xs text-neutral-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{dockOpen ? 'Collapse' : 'Expand'}</span>
                {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {dockOpen && (
              <div className="mt-2 pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Camera Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-400 font-mono text-[11px]">View:</span>
                  {(['editorial', 'polar', 'orbital'] as CameraPreset[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCameraPreset(p)}
                      className={`px-2 py-1 rounded capitalize cursor-pointer ${
                        cameraPreset === p ? 'bg-[#E1262D] text-white font-semibold' : 'bg-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Bureau Selector */}
                <select
                  aria-label="Jump to bureau beacon"
                  value={selectedBureau.id}
                  onChange={(e) => {
                    const b = NEWS_BUREAUS.find((item) => item.id === e.target.value);
                    if (b) {
                      setSelectedBureau(b);
                      setSelectedBureauId(b.id);
                      setAutoRotate(false);
                      setCameraPreset('bureau');
                    }
                  }}
                  className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white cursor-pointer"
                >
                  {NEWS_BUREAUS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.city}
                    </option>
                  ))}
                </select>

                {/* Hardware Finish */}
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-400 font-mono text-[11px]">Gimbal:</span>
                  {(['titanium', 'obsidian', 'brass'] as FinishSwatch[]).map((sw) => (
                    <button
                      key={sw}
                      type="button"
                      onClick={() => setFinish(sw)}
                      className={`px-2 py-1 rounded capitalize cursor-pointer ${
                        finish === sw ? 'bg-white text-neutral-900 font-bold' : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {sw}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExplodeView((v) => !v)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer ${
                      explodeView ? 'bg-[#0D47FF] text-white' : 'bg-neutral-800 text-neutral-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Inspect Layers</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoRotate((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 text-neutral-200 hover:text-white cursor-pointer"
                  >
                    {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{autoRotate ? 'Pause' : 'Orbit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExplodeView(false);
                      setAutoRotate(true);
                      setCameraPreset('editorial');
                    }}
                    className="p-1 rounded bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                    title="Reset camera"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
