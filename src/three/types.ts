import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface CamoPalette {
  name: string;
  base: string;
  blobs: string[];
  vest: number;
}

export interface PinchZone {
  y: number;
  width: number;
  depth: number;
}

export interface OrganicPouchOptions {
  roundnessXZ?: number;
  roundnessY?: number;
  teardropSag?: number;
  pillowBulge?: number;
  backConcavity?: number;
  wrapRadiusX?: number;
  pinchY?: PinchZone[];
  wrinkleAmp?: number;
  wrinkleFreq?: number;
  segsW?: number;
  segsH?: number;
  segsD?: number;
}

export interface MaterialLibrary {
  camoFabric: THREE.MeshPhysicalMaterial;
  corduraVest: THREE.MeshPhysicalMaterial;
  webbing: THREE.MeshPhysicalMaterial;
  balaclava: THREE.MeshPhysicalMaterial;
  bootSuede: THREE.MeshPhysicalMaterial;
  bootMesh: THREE.MeshPhysicalMaterial;
  bootLaces: THREE.MeshPhysicalMaterial;
  gunmetal: THREE.MeshPhysicalMaterial;
  geisseleDDC: THREE.MeshPhysicalMaterial;
  fdeAnodized: THREE.MeshPhysicalMaterial;
  suppressorMetal: THREE.MeshPhysicalMaterial;
  boltSteel: THREE.MeshPhysicalMaterial;
  brass: THREE.MeshPhysicalMaterial;
  copperFMJ: THREE.MeshPhysicalMaterial;
  darkPolymer: THREE.MeshPhysicalMaterial;
  helmetShell: THREE.MeshPhysicalMaterial;
  helmetCover: THREE.MeshPhysicalMaterial;
  helmetRimRubber: THREE.MeshPhysicalMaterial;
  wilcoxAluminum: THREE.MeshPhysicalMaterial;
  headsetGel: THREE.MeshPhysicalMaterial;
  strobeDomeGlass: THREE.MeshPhysicalMaterial;
  irReflectivePatch: THREE.MeshPhysicalMaterial;
  combatRubber: THREE.MeshPhysicalMaterial;
  stippledPolymer: THREE.MeshPhysicalMaterial;
  pmagFDE: THREE.MeshPhysicalMaterial;
  hypalon: THREE.MeshPhysicalMaterial;
  bootChassis: THREE.MeshPhysicalMaterial;
  bootMidsole: THREE.MeshPhysicalMaterial;
  patchMat: THREE.MeshPhysicalMaterial;
  redTab: THREE.MeshPhysicalMaterial;
  stitchThread: THREE.MeshPhysicalMaterial;
  skin: THREE.MeshPhysicalMaterial;
  eyeSclera: THREE.MeshPhysicalMaterial;
  eyeIris: THREE.MeshPhysicalMaterial;
  visorGlass: THREE.MeshPhysicalMaterial;
  magWindowGlass: THREE.MeshPhysicalMaterial;
  opticGlassRuby: THREE.MeshPhysicalMaterial;
  nvgLens: THREE.MeshPhysicalMaterial;
  eotechReticle: THREE.MeshBasicMaterial;
}

export interface LimbRig {
  upperGroup: THREE.Group;
  lowerGroup: THREE.Group;
}

export interface OperatorSkeleton {
  hips: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  eyes: THREE.Group[];
  nvgPivot: THREE.Group;
  rightShoulder: THREE.Group;
  leftShoulder: THREE.Group;
  upperArmLen: number;
  forearmLen: number;
  rightLimb: LimbRig;
  leftLimb: LimbRig;
  weaponGroup: THREE.Group;
  rifleMesh: THREE.Group;
  rightWristTarget: THREE.Object3D;
  leftWristTarget: THREE.Object3D;
  strobeLight?: THREE.PointLight;
  strobeMesh?: THREE.Mesh;
  headLight?: THREE.SpotLight;
  headPointLight?: THREE.PointLight;
  headLightBeam?: THREE.Mesh;
  headLightEmitter?: THREE.Mesh;
  nvgLight?: THREE.PointLight;
  nvgOcularMesh?: THREE.Mesh;
  nvgIrEmitterMesh?: THREE.Mesh;
}

export interface OperatorState {
  isDragging: boolean;
  isPanning: boolean;
  prevMouse: { x: number; y: number };
  camSpherical: { radius: number; theta: number; phi: number };
  targetSpherical: { radius: number; theta: number; phi: number };
  camLookAt: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  mouseNDC: { x: number; y: number };
  focusDistance: number;
  nvgDeployed?: boolean;
  strobeActive?: boolean;
  headLightActive?: boolean;
  irModeActive?: boolean;
}

export interface PostProcessingBundle {
  composer: EffectComposer;
  renderPass: RenderPass;
  ssaoPass: SSAOPass | null;
  bloomPass: UnrealBloomPass;
  outputPass: OutputPass;
}

export interface LightingBundle {
  hemiLight: THREE.HemisphereLight;
  keyLight: THREE.DirectionalLight;
  fillLight: THREE.DirectionalLight;
  rimLight: THREE.SpotLight;
  rimLightWarm: THREE.SpotLight;
  groundBounceLight: THREE.PointLight;
  volumetricCones: THREE.Mesh[];
}

export const isSoftwareGl: boolean = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
})();

export const camoPalettes: CamoPalette[] = [
  {
    name: 'MultiCam',
    base: '#685f4d',
    blobs: ['#434b32', '#8a7e63', '#2e271d', '#b5a88c', '#4e4433', '#3a422b'],
    vest: 0x574e3f,
  },
];

export function createInitialState(): OperatorState {
  return {
    isDragging: false,
    isPanning: false,
    prevMouse: { x: 0, y: 0 },
    camSpherical: { radius: 3.42, theta: -0.18, phi: 1.42 },
    targetSpherical: { radius: 3.42, theta: -0.18, phi: 1.42 },
    camLookAt: new THREE.Vector3(0.0, 0.95, 0.04),
    targetLookAt: new THREE.Vector3(0.0, 0.95, 0.04),
    mouseNDC: { x: 0, y: 0 },
    focusDistance: 3.42,
    nvgDeployed: true,
    strobeActive: true,
    headLightActive: true,
    irModeActive: false,
  };
}

export function createInitialSkeleton(): OperatorSkeleton {
  return {
    hips: new THREE.Group(),
    spine: new THREE.Group(),
    chest: new THREE.Group(),
    neck: new THREE.Group(),
    head: new THREE.Group(),
    eyes: [],
    nvgPivot: new THREE.Group(),
    rightShoulder: new THREE.Group(),
    leftShoulder: new THREE.Group(),
    upperArmLen: 0.265,
    forearmLen: 0.255,
    rightLimb: { upperGroup: new THREE.Group(), lowerGroup: new THREE.Group() },
    leftLimb: { upperGroup: new THREE.Group(), lowerGroup: new THREE.Group() },
    weaponGroup: new THREE.Group(),
    rifleMesh: new THREE.Group(),
    rightWristTarget: new THREE.Object3D(),
    leftWristTarget: new THREE.Object3D(),
  };
}
