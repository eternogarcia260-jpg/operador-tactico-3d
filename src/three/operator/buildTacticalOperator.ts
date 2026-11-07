import * as THREE from 'three';
import { MaterialLibrary, OperatorSkeleton } from '../types';
import { buildLowerBody } from './buildLowerBody';
import { buildTorsoAndArmor } from './buildTorsoAndArmor';
import { buildHeadAndHelmet } from './buildHeadAndHelmet';
import { buildArmsAndWeapon } from './buildArmsAndWeapon';

/**
 * ----------------------------------------------------------------------------
 * 8. CONSTRUCCIÓN ANATÓMICA Y TÁCTICA DEL OPERADOR MILITAR TIER-1
 * ----------------------------------------------------------------------------
 */
export function buildTacticalOperator(
  scene: THREE.Scene,
  materials: MaterialLibrary,
  skeleton: OperatorSkeleton
): THREE.Group {
  const soldierGroup = new THREE.Group();
  scene.add(soldierGroup);

  // Jerarquía esquelética para animación respiratoria y micro-cinemática
  skeleton.hips = new THREE.Group();
  skeleton.hips.position.set(0, 0.955, 0);
  soldierGroup.add(skeleton.hips);

  skeleton.spine = new THREE.Group();
  skeleton.spine.position.set(0, 0.12, 0);
  skeleton.hips.add(skeleton.spine);

  skeleton.chest = new THREE.Group();
  skeleton.chest.position.set(0, 0.22, 0);
  skeleton.spine.add(skeleton.chest);

  skeleton.neck = new THREE.Group();
  skeleton.neck.position.set(0, 0.30, 0.01);
  skeleton.chest.add(skeleton.neck);

  skeleton.head = new THREE.Group();
  skeleton.head.position.set(0, 0.07, 0);
  skeleton.neck.add(skeleton.head);

  // 1. Piernas, Rodilleras Crye AirFlex, Funda Safariland y Botas Salomon 4D
  buildLowerBody(materials, skeleton);

  // 2. Torso, Chaleco Crye JPC 2.0, Cargadores PMAG con Bungee, Radio PRC-152, Torniquete CAT y Cables
  buildTorsoAndArmor(materials, skeleton);

  // 3. Cabeza con Ojos Húmedos Esculpidos, Gafas Balísticas, Casco FAST, ComTac VI y GPNVG-18
  buildHeadAndHelmet(materials, skeleton);

  // 4. Brazos Articulados, Guantes con Dedos Esculpidos, Eslinga de 2 Puntos y Carabina HK416
  buildArmsAndWeapon(materials, skeleton);

  // Habilitar sombras de alta precisión en todas las mallas
  soldierGroup.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return soldierGroup;
}
