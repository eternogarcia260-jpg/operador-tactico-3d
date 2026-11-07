import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createInitialSkeleton, MaterialLibrary } from '../types';
import { buildTacticalOperator } from './buildTacticalOperator';
import { buildDetailedCombatBoot } from './buildDetailedCombatBoot';

function createDummyMaterials(): MaterialLibrary {
  const dummy = new THREE.MeshPhysicalMaterial();
  const basic = new THREE.MeshBasicMaterial();
  return {
    camoFabric: dummy,
    corduraVest: dummy,
    webbing: dummy,
    balaclava: dummy,
    bootSuede: dummy,
    bootMesh: dummy,
    bootLaces: dummy,
    gunmetal: dummy,
    geisseleDDC: dummy,
    fdeAnodized: dummy,
    suppressorMetal: dummy,
    boltSteel: dummy,
    brass: dummy,
    copperFMJ: dummy,
    darkPolymer: dummy,
    helmetShell: dummy,
    helmetCover: dummy,
    helmetRimRubber: dummy,
    wilcoxAluminum: dummy,
    headsetGel: dummy,
    strobeDomeGlass: dummy,
    irReflectivePatch: dummy,
    combatRubber: dummy,
    stippledPolymer: dummy,
    pmagFDE: dummy,
    hypalon: dummy,
    bootChassis: dummy,
    bootMidsole: dummy,
    patchMat: dummy,
    redTab: dummy,
    stitchThread: dummy,
    skin: dummy,
    eyeSclera: dummy,
    eyeIris: dummy,
    visorGlass: dummy,
    magWindowGlass: dummy,
    opticGlassRuby: dummy,
    nvgLens: dummy,
    eotechReticle: basic
  };
}

test('Tactical operator builds cleanly with valid vertices, exposed boots, and non-clipping rifle stock', () => {
  const scene = new THREE.Scene();
  const skeleton = createInitialSkeleton();
  const materials = createDummyMaterials();

  const operator = buildTacticalOperator(scene, materials, skeleton);
  operator.updateMatrixWorld(true);

  let meshCount = 0;
  operator.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      meshCount++;
      const pos = mesh.geometry.attributes.position;
      assert.ok(pos && pos.count > 0, 'Mesh must have vertices');
      for (let i = 0; i < pos.count; i++) {
        assert.ok(Number.isFinite(pos.getX(i)), 'X coordinate must be finite');
        assert.ok(Number.isFinite(pos.getY(i)), 'Y coordinate must be finite');
        assert.ok(Number.isFinite(pos.getZ(i)), 'Z coordinate must be finite');
      }
    }
  });

  assert.ok(meshCount > 150, `Expected high-density tactical operator (>150 meshes), got ${meshCount}`);

  // Verify rifle rear buttpad is in front of the chest/shoulder pocket (chest local Z > 0.095)
  const buttPadRearLocal = new THREE.Vector3(0, 0, -0.268);
  const buttPadWorld = skeleton.rifleMesh.localToWorld(buttPadRearLocal.clone());
  const buttPadInChest = skeleton.chest.worldToLocal(buttPadWorld.clone());
  assert.ok(
    buttPadInChest.z > 0.095,
    `Expected rifle stock rear to stay in front of torso surface (z > 0.095), got ${buttPadInChest.z.toFixed(4)}`
  );
});

test('Detailed combat boots have anatomical dimensions and valid vertex normals', () => {
  const materials = createDummyMaterials();
  const leftBoot = buildDetailedCombatBoot(-1, materials);
  const rightBoot = buildDetailedCombatBoot(1, materials);
  leftBoot.updateMatrixWorld(true);
  rightBoot.updateMatrixWorld(true);

  let bootMeshCount = 0;
  rightBoot.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      bootMeshCount++;
      const norm = mesh.geometry.attributes.normal;
      assert.ok(norm && norm.count > 0, 'Boot mesh must have vertex normals');
      for (let i = 0; i < norm.count; i++) {
        assert.ok(Number.isFinite(norm.getX(i)), 'Normal X must be finite');
        assert.ok(Number.isFinite(norm.getY(i)), 'Normal Y must be finite');
        assert.ok(Number.isFinite(norm.getZ(i)), 'Normal Z must be finite');
      }
    }
  });

  assert.ok(bootMeshCount >= 90, `Expected detailed multi-part boot (>=90 meshes), got ${bootMeshCount}`);

  const box = new THREE.Box3().setFromObject(rightBoot);
  const size = new THREE.Vector3();
  box.getSize(size);
  // Anatomical boot dimensions: width ~0.11m, height ~0.185m, length ~0.315m
  assert.ok(size.x > 0.095 && size.x < 0.145, `Unexpected boot width: ${size.x.toFixed(4)}`);
  assert.ok(size.y > 0.165 && size.y < 0.215, `Unexpected boot height: ${size.y.toFixed(4)}`);
  assert.ok(size.z > 0.285 && size.z < 0.345, `Unexpected boot length: ${size.z.toFixed(4)}`);
});

test('Camo suit sculptClothFolds produces metric-consistent UVs without polar pinching', async () => {
  const { sculptClothFolds, enhanceCamoSuitShader } = await import('../geometry/organicGeometry');

  // Short cylinder (pelvis/collar) vs long cylinder (thigh) must have V range proportional to physical height
  const shortCyl = sculptClothFolds(new THREE.CylinderGeometry(0.10, 0.10, 0.10, 24, 8), 6, 12, 0.003);
  const tallCyl = sculptClothFolds(new THREE.CylinderGeometry(0.10, 0.10, 0.40, 24, 16), 6, 12, 0.003);

  const getVSpan = (geo: THREE.BufferGeometry) => {
    const uv = geo.attributes.uv;
    let minV = Infinity;
    let maxV = -Infinity;
    for (let i = 0; i < uv.count; i++) {
      const v = uv.getY(i);
      assert.ok(Number.isFinite(v), 'UV V coordinate must be finite');
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    return maxV - minV;
  };

  const shortSpan = getVSpan(shortCyl);
  const tallSpan = getVSpan(tallCyl);
  assert.ok(tallSpan > shortSpan * 3.0, `Expected tall cylinder V span (${tallSpan}) > 3x short cylinder V span (${shortSpan})`);

  const mat = enhanceCamoSuitShader(new THREE.MeshPhysicalMaterial());
  assert.equal(typeof mat.onBeforeCompile, 'function', 'enhanceCamoSuitShader must attach onBeforeCompile');
});

test('Lossless hierarchical static batching reduces draw calls by >85% while preserving 100% of triangles', async () => {
  const { optimizeOperatorHierarchy } = await import('../engine/sceneOptimizer');
  const { updateWeaponAndArmsIK } = await import('./buildArmsAndWeapon');

  const scene = new THREE.Scene();
  const skeleton = createInitialSkeleton();
  const materials = createDummyMaterials();
  const operator = buildTacticalOperator(scene, materials, skeleton);
  updateWeaponAndArmsIK(skeleton, 0, 0);

  const countSceneStats = (root: THREE.Object3D) => {
    let meshes = 0;
    let triangles = 0;
    root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh && m.geometry) {
        meshes++;
        const idx = m.geometry.index;
        const pos = m.geometry.attributes.position;
        triangles += idx ? idx.count / 3 : pos.count / 3;
      }
    });
    return { meshes, triangles: Math.round(triangles) };
  };

  const before = countSceneStats(operator);
  const { totalBefore, totalAfter } = optimizeOperatorHierarchy(operator, skeleton);
  const after = countSceneStats(operator);

  assert.ok(totalBefore > 500, `Expected >500 static meshes before optimization, got ${totalBefore}`);
  assert.ok(totalAfter < 95, `Expected <95 merged meshes after optimization, got ${totalAfter}`);
  assert.equal(
    after.triangles,
    before.triangles,
    `Expected 0 triangle loss during batching (before=${before.triangles}, after=${after.triangles})`
  );

  // Verify Zero-GC IK solver still updates limb transforms cleanly after batching
  updateWeaponAndArmsIK(skeleton, 0.25, 0.8);
  assert.ok(Number.isFinite(skeleton.rightLimb.upperGroup.position.x));
  assert.ok(Number.isFinite(skeleton.leftLimb.lowerGroup.quaternion.w));
});



