import * as THREE from 'three';
import {
  createInitialSkeleton,
  createInitialState,
  isSoftwareGl,
  OperatorSkeleton,
  OperatorState
} from '../types';
import { initMaterials } from '../materials/initMaterials';
import {
  setupEnvironmentMap,
  setupLighting,
  setupPostProcessing
} from '../environment/environmentAndLighting';
import { buildTacticalOperator } from '../operator/buildTacticalOperator';
import { updateWeaponAndArmsIK } from '../operator/buildArmsAndWeapon';
import { optimizeOperatorHierarchy } from './sceneOptimizer';

/**
 * Monta e inicializa la escena 3D completa del Operador Táctico Tier-1
 * en el contenedor DOM indicado y devuelve una función de limpieza (cleanup)
 * para desmontar eventos, detener el bucle de animación y liberar recursos WebGL.
 */
export function mountTacticalScene(
  container: HTMLElement,
  onReady?: () => void
): () => void {
  const clock = new THREE.Clock();
  const state: OperatorState = createInitialState();
  const skeleton: OperatorSkeleton = createInitialSkeleton();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = null;

  const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    60
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Limitar DPR a 1.5 en pantallas Retina/4K para multiplicar el framerate manteniendo nitidez sub-píxel
  renderer.setPixelRatio(isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio, 1.5));

  // Configuración del motor de renderizado PBR cinematográfico con auto-sombras de alta resolución
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  container.appendChild(renderer.domElement);

  // IBL de Estudio Fotográfico con PMREM
  setupEnvironmentMap(renderer, scene);

  // Inicializar librería de materiales PBR avanzados con Shaders GLSL personalizados
  const materials = initMaterials();

  // Configurar Iluminación Cinematográfica de Estudio (sin conos ni elementos de fondo)
  setupLighting(scene);

  // Construir únicamente el Operador Táctico Tier-1 (sin suelo ni base ni fondo)
  const operatorGroup = buildTacticalOperator(scene, materials, skeleton);

  // Posicionar los brazos inicialmente antes de la fusión estática por hueso
  if (skeleton.rightWristTarget && skeleton.leftWristTarget) {
    updateWeaponAndArmsIK(skeleton, 0, 0);
  }

  // Fusión jerárquica sin pérdida (Lossless Skeletal Static Batching):
  // Agrupa las ~700 sub-mallas estáticas en ~45 mallas por hueso y material sin perder ni un solo vértice
  optimizeOperatorHierarchy(operatorGroup, skeleton);

  const dustParticles: THREE.Points | null = null;

  // Inicializar el Pipeline de Post-Procesado con EffectComposer (solo en GPU dedicada/integrada)
  const postProc = !isSoftwareGl ? setupPostProcessing(renderer, scene, camera) : null;
  const composer = postProc?.composer ?? null;
  const ssaoPass = postProc?.ssaoPass ?? null;
  const bloomPass = postProc?.bloomPass ?? null;

  // Pre-compilar todos los shaders PBR y GLSL una sola vez antes de mostrar la escena
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // Exponer estado táctico y cámara para inspección y telemetría
  (window as unknown as { __tacticalState?: unknown }).__tacticalState = Object.assign(state, {
    camera,
    controls: {
      target: state.targetLookAt,
      update: () => {
        state.camLookAt.copy(state.targetLookAt);
        const offset = new THREE.Vector3().subVectors(camera.position, state.targetLookAt);
        const r = offset.length();
        if (r > 0.01) {
          state.targetSpherical.radius = r;
          state.camSpherical.radius = r;
          state.targetSpherical.phi = Math.acos(THREE.MathUtils.clamp(offset.y / r, -1, 1));
          state.camSpherical.phi = state.targetSpherical.phi;
          state.targetSpherical.theta = Math.atan2(offset.x, offset.z);
          state.camSpherical.theta = state.targetSpherical.theta;
        }
      }
    }
  });

  (window as unknown as { __tacticalEngine?: unknown }).__tacticalEngine = {
    state,
    skeleton,
    materials,
    setCameraPreset: (preset: 'helmet' | 'nvg' | 'headset' | 'rear' | 'full') => {
      lastInteractionTime = performance.now();
      if (preset === 'helmet') {
        state.targetLookAt.set(0, 1.748, 0.032);
        state.targetSpherical.radius = 0.46;
        state.targetSpherical.theta = 0.36;
        state.targetSpherical.phi = 1.36;
      } else if (preset === 'nvg') {
        state.targetLookAt.set(0, 1.745, 0.055);
        state.targetSpherical.radius = 0.40;
        state.targetSpherical.theta = 0.04;
        state.targetSpherical.phi = 1.40;
      } else if (preset === 'headset') {
        state.targetLookAt.set(0.04, 1.745, 0.02);
        state.targetSpherical.radius = 0.44;
        state.targetSpherical.theta = 1.15;
        state.targetSpherical.phi = 1.38;
      } else if (preset === 'rear') {
        state.targetLookAt.set(0, 1.755, -0.03);
        state.targetSpherical.radius = 0.48;
        state.targetSpherical.theta = Math.PI - 0.22;
        state.targetSpherical.phi = 1.32;
      } else {
        state.targetLookAt.set(0, 0.96, 0.08);
        state.targetSpherical.radius = 2.85;
        state.targetSpherical.theta = -0.16;
        state.targetSpherical.phi = 1.42;
      }
    },
    toggleNVG: () => {
      lastInteractionTime = performance.now();
      state.nvgDeployed = !state.nvgDeployed;
      renderer.shadowMap.needsUpdate = true;
      return state.nvgDeployed;
    },
    toggleHeadLight: () => {
      lastInteractionTime = performance.now();
      state.headLightActive = state.headLightActive === false ? true : false;
      return state.headLightActive;
    },
    toggleStrobe: () => {
      lastInteractionTime = performance.now();
      state.strobeActive = state.strobeActive === false ? true : false;
      return state.strobeActive;
    },
    toggleIRMode: () => {
      lastInteractionTime = performance.now();
      state.irModeActive = !state.irModeActive;
      if (bloomPass) {
        bloomPass.strength = state.irModeActive ? 0.48 : 0.22;
      }
      renderer.toneMappingExposure = state.irModeActive ? 1.28 : 1.12;
      return state.irModeActive;
    }
  };

  // ============================================================================
  // EVENTOS DE INTERACCIÓN (Cámara Orbital Suave + Seguimiento Ocular)
  // ============================================================================
  const dom = renderer.domElement;
  let lastInteractionTime = performance.now();

  const onContextMenu = (e: MouseEvent) => e.preventDefault();

  const onMouseDown = (e: MouseEvent) => {
    lastInteractionTime = performance.now();
    if (e.button === 2 || e.shiftKey) {
      state.isPanning = true;
    } else {
      state.isDragging = true;
    }
    state.prevMouse.x = e.clientX;
    state.prevMouse.y = e.clientY;
  };

  const onMouseUp = () => {
    state.isDragging = false;
    state.isPanning = false;
  };

  const onMouseMove = (e: MouseEvent) => {
    state.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (!state.isDragging && !state.isPanning) return;
    lastInteractionTime = performance.now();
    const dx = e.clientX - state.prevMouse.x;
    const dy = e.clientY - state.prevMouse.y;
    state.prevMouse.x = e.clientX;
    state.prevMouse.y = e.clientY;

    if (state.isPanning) {
      state.targetLookAt.y = THREE.MathUtils.clamp(state.targetLookAt.y + dy * 0.003, 0.08, 2.15);
      return;
    }

    state.targetSpherical.theta -= dx * 0.0065;
    state.targetSpherical.phi = THREE.MathUtils.clamp(
      state.targetSpherical.phi - dy * 0.0055,
      0.45,
      1.66
    );
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    lastInteractionTime = performance.now();
    state.targetSpherical.radius = THREE.MathUtils.clamp(
      state.targetSpherical.radius + e.deltaY * 0.0012,
      0.26,
      4.8
    );
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      lastInteractionTime = performance.now();
      state.isDragging = true;
      state.prevMouse.x = e.touches[0].clientX;
      state.prevMouse.y = e.touches[0].clientY;
    }
  };

  const onTouchEnd = () => {
    state.isDragging = false;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!state.isDragging || e.touches.length !== 1) return;
    lastInteractionTime = performance.now();
    const dx = e.touches[0].clientX - state.prevMouse.x;
    const dy = e.touches[0].clientY - state.prevMouse.y;
    state.prevMouse.x = e.touches[0].clientX;
    state.prevMouse.y = e.touches[0].clientY;

    state.targetSpherical.theta -= dx * 0.0065;
    state.targetSpherical.phi = THREE.MathUtils.clamp(
      state.targetSpherical.phi - dy * 0.0055,
      0.45,
      1.66
    );
  };

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const halfW = Math.max(1, Math.floor(w * 0.5));
    const halfH = Math.max(1, Math.floor(h * 0.5));

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    if (composer) {
      composer.setSize(w, h);
    }
    if (ssaoPass) {
      ssaoPass.setSize(halfW, halfH);
    }
    if (bloomPass && bloomPass.resolution) {
      bloomPass.resolution.set(halfW, halfH);
    }
  };

  dom.addEventListener('contextmenu', onContextMenu);
  dom.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  dom.addEventListener('wheel', onWheel, { passive: false });
  dom.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('resize', onResize);

  // Notificar que la escena ha terminado de inicializarse
  if (onReady) {
    onReady();
  }

  // ============================================================================
  // BUCLE DE ANIMACIÓN Y RENDERIZADO CINEMATOGRÁFICO EN TIEMPO REAL (ZERO-GC)
  // ============================================================================
  let isDisposed = false;
  let rafId = 0;
  let syncTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let prevHeadLightOn: boolean | null = null;
  let prevIrMode: boolean | null = null;

  function afterDraw(cb: () => void, isInteractive: boolean) {
    if (isDisposed) return;
    const nextDelay = isInteractive ? 4 : 24;
    const pollInterval = isInteractive ? 2 : 4;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    if (!sync) {
      syncTimeoutId = setTimeout(cb, nextDelay);
      return;
    }
    const poll = () => {
      if (isDisposed) {
        gl.deleteSync(sync);
        return;
      }
      const stateSync = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (stateSync === gl.UNSIGNALED) {
        syncTimeoutId = setTimeout(poll, pollInterval);
      } else {
        gl.deleteSync(sync);
        syncTimeoutId = setTimeout(cb, nextDelay);
      }
    };
    syncTimeoutId = setTimeout(poll, pollInterval);
  }

  function animate() {
    if (isDisposed) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.elapsedTime;
    const dampFactor = 1.0 - Math.exp(-10.0 * dt);

    // 1. Interpolación suave independiente de la tasa de refresco (60Hz / 120Hz / 144Hz)
    const dRadius = state.targetSpherical.radius - state.camSpherical.radius;
    const dTheta = state.targetSpherical.theta - state.camSpherical.theta;
    const dPhi = state.targetSpherical.phi - state.camSpherical.phi;

    state.camSpherical.radius += dRadius * dampFactor;
    state.camSpherical.theta += dTheta * dampFactor;
    state.camSpherical.phi += dPhi * dampFactor;
    state.camLookAt.lerp(state.targetLookAt, dampFactor);

    const sinPhi = Math.sin(state.camSpherical.phi);
    camera.position.x = state.camLookAt.x + state.camSpherical.radius * sinPhi * Math.sin(state.camSpherical.theta);
    camera.position.y = state.camLookAt.y + state.camSpherical.radius * Math.cos(state.camSpherical.phi);
    camera.position.z = state.camLookAt.z + state.camSpherical.radius * sinPhi * Math.cos(state.camSpherical.theta);
    camera.lookAt(state.camLookAt);

    state.focusDistance = state.camSpherical.radius;

    // 2. Animación orgánica de respiración, latido táctico y seguimiento ocular/cefálico
    if (skeleton.chest && skeleton.head) {
      const breath = Math.sin(elapsed * 2.05);
      const sway = Math.cos(elapsed * 1.05);

      skeleton.chest.position.y = 0.22 + breath * 0.0022;
      skeleton.chest.rotation.x = breath * 0.008;
      skeleton.spine.rotation.y = sway * 0.010;

      // Resolver Cinemática Inversa (2-Bone IK Zero-GC) en tiempo real
      if (skeleton.rightWristTarget && skeleton.leftWristTarget) {
        updateWeaponAndArmsIK(skeleton, 0, breath);
      }

      // Seguimiento natural de la cabeza y los ojos húmedos hacia el cursor
      const targetHeadYaw = THREE.MathUtils.clamp(state.mouseNDC.x * 0.22, -0.26, 0.26);
      const targetHeadPitch = THREE.MathUtils.clamp(-state.mouseNDC.y * 0.14, -0.16, 0.16);
      const headDamp = 1.0 - Math.exp(-6.0 * dt);

      skeleton.head.rotation.y += (targetHeadYaw - skeleton.head.rotation.y) * headDamp;
      skeleton.head.rotation.x += (targetHeadPitch - skeleton.head.rotation.x) * headDamp;

      if (skeleton.eyes) {
        for (let i = 0; i < skeleton.eyes.length; i++) {
          skeleton.eyes[i].rotation.y = targetHeadYaw * 0.45;
          skeleton.eyes[i].rotation.x = targetHeadPitch * 0.45;
        }
      }
    }

    // 2b. Cinemática compuesta del visor nocturno GPNVG-18 en montura Wilcox L4 G24 (sin colisión con el casco)
    if (skeleton.nvgPivot) {
      const deployed = state.nvgDeployed !== false;
      const targetNvgAngle = deployed ? 0.0 : 0.24;
      const targetNvgY = deployed ? 0.046 : 0.114;
      const targetNvgZ = deployed ? 0.132 : 0.088;
      const nvgDelta = Math.abs(targetNvgAngle - skeleton.nvgPivot.rotation.x);

      if (nvgDelta > 0.0005) {
        const nvgDamp = 1.0 - Math.exp(-9.0 * dt);
        skeleton.nvgPivot.rotation.x += (targetNvgAngle - skeleton.nvgPivot.rotation.x) * nvgDamp;
        skeleton.nvgPivot.position.y += (targetNvgY - skeleton.nvgPivot.position.y) * nvgDamp;
        skeleton.nvgPivot.position.z += (targetNvgZ - skeleton.nvgPivot.position.z) * nvgDamp;
        if (!isSoftwareGl && nvgDelta < 0.02) {
          renderer.shadowMap.needsUpdate = true;
        }
      }

      if (skeleton.nvgOcularMesh) {
        skeleton.nvgOcularMesh.visible = deployed;
      }
      if (skeleton.nvgIrEmitterMesh) {
        skeleton.nvgIrEmitterMesh.visible = deployed;
      }
      if (skeleton.nvgLight) {
        const targetPhosphor = deployed ? (state.irModeActive ? 1.65 : 0.95) : 0.0;
        skeleton.nvgLight.intensity += (targetPhosphor - skeleton.nvgLight.intensity) * 0.15;
      }
      materials.nvgLens.emissiveIntensity = deployed
        ? state.irModeActive
          ? 0.85
          : 0.48
        : 0.18;
    }

    // 2c. Linterna Táctica de Cabeza SureFire M340V Vampire (actualización por dirty-flag sin coste por frame)
    const headLightOn = state.headLightActive !== false;
    const irActive = Boolean(state.irModeActive);
    if (headLightOn !== prevHeadLightOn || irActive !== prevIrMode) {
      prevHeadLightOn = headLightOn;
      prevIrMode = irActive;
      if (skeleton.headLight && skeleton.headPointLight) {
        skeleton.headLight.intensity = headLightOn ? (irActive ? 7.2 : 5.5) : 0.0;
        skeleton.headPointLight.intensity = headLightOn ? 1.25 : 0.0;
        skeleton.headLight.color.setHex(irActive ? 0x6ee7b7 : 0xfff5e6);
      }
      if (skeleton.headLightBeam) {
        skeleton.headLightBeam.visible = headLightOn;
        const beamMat = skeleton.headLightBeam.material as THREE.ShaderMaterial;
        if (beamMat.uniforms?.uColor) {
          beamMat.uniforms.uColor.value.setHex(irActive ? 0x34d399 : 0xfff7ed);
        }
        if (beamMat.uniforms?.uIntensity) {
          beamMat.uniforms.uIntensity.value = irActive ? 1.35 : 1.0;
        }
      }
      if (skeleton.headLightEmitter) {
        const emMat = skeleton.headLightEmitter.material as THREE.MeshBasicMaterial;
        emMat.color.setHex(
          headLightOn ? (irActive ? 0x34d399 : 0xfffbeb) : 0x334155
        );
      }
    }

    // 2d. Baliza Estroboscópica Superior IFF CORE Survival Hel-Star 6 Gen III+ (Doble pulso táctico)
    if (skeleton.strobeMesh && skeleton.strobeLight) {
      if (state.strobeActive !== false) {
        const strobeCycle = (elapsed * 1.45) % 1.0;
        const isFlash = strobeCycle < 0.08 || (strobeCycle > 0.15 && strobeCycle < 0.23);
        skeleton.strobeMesh.visible = isFlash;
        skeleton.strobeLight.intensity = isFlash ? 2.4 : 0.04;
        materials.strobeDomeGlass.emissiveIntensity = isFlash ? 1.15 : 0.22;
      } else {
        skeleton.strobeMesh.visible = false;
        skeleton.strobeLight.intensity = 0;
        materials.strobeDomeGlass.emissiveIntensity = 0.05;
      }
    }

    // 3. Simulación de partículas atmosféricas 100% en Vertex Shader GPU (Cero bucle CPU ni subidas de buffer)
    if (dustParticles) {
      dustParticles.rotation.y = elapsed * 0.022;
      if (dustParticles.userData.uTime) {
        dustParticles.userData.uTime.value = elapsed;
      }
    }

    // 4. EJECUCIÓN DEL PIPELINE DE RENDERIZADO
    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }

    const isInteractive =
      state.isDragging ||
      state.isPanning ||
      Math.abs(dRadius) + Math.abs(dTheta) + Math.abs(dPhi) > 0.0006 ||
      performance.now() - lastInteractionTime < 260;

    if (isSoftwareGl) {
      afterDraw(animate, isInteractive);
    } else {
      rafId = requestAnimationFrame(animate);
    }
  }

  animate();

  return () => {
    isDisposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (syncTimeoutId) clearTimeout(syncTimeoutId);

    dom.removeEventListener('contextmenu', onContextMenu);
    dom.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('mousemove', onMouseMove);
    dom.removeEventListener('wheel', onWheel);
    dom.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('resize', onResize);

    if (composer) composer.dispose();
    renderer.dispose();
    if (dom.parentNode === container) {
      container.removeChild(dom);
    }
  };
}

