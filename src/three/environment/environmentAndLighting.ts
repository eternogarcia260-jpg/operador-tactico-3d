import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { isSoftwareGl, LightingBundle, MaterialLibrary, PostProcessingBundle } from '../types';
import { ProceduralPBRGenerator } from '../textures/ProceduralPBRGenerator';
import { sculptClothFolds } from '../geometry/organicGeometry';
import { batchBoneSubtree } from '../engine/sceneOptimizer';

/**
 * ----------------------------------------------------------------------------
 * 3. GENERACIÓN DE ENTORNO HDR PROCEDURAL E ILUMINACIÓN BASADA EN IMÁGENES (IBL)
 * ----------------------------------------------------------------------------
 */
export function setupEnvironmentMap(renderer: THREE.WebGLRenderer, scene: THREE.Scene): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileCubemapShader();
  const roomEnv = new RoomEnvironment();
  const envTexture = pmremGenerator.fromScene(roomEnv, 0.035).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.42;
  pmremGenerator.dispose();
  return envTexture;
}

/**
 * ----------------------------------------------------------------------------
 * 4. PIPELINE DE POST-PROCESADO CINEMATOGRÁFICO CON EFFECTCOMPOSER
 * (RenderPass + SSAOPass Half-Res + UnrealBloomPass Half-Res + OutputPass)
 * ----------------------------------------------------------------------------
 */
export function setupPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): PostProcessingBundle {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const halfW = Math.max(1, Math.floor(w * 0.5));
  const halfH = Math.max(1, Math.floor(h * 0.5));

  const renderTarget = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    samples: isSoftwareGl ? 0 : 4
  });
  const composer = new EffectComposer(renderer, renderTarget);

  // 1. Pase de Renderizado Principal
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. Oclusión Ambiental (SSAOPass) de alta precisión para pliegues textiles y costuras MOLLE
  let ssaoPass: SSAOPass | null = null;
  if (!isSoftwareGl) {
    try {
      ssaoPass = new SSAOPass(scene, camera, halfW, halfH);
      ssaoPass.kernelRadius = 2.6;
      ssaoPass.minDistance = 0.0004;
      ssaoPass.maxDistance = 0.24;
      ssaoPass.output = SSAOPass.OUTPUT.Default;
      (ssaoPass as SSAOPass & { kernelSize?: number }).kernelSize = 16;
      composer.addPass(ssaoPass);
    } catch (err) {
      console.warn('SSAOPass inicializado con fallback:', err);
    }
  }

  // 3. UnrealBloomPass calibrado para ópticas y emisivos sin lavar las texturas PBR
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(halfW, halfH),
    0.16,  // strength
    0.35,  // radius
    0.88   // threshold
  );
  composer.addPass(bloomPass);

  // 4. OutputPass final para corrección de color ACES Filmic y sRGB preciso
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return { composer, renderPass, ssaoPass, bloomPass, outputPass };
}

/**
 * ----------------------------------------------------------------------------
 * 6. ILUMINACIÓN DE ESTUDIO FOTORREALISTA MULTI-PUNTO (ALTO RANGO DINÁMICO Y AUTO-SOMBRAS)
 * ----------------------------------------------------------------------------
 */
export function setupLighting(scene: THREE.Scene): LightingBundle {
  const hemiLight = new THREE.HemisphereLight(0x94a3b8, 0x070a0f, 0.28);
  scene.add(hemiLight);

  // DirectionalLight principal cálida (Key Light) en ángulo de 45° para esculpir el relieve de pliegues, pouches y normales
  const keyLight = new THREE.DirectionalLight(0xfff4e2, 4.15);
  keyLight.position.set(2.6, 3.8, 2.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1.0;
  keyLight.shadow.camera.far = 8.0;
  const d = 1.18;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d * 1.35;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.normalBias = 0.014;
  keyLight.shadow.bias = -0.00025;
  keyLight.shadow.radius = 1.25;
  scene.add(keyLight);

  // Luz de relleno lateral fría controlada (Ratio Key:Fill 6:1 para claro-oscuro fotorrealista)
  const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.68);
  fillLight.position.set(-3.2, 1.9, 1.6);
  scene.add(fillLight);

  // Luz de recorte trasera principal fría (Cool Back Rim Light) para perfilar la silueta e iluminar las microfibras NYCO/Cordura (Sheen/Fresnel)
  const rimLight = new THREE.SpotLight(0x7dd3fc, 18.5, 15, Math.PI / 2.8, 0.58, 1.35);
  rimLight.position.set(-1.15, 2.35, -2.55);
  rimLight.target.position.set(0, 1.02, 0);
  scene.add(rimLight);
  scene.add(rimLight.target);

  // Segunda luz de recorte trasera-derecha fría/acerada para perfilar el hombro izquierdo, codo, bolsillo cargo y estimular SSS en bordes
  const rimLightWarm = new THREE.SpotLight(0x93c5fd, 14.5, 14, Math.PI / 3.0, 0.62, 1.4);
  rimLightWarm.position.set(1.35, 1.95, -2.45);
  rimLightWarm.target.position.set(0, 0.98, 0);
  scene.add(rimLightWarm);
  scene.add(rimLightWarm.target);

  // Contraluz direccional rasante posterior (Grazing Silhouette Backlight) para continuidad de Sheen de cabeza a tobillos
  const backRimDir = new THREE.DirectionalLight(0xbae6fd, 1.75);
  backRimDir.position.set(0.0, 2.15, -3.4);
  scene.add(backRimDir);

  // Luz de rebote inferior sutil
  const groundBounceLight = new THREE.PointLight(0x334155, 0.42, 4.2);
  groundBounceLight.position.set(0, 0.10, 0.9);
  scene.add(groundBounceLight);

  // Congelar matrices de todas las luces estáticas de estudio (ahorra recálculos matriciales en cada fotograma)
  const staticLightNodes: THREE.Object3D[] = [
    hemiLight,
    keyLight,
    fillLight,
    rimLight,
    rimLight.target,
    rimLightWarm,
    rimLightWarm.target,
    backRimDir,
    groundBounceLight
  ];
  for (const node of staticLightNodes) {
    node.updateMatrixWorld(true);
    node.matrixAutoUpdate = false;
  }

  const volumetricCones: THREE.Mesh[] = [];

  return {
    hemiLight,
    keyLight,
    fillLight,
    rimLight,
    rimLightWarm,
    groundBounceLight,
    volumetricCones
  };
}

/**
 * ----------------------------------------------------------------------------
 * 7. BASE TÁCTICA DE ASFALTO SECO Y CASQUILLOS (FUSIONADA EN 3 DRAW CALLS)
 * ----------------------------------------------------------------------------
 */
export function buildTacticalBase(scene: THREE.Scene, materials: MaterialLibrary): THREE.Group {
  const baseGroup = new THREE.Group();
  const asphaltTex = ProceduralPBRGenerator.createAsphaltTextures();

  const groundMat = new THREE.MeshPhysicalMaterial({
    map: asphaltTex.map,
    roughnessMap: asphaltTex.roughnessMap,
    normalMap: asphaltTex.normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.88,
    metalness: 0.06,
    clearcoat: 0.0,
    envMapIntensity: 0.65
  });

  // Plataforma cilíndrica biselada
  const plinthGeo = new THREE.CylinderGeometry(1.58, 1.70, 0.14, 64);
  const plinth = new THREE.Mesh(plinthGeo, groundMat);
  plinth.position.y = -0.07;
  plinth.receiveShadow = true;
  baseGroup.add(plinth);

  // Anillo metálico fresado exterior
  const ringGeo = new THREE.TorusGeometry(1.64, 0.026, 20, 96);
  ringGeo.rotateX(Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, materials.gunmetal);
  ring.position.y = -0.07;
  ring.receiveShadow = true;
  baseGroup.add(ring);

  // Escombros urbanos de hormigón y fragmentos tácticos
  for (let i = 0; i < 22; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.42 + Math.random() * 1.02;
    const rockGeo = new THREE.DodecahedronGeometry(0.016 + Math.random() * 0.032, 1);
    sculptClothFolds(rockGeo, 4, 4, 0.18);
    const rock = new THREE.Mesh(rockGeo, groundMat);
    rock.position.set(Math.cos(angle) * dist, 0.008, Math.sin(angle) * dist);
    rock.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    rock.scale.y = 0.52;
    rock.castShadow = true;
    rock.receiveShadow = true;
    baseGroup.add(rock);
  }

  // Casquillos percutidos 5.56x45mm NATO con cuello abotellado realista
  for (let i = 0; i < 11; i++) {
    const casingGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0052, 0.034, 14), materials.brass);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0048, 0.009, 14), materials.brass);
    neck.position.y = 0.021;
    body.castShadow = true;
    neck.castShadow = true;
    casingGroup.add(body, neck);

    const a = 0.25 + i * 0.52;
    const r = 0.36 + (i % 4) * 0.21;
    casingGroup.position.set(Math.cos(a) * r, 0.005, Math.sin(a) * r);
    casingGroup.rotation.z = Math.PI / 2;
    casingGroup.rotation.y = a * 2.7;
    baseGroup.add(casingGroup);
  }

  scene.add(baseGroup);
  // Fusionar las 46 sub-mallas estáticas de la base en solo 3 mallas por material (groundMat, gunmetal, brass)
  batchBoneSubtree(baseGroup, new Set());
  baseGroup.matrixAutoUpdate = false;
  baseGroup.updateMatrix();
  return baseGroup;
}

/**
 * ----------------------------------------------------------------------------
 * 9. PARTÍCULAS ATMOSFÉRICAS EN SUSPENSIÓN (ANIMADAS 100% EN VERTEX SHADER GPU)
 * ----------------------------------------------------------------------------
 */
export function buildAtmosphericEffects(scene: THREE.Scene): THREE.Points {
  const dustCount = 240;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustPhase = new Float32Array(dustCount);

  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 5.2;
    dustPos[i * 3 + 1] = Math.random() * 3.2;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 5.2;
    dustPhase[i] = i * 1.17;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dustPhase, 1));

  const uTime = { value: 0 };

  const dustMat = new THREE.PointsMaterial({
    color: 0x94a3b8,
    size: 0.014,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  dustMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;
      attribute float aPhase;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float driftY = transformed.y + sin(uTime + aPhase) * 0.045 + uTime * 0.015;
      transformed.y = 0.05 + mod(driftY, 3.15);`
    );
  };

  const dustParticles = new THREE.Points(dustGeo, dustMat);
  dustParticles.userData.uTime = uTime;
  scene.add(dustParticles);
  return dustParticles;
}

