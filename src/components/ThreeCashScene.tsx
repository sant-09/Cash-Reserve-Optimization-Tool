import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useCash } from '../context/CashContext';
import { formatCompactINR, formatINR } from '../utils/finance';
import { VaultDisplayMode } from '../types/finance';
import { Vault2DView } from './Vault2DView';
import {
  Maximize2,
  Minimize2,
  Rotate3d,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Box,
  Wallet,
  Clock,
} from 'lucide-react';

export const ThreeCashScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { metrics, minCashRequired, isDarkMode } = useCash();

  // View Mode: 3D interactive vs Flat 2D architectural ledger
  const [viewMode, setViewMode] = useState<VaultDisplayMode>(() => {
    try {
      return (localStorage.getItem('cashwise_vault_view_mode') as VaultDisplayMode) || '3d';
    } catch {
      return '3d';
    }
  });

  const handleToggleViewMode = (mode: VaultDisplayMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('cashwise_vault_view_mode', mode);
    } catch {}
  };

  // Interactive controls state
  const [explodedView, setExplodedView] = useState(0); // 0 (closed) to 1 (fully inspected)
  const [isRotating, setIsRotating] = useState(true);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState<'front' | 'angle' | 'top'>('angle');

  // Refs for animation loop
  const animFrameIdRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vaultGroupRef = useRef<THREE.Group | null>(null);
  const doorGroupRef = useRef<THREE.Group | null>(null);
  const coinStacksRef = useRef<THREE.Group | null>(null);
  const dialRef = useRef<THREE.Mesh | null>(null);
  const targetExplodeRef = useRef(0);
  const targetCamPosRef = useRef(new THREE.Vector3(3.2, 2.5, 4.2));

  // Sync state with animation ref
  useEffect(() => {
    targetExplodeRef.current = explodedView;
  }, [explodedView]);

  useEffect(() => {
    if (viewMode !== '3d') return;
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Background Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(isDarkMode ? 0x0a1120 : 0x0f172a);
    scene.fog = new THREE.FogExp2(isDarkMode ? 0x0a1120 : 0x0f172a, 0.05);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      50
    );
    camera.position.set(3.2, 2.5, 4.2);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    // 3. Renderer with PBR color pipeline
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Studio Lighting Rig (Key, Fill, Rim)
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.8);
    keyLight.position.set(5, 7, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 1.5);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    // 6. Ground & Contact Shadow
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d1527,
      roughness: 0.85,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Soft Contact Shadow Plane directly beneath the vault
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.005;
    scene.add(contactShadow);

    // 7. COMPOSITE 3-12 PART PROCEDURAL VAULT (THREE.Group)
    const vaultGroup = new THREE.Group();
    vaultGroupRef.current = vaultGroup;
    scene.add(vaultGroup);

    // Part 1: Heavy Reinforced Base Plinth
    const plinthGeo = new THREE.BoxGeometry(2.2, 0.16, 2.0);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.75,
      roughness: 0.35,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = 0.08;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    vaultGroup.add(plinth);

    // Part 2: Main Vault Safe Outer Hull
    const hullGeo = new THREE.BoxGeometry(1.8, 1.8, 1.6);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.25,
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 1.06;
    hull.castShadow = true;
    hull.receiveShadow = true;
    vaultGroup.add(hull);

    // Part 3: Interior Cash Chamber (Cavity)
    const cavityGeo = new THREE.BoxGeometry(1.5, 1.5, 1.4);
    const cavityMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.1,
    });
    const cavity = new THREE.Mesh(cavityGeo, cavityMat);
    cavity.position.set(0, 1.06, 0.08);
    vaultGroup.add(cavity);

    // Part 4: Beveled Frame Trim Bezel
    const frameGeo = new THREE.BoxGeometry(1.88, 1.88, 0.12);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.95,
      roughness: 0.18,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 1.06, 0.82);
    frame.castShadow = true;
    vaultGroup.add(frame);

    // PART 5: VAULT DOOR GROUP (Pivot hinge on left)
    const doorGroup = new THREE.Group();
    doorGroupRef.current = doorGroup;
    doorGroup.position.set(-0.85, 1.06, 0.86); // Left hinge pivot
    vaultGroup.add(doorGroup);

    // Door Slab
    const doorSlabGeo = new THREE.BoxGeometry(1.68, 1.68, 0.18);
    const doorSlabMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.92,
      roughness: 0.2,
    });
    const doorSlab = new THREE.Mesh(doorSlabGeo, doorSlabMat);
    doorSlab.position.set(0.84, 0, 0); // offset from pivot
    doorSlab.castShadow = true;
    doorGroup.add(doorSlab);

    // Part 6: Circular Reinforced Central Core
    const coreGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Polished Brass / Gold Accent
      metalness: 0.95,
      roughness: 0.15,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(0.84, 0.1, 0.12);
    core.castShadow = true;
    doorGroup.add(core);

    // Part 7: Combination Lock Dial
    const dialGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 32);
    const dialMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.98,
      roughness: 0.1,
    });
    const dial = new THREE.Mesh(dialGeo, dialMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0.84, 0.1, 0.18);
    dialRef.current = dial;
    doorGroup.add(dial);

    // Part 8: 3-Spoke Chrome Wheel Handle
    const spokeGroup = new THREE.Group();
    spokeGroup.position.set(0.84, -0.32, 0.14);
    doorGroup.add(spokeGroup);

    const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24);
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.1,
    });
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    hub.rotation.x = Math.PI / 2;
    spokeGroup.add(hub);

    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const spokeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.38, 12);
      const spoke = new THREE.Mesh(spokeGeo, chromeMat);
      spoke.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0);
      spoke.rotation.z = angle - Math.PI / 2;
      spokeGroup.add(spoke);
    }

    // PART 9: DYNAMIC CASH RESERVE & SAFE SURPLUS COIN STACKS
    const coinStacks = new THREE.Group();
    coinStacksRef.current = coinStacks;
    coinStacks.position.set(0, 0.35, 0);
    vaultGroup.add(coinStacks);

    // Helper to build a cylinder coin stack
    const createCoinStack = (x: number, z: number, coinCount: number, isSurplus = false) => {
      const stack = new THREE.Group();
      stack.position.set(x, 0, z);

      const coinGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 20);
      const coinMat = new THREE.MeshStandardMaterial({
        color: isSurplus ? 0x10b981 : 0xf59e0b, // Emerald for Safe Surplus, Gold for Reserve
        metalness: 0.9,
        roughness: 0.22,
      });

      for (let j = 0; j < coinCount; j++) {
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.position.y = j * 0.045;
        coin.rotation.y = j * 0.2;
        coin.castShadow = true;
        stack.add(coin);
      }
      return stack;
    };

    // Populate realistic internal coin stacks based on ratio
    const reserveCoins = Math.min(14, Math.max(3, Math.round(minCashRequired / 25000)));
    const surplusCoins = Math.min(
      14,
      Math.max(1, Math.round(Math.max(0, metrics.safeSurplus) / 25000))
    );

    // Left shelf: Minimum Operating Reserve buffer
    coinStacks.add(createCoinStack(-0.35, -0.15, reserveCoins, false));
    coinStacks.add(createCoinStack(-0.35, 0.2, Math.max(2, reserveCoins - 2), false));

    // Right shelf: Safe Free Surplus
    coinStacks.add(createCoinStack(0.35, -0.15, surplusCoins, true));
    coinStacks.add(createCoinStack(0.35, 0.2, Math.max(1, surplusCoins - 1), true));

    // PART 10: ORBITING HOLOGRAPHIC SAFETY SHIELD RING
    const ringGeo = new THREE.TorusGeometry(1.6, 0.015, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.8,
      roughness: 0.2,
      metalness: 0.9,
    });
    const shieldRing = new THREE.Mesh(ringGeo, ringMat);
    shieldRing.rotation.x = Math.PI / 2;
    shieldRing.position.y = 1.06;
    vaultGroup.add(shieldRing);

    // 8. Interactive Mouse / Pointer Orbit Damping
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotationVelocityX = 0;
    let rotationVelocityY = 0;

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: MouseEvent) => {
      if (!isDragging || !vaultGroupRef.current) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      rotationVelocityY = deltaX * 0.005;
      rotationVelocityX = deltaY * 0.003;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    // 9. Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. ANIMATION LOOP (Damped Spring Kinematics)
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);

      // Auto rotation if enabled
      if (isRotating && !isDragging && vaultGroupRef.current) {
        vaultGroupRef.current.rotation.y += 0.35 * delta;
      }

      // Drag inertia
      if (vaultGroupRef.current) {
        vaultGroupRef.current.rotation.y += rotationVelocityY;
        vaultGroupRef.current.rotation.x = THREE.MathUtils.clamp(
          vaultGroupRef.current.rotation.x + rotationVelocityX,
          -0.3,
          0.6
        );
        rotationVelocityX *= 0.92;
        rotationVelocityY *= 0.92;
      }

      // Damped Vault Door Swing (open when explodedView is high)
      if (doorGroupRef.current) {
        const targetDoorAngle = -targetExplodeRef.current * (Math.PI * 0.58);
        doorGroupRef.current.rotation.y = THREE.MathUtils.damp(
          doorGroupRef.current.rotation.y,
          targetDoorAngle,
          5,
          delta
        );
      }

      // Rotate combination dial smoothly
      if (dialRef.current) {
        dialRef.current.rotation.z += 0.8 * delta;
      }

      // Pulse holographic shield ring
      if (shieldRing) {
        shieldRing.rotation.z += 0.5 * delta;
      }

      // Damped camera navigation to preset
      if (cameraRef.current) {
        cameraRef.current.position.lerp(targetCamPosRef.current, 0.06);
        cameraRef.current.lookAt(0, 0.8, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [minCashRequired, metrics.safeSurplus, viewMode, isDarkMode]);

  // Camera preset handler
  const setCameraPreset = (preset: 'front' | 'angle' | 'top') => {
    setActivePreset(preset);
    if (preset === 'front') {
      targetCamPosRef.current.set(0, 1.2, 4.0);
    } else if (preset === 'angle') {
      targetCamPosRef.current.set(3.2, 2.5, 4.2);
    } else if (preset === 'top') {
      targetCamPosRef.current.set(0.1, 4.6, 1.8);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* 1. Unblocked Key Numbers Access Strip (Always visible, never blocked by 3D or 2D) */}
      <div
        role="region"
        aria-label="Vault Key Liquidity Figures"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-slate-400" />
            <span>Total Liquid Cash</span>
          </div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
            {formatINR(metrics.currentBalance)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Locked Safety Reserve</span>
          </div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
            {formatINR(minCashRequired)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            metrics.safeSurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Safe Free Surplus</span>
          </div>
          <div className={`text-base sm:text-xl font-extrabold font-mono mt-0.5 ${
            metrics.safeSurplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatINR(metrics.safeSurplus)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Cash Runway</span>
          </div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
            {metrics.daysOfCashLeft} Days
          </div>
        </div>
      </div>

      {/* 2. Visual View Mode Selector (Interactive 3D vs Flat 2D) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Visual Presentation:
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            Toggle between interactive 3D WebGL ingot fortress and flat 2D architectural ledger.
          </span>
        </div>

        {/* Segmented Mode Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl" role="tablist" aria-label="Vault View Modes">
          <button
            type="button"
            role="tab"
            id="tab-vault-3d"
            aria-selected={viewMode === '3d'}
            aria-controls="panel-vault-3d"
            onClick={() => handleToggleViewMode('3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === '3d'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-emerald-500" />
            <span>Interactive 3D</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-vault-2d"
            aria-selected={viewMode === '2d'}
            aria-controls="panel-vault-2d"
            onClick={() => handleToggleViewMode('2d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === '2d'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Flat 2D View</span>
          </button>
        </div>
      </div>

      {/* 3. View Presentation Content */}
      {viewMode === '2d' ? (
        <div id="panel-vault-2d" role="tabpanel" aria-labelledby="tab-vault-2d">
          <Vault2DView />
        </div>
      ) : (
        <div
          id="panel-vault-3d"
          role="tabpanel"
          aria-labelledby="tab-vault-3d"
          className="relative w-full h-[520px] sm:h-[600px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl select-none"
        >
          {/* 3D WebGL Canvas Mount Container */}
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Top HUD Cluster (Minimal Spec Badge) */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white pointer-events-auto backdrop-blur-none">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-bold tracking-tight">3D Capital Fortress & Vault</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 font-mono text-[11px]">Procedural PBR (Three.js)</span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setIsRotating(!isRotating)}
                title="Toggle Auto Rotation"
                className={`p-2 rounded-xl text-xs font-semibold border transition-colors ${
                  isRotating
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Rotate3d className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Financial Ingot HUD Overlays with Exact INR labels */}
          <div className="absolute top-16 left-4 pointer-events-none space-y-2">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-white max-w-[200px] pointer-events-auto shadow-lg">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>Minimum Reserve Buffer</span>
              </div>
              <div className="text-sm font-bold font-mono mt-0.5">
                {formatINR(minCashRequired)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Non-negotiable 3-month operating payroll & vendor safety net
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-white max-w-[200px] pointer-events-auto shadow-lg">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>Safe Free Surplus</span>
              </div>
              <div className={`text-sm font-bold font-mono mt-0.5 ${
                metrics.safeSurplus < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {formatINR(metrics.safeSurplus)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {metrics.safeSurplus > 0
                  ? 'Deployed in Liquid Mutual Funds / Short-Term FDs'
                  : 'Deficit buffer, prioritize invoice collection'}
              </p>
            </div>
          </div>

          {/* Unified Bottom Control Dock (<= 15% viewport footprint) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 pointer-events-auto">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-3 space-y-2.5">
              
              {/* Header toggle */}
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-white">Vault Mechanics & Chamber Controls</span>
                </div>
                <button
                  onClick={() => setHudCollapsed(!hudCollapsed)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                  aria-label="Toggle HUD"
                >
                  {hudCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {!hudCollapsed && (
                <div className="space-y-3 pt-1 border-t border-slate-800/80 text-xs">
                  
                  {/* Door Swing / Inspection Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Open Safe Door & Inspect Cash Ingot Stacks</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {Math.round(explodedView * 100)}% Open
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={explodedView}
                      onChange={(e) => setExplodedView(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Camera Presets & Fast Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">Camera Angle:</span>
                    <div className="flex items-center gap-1.5">
                      {(['angle', 'front', 'top'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setCameraPreset(p)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-colors ${
                            activePreset === p
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p} View
                        </button>
                      ))}
                      <button
                        onClick={() => setExplodedView(explodedView > 0.5 ? 0 : 1)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 text-emerald-400 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        {explodedView > 0.5 ? 'Lock Vault' : 'Unlock Door'}
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
