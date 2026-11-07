import * as THREE from 'three';
import { LimbRig, MaterialLibrary, OperatorSkeleton } from '../types';
import {
  sculptClothFolds,
  createRoundedRectShape,
  createOrganicExtrude,
  createOrganicPouchVolume
} from '../geometry/organicGeometry';

// Vectores y matrices pre-asignados en ámbito de módulo para CERO recolecciones de basura (Zero-GC) a 60-120 FPS
const _ab = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _toPole = new THREE.Vector3();
const _planeNormal = new THREE.Vector3();
const _bendDir = new THREE.Vector3();
const _elbowPos = new THREE.Vector3();
const _zAxis = new THREE.Vector3();
const _yHint = new THREE.Vector3();
const _xAxis = new THREE.Vector3();
const _yAxis = new THREE.Vector3();
const _rotMat = new THREE.Matrix4();
const _rWristWorld = new THREE.Vector3();
const _lWristWorld = new THREE.Vector3();
const _rWristLocal = new THREE.Vector3();
const _lWristLocal = new THREE.Vector3();
const _rightPole = new THREE.Vector3(-0.46, -0.14, -0.06);
const _leftPole = new THREE.Vector3(0.44, -0.14, 0.18);

function orientBoneSegment(group: THREE.Group, startPos: THREE.Vector3, endPos: THREE.Vector3): void {
  group.position.copy(startPos);
  _zAxis.subVectors(endPos, startPos).normalize();
  // Eje Y apunta hacia la cara anterior del brazo (-bendDir), dejando la codera en -Y y los bolsillos hacia afuera
  _yHint.copy(_bendDir).negate();
  _xAxis.crossVectors(_yHint, _zAxis).normalize();
  if (_xAxis.x < 0) _xAxis.negate();
  _yAxis.crossVectors(_zAxis, _xAxis).normalize();

  _rotMat.makeBasis(_xAxis, _yAxis, _zAxis);
  group.quaternion.setFromRotationMatrix(_rotMat);
}

/**
 * Solver de Cinemática Inversa Analítica de 2 Huesos (2-Bone Analytic IK) Zero-GC
 * Calcula la posición exacta del codo en 3D mediante la Ley de los Cosenos y construye
 * una base ortonormal directa en el espacio del torso sin asignar memoria en el heap.
 */
export function solveTwoBoneIK(
  limb: LimbRig,
  shoulderLocalPos: THREE.Vector3,
  wristLocalPos: THREE.Vector3,
  poleLocalPos: THREE.Vector3,
  l1: number,
  l2: number
): void {
  _ab.subVectors(wristLocalPos, shoulderLocalPos);
  const dist = THREE.MathUtils.clamp(_ab.length(), 0.05, l1 + l2 - 0.001);

  // Ley de los cosenos para el ángulo interior del hombro
  const cosAngle = THREE.MathUtils.clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1.0, 1.0);
  const angle = Math.acos(cosAngle);

  _dir.copy(_ab).normalize();
  _toPole.subVectors(poleLocalPos, shoulderLocalPos);
  _planeNormal.crossVectors(_dir, _toPole).normalize();
  // Vector unitario perpendicular a 'dir' apuntando hacia el Pole Vector (dirección del codo)
  _bendDir.crossVectors(_planeNormal, _dir).normalize();

  // Coordenada 3D exacta de la articulación del codo en el espacio de skeleton.chest
  _elbowPos
    .copy(shoulderLocalPos)
    .addScaledVector(_dir, Math.cos(angle) * l1)
    .addScaledVector(_bendDir, Math.sin(angle) * l1);

  orientBoneSegment(limb.upperGroup, shoulderLocalPos, _elbowPos);
  orientBoneSegment(limb.lowerGroup, _elbowPos, wristLocalPos);
}

export function updateWeaponAndArmsIK(
  skeleton: OperatorSkeleton,
  aimFactor: number = 0,
  breathOffset: number = 0
): void {
  const lerp = THREE.MathUtils.lerp;

  // Posición y orientación del arma calibrada en el bolsillo del hombro para que la culata
  // apoye delante del pectoral/deltoides sin atravesar el cuerpo ni el chaleco portaplacas:
  skeleton.weaponGroup.position.set(
    lerp(-0.126, -0.108, aimFactor),
    lerp(0.052, 0.175, aimFactor) + breathOffset * 0.0025,
    lerp(0.368, 0.362, aimFactor)
  );

  skeleton.rifleMesh.rotation.set(
    lerp(0.15, 0.03, aimFactor) + breathOffset * 0.008,
    lerp(0.20, 0.05, aimFactor),
    lerp(0.08, 0.02, aimFactor)
  );

  // Actualizar únicamente la cadena cinemática necesaria (7 nodos en vez de recorrer recursivamente cientos de mallas)
  if (skeleton.hips.parent) skeleton.hips.parent.updateMatrixWorld(false);
  skeleton.hips.updateMatrixWorld(false);
  skeleton.spine.updateMatrixWorld(false);
  skeleton.chest.updateMatrixWorld(false);
  skeleton.weaponGroup.updateMatrixWorld(false);
  skeleton.rifleMesh.updateMatrixWorld(false);
  skeleton.rightWristTarget.updateMatrixWorld(false);
  skeleton.leftWristTarget.updateMatrixWorld(false);

  skeleton.rightWristTarget.getWorldPosition(_rWristWorld);
  skeleton.leftWristTarget.getWorldPosition(_lWristWorld);

  _rWristLocal.copy(_rWristWorld);
  _lWristLocal.copy(_lWristWorld);
  skeleton.chest.worldToLocal(_rWristLocal);
  skeleton.chest.worldToLocal(_lWristLocal);

  solveTwoBoneIK(
    skeleton.rightLimb,
    skeleton.rightShoulder.position,
    _rWristLocal,
    _rightPole,
    skeleton.upperArmLen,
    skeleton.forearmLen
  );

  solveTwoBoneIK(
    skeleton.leftLimb,
    skeleton.leftShoulder.position,
    _lWristLocal,
    _leftPole,
    skeleton.upperArmLen,
    skeleton.forearmLen
  );
}

/**
 * Construye la Carabina HK416A5 Tier-1 con geometría mecánica detallada,
 * manos enguantadas esculpidas directamente sobre el pistolete y el guardamanos
 * (agarre C-Clamp y disciplina de gatillo) y correa porta-fusil de 2 puntos conectada.
 */
export function buildAssaultRifle(
  parentGroup: THREE.Group,
  materials: MaterialLibrary,
  skeleton: OperatorSkeleton
): void {
  const rifle = new THREE.Group();
  parentGroup.add(rifle);
  skeleton.rifleMesh = rifle;

  // ====================================================================
  // 1. CAJÓN DE MECANISMOS SUPERIOR E INFERIOR (FORGED 7075-T6 RECEIVERS)
  // ====================================================================
  // Upper Receiver con perfil octogonal superior y sobreelevación de pistón HK416
  const upperReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.050, 0.215), materials.gunmetal);
  upperReceiver.position.set(0, 0.022, -0.012);
  rifle.add(upperReceiver);

  const upperTopChamfer = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.014, 0.215), materials.gunmetal);
  upperTopChamfer.position.set(0, 0.049, -0.012);
  rifle.add(upperTopChamfer);

  // Lower Receiver con brocal de cargador (Magwell) acampanado y nervios de refuerzo
  const lowerReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.056, 0.195), materials.gunmetal);
  lowerReceiver.position.set(0, -0.018, -0.015);
  rifle.add(lowerReceiver);

  const magwellBody = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.068, 0.082), materials.gunmetal);
  magwellBody.position.set(0, -0.028, 0.042);
  magwellBody.rotation.x = 0.08;
  rifle.add(magwellBody);

  // Falda acampanada del brocal (Flared Magwell Bevel) en aluminio anodizado
  const magwellFlare = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.018, 0.090), materials.geisseleDDC);
  magwellFlare.position.set(0, -0.060, 0.044);
  magwellFlare.rotation.x = 0.08;
  rifle.add(magwellFlare);

  // Pasadores de desmontaje (Pivot Pin & Takedown Pin), Ejes del disparador y Botón de retenida
  for (const zPin of [-0.088, 0.068]) {
    const takedownPin = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.048, 12), materials.boltSteel);
    takedownPin.rotation.z = Math.PI / 2;
    takedownPin.position.set(0, -0.008, zPin);
    rifle.add(takedownPin);
  }

  // Palanca de retenida del cerrojo ambidiestra (Bolt Catch Paddle) en el costado izquierdo
  const boltCatch = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.028, 0.016), materials.gunmetal);
  boltCatch.position.set(0.023, -0.002, 0.012);
  rifle.add(boltCatch);

  // Botón de liberación del cargador y valla protectora (Mag Release + Fence) en el costado derecho
  const magReleaseBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.010, 14), materials.geisseleDDC);
  magReleaseBtn.rotation.z = Math.PI / 2;
  magReleaseBtn.position.set(-0.022, -0.018, 0.018);
  rifle.add(magReleaseBtn);

  // Selector de tiro ambidiestro HK con indicador rojo en posición SEMI
  const selectorAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.049, 12), materials.gunmetal);
  selectorAxis.rotation.z = Math.PI / 2;
  selectorAxis.position.set(0, -0.018, -0.064);
  rifle.add(selectorAxis);

  for (const side of [-1, 1]) {
    const selectorLever = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.022, 0.009), materials.gunmetal);
    selectorLever.position.set(side * 0.024, -0.010, -0.064);
    rifle.add(selectorLever);

    const redPictogram = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.004, 0.008), materials.redTab);
    redPictogram.position.set(side * 0.022, -0.002, -0.064);
    rifle.add(redPictogram);
  }

  // ====================================================================
  // 2. VENTANA DE EXPULSIÓN, PORTACERROJO CROMADO (BCG) Y FORWARD ASSIST
  // ====================================================================
  // Receso oscuro de la recámara y Portacerrojo (Bolt Carrier Group) de acero brillante con grabado
  const ejectionRecess = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.076), materials.darkPolymer);
  ejectionRecess.position.set(-0.019, 0.020, 0.018);
  rifle.add(ejectionRecess);

  const boltCarrier = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.072, 16), materials.boltSteel);
  boltCarrier.rotation.x = Math.PI / 2;
  boltCarrier.position.set(-0.014, 0.020, 0.018);
  rifle.add(boltCarrier);

  // Ranuras de alivio de gases y uña extractora en el portacerrojo
  for (let g = -1; g <= 1; g++) {
    const gasVent = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 8), materials.darkPolymer);
    gasVent.position.set(-0.022, 0.020, 0.016 + g * 0.008);
    rifle.add(gasVent);
  }

  // Tapa guardapolvo (Dust Cover) abierta hacia abajo con su varilla y muelle helicoidal
  const dustCoverDoor = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.024, 0.078), materials.gunmetal);
  dustCoverDoor.position.set(-0.024, -0.002, 0.018);
  dustCoverDoor.rotation.z = 0.25;
  rifle.add(dustCoverDoor);

  const dustCoverRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.095, 10), materials.boltSteel);
  dustCoverRod.rotation.x = Math.PI / 2;
  dustCoverRod.position.set(-0.023, 0.008, 0.018);
  rifle.add(dustCoverRod);

  // Deflector piramidal de vainas y Empujador de cerrojo (Forward Assist)
  const brassDeflector = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.024, 4), materials.gunmetal);
  brassDeflector.rotation.z = Math.PI / 2;
  brassDeflector.rotation.x = Math.PI / 4;
  brassDeflector.position.set(-0.026, 0.020, -0.028);
  rifle.add(brassDeflector);

  const faHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.032, 14), materials.gunmetal);
  faHousing.rotation.x = -Math.PI / 2 + 0.18;
  faHousing.rotation.z = 0.28;
  faHousing.position.set(-0.022, 0.016, -0.062);
  rifle.add(faHousing);

  const faPlunger = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.014, 14), materials.darkPolymer);
  faPlunger.rotation.x = -Math.PI / 2 + 0.18;
  faPlunger.rotation.z = 0.28;
  faPlunger.position.set(-0.026, 0.014, -0.078);
  rifle.add(faPlunger);

  // Palanca de montar ambidiestra (Geissele Airborne Charging Handle DDC)
  const achStem = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.010, 0.045), materials.geisseleDDC);
  achStem.position.set(0, 0.042, -0.105);
  rifle.add(achStem);

  const achHandle = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.012, 0.022), materials.geisseleDDC);
  achHandle.position.set(0, 0.042, -0.122);
  rifle.add(achHandle);

  // Arco guardamonte curvado (Winter Trigger Guard) y Gatillo plano de competición Geissele SD-E
  const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.005, 0.056), materials.darkPolymer);
  triggerGuard.position.set(0, -0.060, -0.025);
  triggerGuard.rotation.x = -0.08;
  rifle.add(triggerGuard);

  const flatTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.028, 0.006), materials.boltSteel);
  flatTrigger.position.set(0, -0.044, -0.030);
  flatTrigger.rotation.x = 0.15;
  rifle.add(flatTrigger);

  // ====================================================================
  // 3. CARGADOR CURVO MAGPUL PMAG 30 GEN M3 CON VENTANA Y 9 CARTUCHOS 5.56mm
  // ====================================================================
  const magGroup = new THREE.Group();
  magGroup.position.set(0, -0.065, 0.044);
  magGroup.rotation.x = 0.14;
  rifle.add(magGroup);

  // Segmento superior recto del cargador
  const magUpper = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.085, 0.064), materials.pmagFDE);
  magUpper.position.set(0, -0.035, 0);
  magGroup.add(magUpper);

  // Segmento inferior con la curvatura balística característica del calibre 5.56x45mm
  const magLowerGroup = new THREE.Group();
  magLowerGroup.position.set(0, -0.075, 0.002);
  magLowerGroup.rotation.x = 0.14;
  magGroup.add(magLowerGroup);

  const magLower = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.095, 0.064), materials.pmagFDE);
  magLower.position.set(0, -0.042, 0);
  magLowerGroup.add(magLower);

  // Costillas de agarre moldeadas en el PMAG
  for (let r = 0; r < 6; r++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, 0.067), materials.pmagFDE);
    rib.position.set(0, -0.010 - r * 0.015, 0);
    magLowerGroup.add(rib);
  }

  // Base ensanchada con tirador Magpul Ranger Plate
  const magBasePlate = new THREE.Mesh(new THREE.BoxGeometry(0.037, 0.014, 0.072), materials.darkPolymer);
  magBasePlate.position.set(0, -0.092, 0.002);
  magLowerGroup.add(magBasePlate);

  const rangerLoop = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 10, 20), materials.combatRubber);
  rangerLoop.rotation.y = Math.PI / 2;
  rangerLoop.position.set(0, -0.106, 0.002);
  magLowerGroup.add(rangerLoop);

  // Receso interno y Pila de 9 Cartuchos 5.56x45mm NATO (Vaina de latón + Punta de cobre FMJ)
  const magRecess = new THREE.Mesh(new THREE.BoxGeometry(0.033, 0.095, 0.022), materials.darkPolymer);
  magRecess.position.set(0, -0.055, -0.004);
  magGroup.add(magRecess);

  for (let b = 0; b < 8; b++) {
    const cartridge = new THREE.Group();
    cartridge.position.set(0, -0.016 - b * 0.0095, -0.004);
    cartridge.rotation.y = Math.PI / 2;
    cartridge.rotation.x = 0.06;

    const brassCase = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0045, 0.028, 12), materials.brass);
    brassCase.rotation.z = Math.PI / 2;
    brassCase.position.x = -0.006;
    cartridge.add(brassCase);

    const copperTip = new THREE.Mesh(new THREE.ConeGeometry(0.0040, 0.015, 12), materials.copperFMJ);
    copperTip.rotation.z = -Math.PI / 2;
    copperTip.position.x = 0.014;
    cartridge.add(copperTip);

    magGroup.add(cartridge);
  }

  // Elevador naranja (Anti-tilt Follower) y cristal translúcido MagLevel
  const follower = new THREE.Mesh(new THREE.BoxGeometry(0.0335, 0.008, 0.020), materials.redTab);
  follower.position.set(0, -0.096, -0.004);
  magGroup.add(follower);

  const magWindow = new THREE.Mesh(new THREE.BoxGeometry(0.0345, 0.092, 0.022), materials.magWindowGlass);
  magWindow.position.set(0, -0.055, -0.004);
  magGroup.add(magWindow);

  // ====================================================================
  // 4. GUARDAMANOS OCTOGONAL GEISSELE SMR HK 10.5" DDC + PISTÓN INTERNO
  // ====================================================================
  const railLength = 0.275;
  const railZ = 0.232;
  const smrGroup = new THREE.Group();
  smrGroup.position.set(0, 0.022, railZ);
  rifle.add(smrGroup);

  // Cuerpo octogonal (Núcleo + Biseles a 45 grados) en aluminio anodizado DDC
  const railCore = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.054, railLength), materials.geisseleDDC);
  smrGroup.add(railCore);

  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const octBevel = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.042, railLength - 0.004), materials.geisseleDDC);
    octBevel.rotation.z = angle;
    smrGroup.add(octBevel);
  }

  // Tornillos transversales de fijación de la tuerca de cañón (Geissele Cross-Bolts)
  for (const bz of [-0.115, -0.088]) {
    const crossBoltBoss = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.018, 0.020), materials.geisseleDDC);
    crossBoltBoss.position.set(0, -0.024, bz);
    smrGroup.add(crossBoltBoss);

    const boltHead = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.055, 12), materials.boltSteel);
    boltHead.rotation.z = Math.PI / 2;
    boltHead.position.set(0, -0.024, bz);
    smrGroup.add(boltHead);
  }

  // Ventanas de refrigeración M-LOK / SMR y Paneles texturizados RailScales en los flancos
  for (let slotIdx = 0; slotIdx < 5; slotIdx++) {
    const sz = -0.085 + slotIdx * 0.046;
    const ventHoles = new THREE.Mesh(new THREE.BoxGeometry(0.049, 0.014, 0.032), materials.darkPolymer);
    ventHoles.position.set(0, 0.006, sz);
    smrGroup.add(ventHoles);

    const upperVent = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.010, 0.030), materials.darkPolymer);
    upperVent.position.set(0, 0.018, sz);
    upperVent.rotation.z = Math.PI / 4;
    smrGroup.add(upperVent);
  }

  // Paneles de agarre RailScales HTP con textura panal/stippling donde sujeta la mano izquierda
  for (const side of [-1, 1]) {
    const railScale = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.115), materials.stippledPolymer);
    railScale.position.set(side * 0.025, -0.004, 0.025);
    smrGroup.add(railScale);
  }

  // Riel Picatinny MIL-STD-1913 continuo superior (Receptor + Guardamanos) con numeración T-Mark
  for (let i = 0; i < 25; i++) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.009, 0.011), i < 10 ? materials.gunmetal : materials.geisseleDDC);
    lug.position.set(0, 0.055, -0.108 + i * 0.0195);
    rifle.add(lug);
  }

  // ====================================================================
  // 5. CAÑÓN PESADO DE 10.4", BLOQUE DE GASES HK Y SUPRESOR SUREFIRE RC2
  // ====================================================================
  // Cañón forjado en frío recorriendo el interior del guardamanos y sobresaliendo al frente
  const barrelFull = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.34, 20), materials.gunmetal);
  barrelFull.rotation.x = Math.PI / 2;
  barrelFull.position.set(0, 0.022, 0.265);
  rifle.add(barrelFull);

  // Bloque de gases HK de recorrido corto y varilla de operación (Op-Rod) cromada visible
  const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.038, 0.042), materials.boltSteel);
  gasBlock.position.set(0, 0.028, 0.345);
  rifle.add(gasBlock);

  const gasRegulatorKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.025, 12), materials.boltSteel);
  gasRegulatorKnob.rotation.x = Math.PI / 2;
  gasRegulatorKnob.position.set(0, 0.038, 0.372);
  rifle.add(gasRegulatorKnob);

  const pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.24, 12), materials.boltSteel);
  pistonRod.rotation.x = Math.PI / 2;
  pistonRod.position.set(0, 0.038, 0.22);
  rifle.add(pistonRod);

  // Supresor SureFire SOCOM556-RC2 con collar moleteado Fast-Attach, costuras de soldadura y boca carbonizada
  const suppressorGroup = new THREE.Group();
  suppressorGroup.position.set(0, 0.022, 0.425);
  rifle.add(suppressorGroup);

  const ratchetCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.0235, 0.0235, 0.032, 24), materials.gunmetal);
  ratchetCollar.rotation.x = Math.PI / 2;
  suppressorGroup.add(ratchetCollar);

  const lockLatch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.022), materials.boltSteel);
  lockLatch.position.set(-0.021, 0.010, 0.002);
  suppressorGroup.add(lockLatch);

  const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.0215, 0.0215, 0.158, 32), materials.suppressorMetal);
  canBody.rotation.x = Math.PI / 2;
  canBody.position.z = 0.092;
  suppressorGroup.add(canBody);

  // Anillos de soldadura láser circunferenciales en el cuerpo del supresor
  for (const wz of [0.045, 0.095, 0.145]) {
    const weldSeam = new THREE.Mesh(new THREE.TorusGeometry(0.0216, 0.0012, 8, 32), materials.gunmetal);
    weldSeam.position.z = wz;
    suppressorGroup.add(weldSeam);
  }

  // Capuchón frontal escalonado con residuos de hollín y ánima de 5.56mm
  const frontCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0215, 0.014, 28), materials.darkPolymer);
  frontCap.rotation.x = Math.PI / 2;
  frontCap.position.z = 0.176;
  suppressorGroup.add(frontCap);

  const boreHole = new THREE.Mesh(
    new THREE.CircleGeometry(0.0085, 20),
    new THREE.MeshBasicMaterial({ color: 0x020202 })
  );
  boreHole.position.z = 0.1835;
  suppressorGroup.add(boreHole);

  // ====================================================================
  // 6. SUITE ÓPTICA TIER-1 (EOTECH EXPS3-0 + MAGNIFICADOR G33 + UNITY FAST)
  // ====================================================================
  // Miras mecánicas abatibles KAC Micro BUIS (Trasera y Delantera plegadas)
  const rearBuis = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.014, 0.036), materials.gunmetal);
  rearBuis.position.set(0, 0.064, -0.095);
  rifle.add(rearBuis);

  const frontBuis = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.014, 0.038), materials.boltSteel);
  frontBuis.position.set(0, 0.064, 0.348);
  rifle.add(frontBuis);

  // Elevador esqueletizado Unity Tactical FAST Optic Riser en DDC
  const unityRiser = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.020, 0.092), materials.geisseleDDC);
  unityRiser.position.set(0, 0.066, 0.042);
  rifle.add(unityRiser);

  for (const cutZ of [0.018, 0.042, 0.066]) {
    const riserCut = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.010, 0.014), materials.darkPolymer);
    riserCut.position.set(0, 0.066, cutZ);
    rifle.add(riserCut);
  }

  // Visor Holográfico EOTech EXPS3-0 Tan con capota de aluminio, compartimento CR123A y Retícula Láser
  const eotechGroup = new THREE.Group();
  eotechGroup.position.set(0, 0.098, 0.052);
  rifle.add(eotechGroup);

  const eoBase = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.016, 0.076), materials.fdeAnodized);
  eoBase.position.y = -0.016;
  eotechGroup.add(eoBase);

  const qdLever = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.038), materials.darkPolymer);
  qdLever.position.set(0.024, -0.016, 0);
  eotechGroup.add(qdLever);

  // Capota protectora hueca (Paredes laterales y techo para ver a través del cristal)
  const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.006, 0.072), materials.fdeAnodized);
  hoodTop.position.y = 0.024;
  eotechGroup.add(hoodTop);

  for (const side of [-1, 1]) {
    const hoodWall = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.044, 0.072), materials.fdeAnodized);
    hoodWall.position.set(side * 0.022, 0.004, 0);
    eotechGroup.add(hoodWall);
  }

  // Cilindro transversal de batería CR123A con tapón moleteado
  const cr123Tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.054, 18), materials.fdeAnodized);
  cr123Tube.rotation.z = Math.PI / 2;
  cr123Tube.position.set(0.003, -0.008, 0.028);
  eotechGroup.add(cr123Tube);

  const batteryCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.008, 18), materials.gunmetal);
  batteryCap.rotation.z = Math.PI / 2;
  batteryCap.position.set(-0.025, -0.008, 0.028);
  eotechGroup.add(batteryCap);

  // Cristales delantero/trasero con reflejo rubí y Retícula Holográfica flotante de 68 MOA
  const frontLens = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.032), materials.opticGlassRuby);
  frontLens.position.set(0, 0.005, 0.032);
  eotechGroup.add(frontLens);

  const rearLens = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.032), materials.opticGlassRuby);
  rearLens.position.set(0, 0.005, -0.032);
  eotechGroup.add(rearLens);

  const holoReticle = new THREE.Mesh(new THREE.PlaneGeometry(0.028, 0.028), materials.eotechReticle);
  holoReticle.position.set(0, 0.005, 0.0);
  eotechGroup.add(holoReticle);

  // Magnificador EOTech G33 3X montado detrás del EXPS3-0 sobre montura Unity FAST FTC
  const magG33Group = new THREE.Group();
  magG33Group.position.set(0, 0.098, -0.036);
  rifle.add(magG33Group);

  const ftcMount = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.034, 0.038), materials.geisseleDDC);
  ftcMount.position.y = -0.022;
  magG33Group.add(ftcMount);

  const g33Body = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.019, 0.076, 24), materials.pmagFDE);
  g33Body.rotation.x = Math.PI / 2;
  g33Body.position.y = 0.004;
  magG33Group.add(g33Body);

  const g33Diopter = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.018, 24), materials.combatRubber);
  g33Diopter.rotation.x = Math.PI / 2;
  g33Diopter.position.set(0, 0.004, -0.042);
  magG33Group.add(g33Diopter);

  const g33LensRear = new THREE.Mesh(new THREE.CircleGeometry(0.016, 24), materials.opticGlassRuby);
  g33LensRear.position.set(0, 0.004, -0.0515);
  magG33Group.add(g33LensRear);

  // ====================================================================
  // 7. CULATA B5 SYSTEMS ENHANCED SOPMOD Y TUBO AMORTIGUADOR MIL-SPEC
  //    (Calibrada en posición táctica CQB para encajar en el hombro sin atravesar el pecho)
  // ====================================================================
  const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.145, 20), materials.gunmetal);
  bufferTube.rotation.x = Math.PI / 2;
  bufferTube.position.set(0, 0.018, -0.175);
  rifle.add(bufferTube);

  const castleNut = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 18), materials.gunmetal);
  castleNut.rotation.x = Math.PI / 2;
  castleNut.position.set(0, 0.018, -0.120);
  rifle.add(castleNut);

  const stockGroup = new THREE.Group();
  stockGroup.position.set(0, -0.004, -0.188);
  rifle.add(stockGroup);

  const stockSpineGeo = createOrganicPouchVolume(0.042, 0.104, 0.126, {
    roundnessXZ: 0.42,
    roundnessY: 0.35,
    pillowBulge: 0.04,
    wrinkleAmp: 0
  });
  const stockSpine = new THREE.Mesh(stockSpineGeo, materials.pmagFDE);
  stockGroup.add(stockSpine);

  // Tubos laterales estancos para baterías y carrillera ergonómica inclinada SOPMOD
  for (const side of [-1, 1]) {
    const cheekWeldTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.124, 16), materials.pmagFDE);
    cheekWeldTube.rotation.x = Math.PI / 2;
    cheekWeldTube.position.set(side * 0.020, 0.025, 0);
    stockGroup.add(cheekWeldTube);

    const tubeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 16), materials.combatRubber);
    tubeCap.rotation.x = Math.PI / 2;
    tubeCap.position.set(side * 0.020, 0.025, -0.064);
    stockGroup.add(tubeCap);
  }

  // Cantonera de goma antideslizante redondeada apoyada limpiamente frente al bolsillo del hombro derecho
  const buttPadGeo = createOrganicPouchVolume(0.048, 0.118, 0.022, {
    roundnessXZ: 0.48,
    roundnessY: 0.44,
    pillowBulge: 0.06,
    wrinkleAmp: 0
  });
  const buttPad = new THREE.Mesh(buttPadGeo, materials.combatRubber);
  buttPad.position.set(0, -0.003, -0.068);
  stockGroup.add(buttPad);

  // ====================================================================
  // 8. PISTOLETE HK + MANO DERECHA ESCULPIDA (CON DISCIPLINA DE GATILLO)
  // ====================================================================
  const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.108, 0.046), materials.stippledPolymer);
  pistolGrip.position.set(0, -0.078, -0.078);
  pistolGrip.rotation.x = -0.32;
  rifle.add(pistolGrip);

  // Montura de la mano derecha enguantada abrazando el pistolete con precisión milimétrica
  const rightHandMount = new THREE.Group();
  rightHandMount.position.set(-0.018, -0.072, -0.082);
  rightHandMount.rotation.x = -0.25;
  rightHandMount.rotation.y = 0.12;
  rifle.add(rightHandMount);

  // ====================================================================
  // 8. GUANTE TÁCTICO DERECHO MECHANIX M-PACT (ALTA FIDELIDAD ANATÓMICA)
  //    (Palma de gamuza sintética, protector TPR flexible, falanges articuladas)
  // ====================================================================
  // Palma anatómica curvada del guante derecho con eminencia tenar y bordes redondeados
  const rPalmGeo = createOrganicPouchVolume(0.046, 0.082, 0.068, {
    roundnessXZ: 0.62,
    roundnessY: 0.54,
    pillowBulge: 0.18,
    teardropSag: 0.05,
    wrinkleAmp: 0.0016,
    segsW: 24,
    segsH: 24,
    segsD: 16
  });
  const rPalm = new THREE.Mesh(rPalmGeo, materials.corduraVest);
  rPalm.position.set(-0.008, 0.004, -0.006);
  rightHandMount.add(rPalm);

  // Almohadilla de refuerzo en la palma interior (Suede Palm Patch con costura D3O)
  const rPalmPatchShape = createRoundedRectShape(0.034, 0.056, 0.008);
  const rPalmPatchGeo = createOrganicExtrude(rPalmPatchShape, 0.004, 0.0015, 4, 14, 2);
  const rPalmPatch = new THREE.Mesh(rPalmPatchGeo, materials.combatRubber);
  rPalmPatch.position.set(0.014, -0.002, -0.004);
  rPalmPatch.rotation.y = Math.PI / 2;
  rightHandMount.add(rPalmPatch);

  // Protector de nudillos moldeado en TPR (Thermal Plastic Rubber) con 3 canales de flexión
  const rKnuckleGeo = createOrganicPouchVolume(0.026, 0.034, 0.072, {
    roundnessXZ: 0.58,
    roundnessY: 0.52,
    pillowBulge: 0.24,
    wrinkleAmp: 0,
    segsW: 20,
    segsH: 18,
    segsD: 16
  });
  const rKnuckle = new THREE.Mesh(rKnuckleGeo, materials.combatRubber);
  rKnuckle.position.set(-0.023, 0.026, -0.002);
  rKnuckle.rotation.y = -0.08;
  rightHandMount.add(rKnuckle);

  // Nervios de impacto TPR en relieve sobre cada nudillo
  for (let k = 0; k < 4; k++) {
    const kZ = -0.024 + k * 0.016;
    const ribMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.0028, 0.016, 6, 10), materials.darkPolymer);
    ribMesh.position.set(-0.034, 0.026, kZ);
    ribMesh.rotation.z = 0.22;
    rightHandMount.add(ribMesh);
  }

  // Dedo Índice Derecho extendido recto sobre el armazón del receptor (Strict Trigger Discipline)
  // Segmentado con falange proximal y falange distal con almohadilla de tacto fino
  const indexFingerGroup = new THREE.Group();
  indexFingerGroup.position.set(-0.010, 0.040, 0.022);
  indexFingerGroup.rotation.x = 0.22;
  indexFingerGroup.rotation.y = 0.06;
  rightHandMount.add(indexFingerGroup);

  const idxPhalanx1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0064, 0.028, 10, 14), materials.corduraVest);
  idxPhalanx1.rotation.x = Math.PI / 2;
  idxPhalanx1.position.z = 0.016;
  indexFingerGroup.add(idxPhalanx1);

  // Nervio TPR protector dorsal en el índice
  const idxTpr = new THREE.Mesh(new THREE.CapsuleGeometry(0.0022, 0.022, 6, 10), materials.combatRubber);
  idxTpr.rotation.x = Math.PI / 2;
  idxTpr.position.set(-0.006, 0.004, 0.016);
  indexFingerGroup.add(idxTpr);

  const idxPhalanx2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0056, 0.026, 10, 14), materials.darkPolymer);
  idxPhalanx2.rotation.x = Math.PI / 2;
  idxPhalanx2.position.z = 0.046;
  indexFingerGroup.add(idxPhalanx2);

  // 3 Dedos inferiores (Medio, Anular, Meñique) articulados y cerrados envolviendo el pistolete
  for (let f = 0; f < 3; f++) {
    const fingerY = 0.014 - f * 0.021;
    const fingerZ = 0.022 - f * 0.003;
    const fGroup = new THREE.Group();
    fGroup.position.set(0.002, fingerY, fingerZ);
    rightHandMount.add(fGroup);

    // Falange proximal (Primer nudillo abrazando el frente del pistolete)
    const phalanx1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0066, 0.024, 10, 12), materials.corduraVest);
    phalanx1.rotation.z = Math.PI / 2 - 0.15;
    phalanx1.rotation.y = 0.28;
    phalanx1.position.set(0.012, 0, 0);
    fGroup.add(phalanx1);

    // Falange distal (Segunda falange cerrándose en la cara interna del pistolete)
    const phalanx2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0058, 0.022, 10, 12), materials.darkPolymer);
    phalanx2.rotation.z = Math.PI / 2 + 0.35;
    phalanx2.rotation.y = 0.45;
    phalanx2.position.set(0.028, -0.004, -0.008);
    fGroup.add(phalanx2);

    // Costilla TPR dorsal en la falange exterior
    const fTpr = new THREE.Mesh(new THREE.CapsuleGeometry(0.0022, 0.018, 6, 8), materials.combatRubber);
    fTpr.rotation.z = Math.PI / 2 - 0.15;
    fTpr.rotation.y = 0.28;
    fTpr.position.set(0.012, 0.006, 0.004);
    fGroup.add(fTpr);
  }

  // Pulgar derecho anatómico articulado envolviendo el lomo del pistolete
  const thumbGroup = new THREE.Group();
  thumbGroup.position.set(0.012, 0.030, -0.016);
  thumbGroup.rotation.set(0.42, 0.15, -0.58);
  rightHandMount.add(thumbGroup);

  const thumbP1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0076, 0.026, 10, 12), materials.corduraVest);
  thumbP1.position.y = 0.014;
  thumbGroup.add(thumbP1);

  const thumbP2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0068, 0.022, 10, 12), materials.darkPolymer);
  thumbP2.position.set(0.006, 0.036, 0.004);
  thumbP2.rotation.z = -0.32;
  thumbGroup.add(thumbP2);

  // Puño de neopreno y lengüeta de cierre TPR con tirador de ajuste
  const rWristCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.046, 0.036, 24), materials.combatRubber);
  rWristCuff.rotation.x = Math.PI / 2;
  rWristCuff.position.set(-0.014, -0.012, -0.048);
  rightHandMount.add(rWristCuff);

  const rWristTab = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.032, 0.006), materials.darkPolymer);
  rWristTab.position.set(-0.036, -0.012, -0.048);
  rightHandMount.add(rWristTab);

  skeleton.rightWristTarget = new THREE.Object3D();
  skeleton.rightWristTarget.position.set(-0.016, -0.012, -0.058);
  rightHandMount.add(skeleton.rightWristTarget);

  // ====================================================================
  // 9. EMPUÑADURA DELANTERA BCM + MANO IZQUIERDA EN AGARRE "C-CLAMP"
  // ====================================================================
  const bcmGrip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.072, 0.038), materials.stippledPolymer);
  bcmGrip.position.set(0, -0.036, 0.235);
  bcmGrip.rotation.x = 0.14;
  rifle.add(bcmGrip);

  // Mano izquierda sujetando el guardamanos Geissele con técnica C-Clamp (Pulgar sobre el riel superior)
  const leftHandMount = new THREE.Group();
  leftHandMount.position.set(0.026, 0.008, 0.238);
  rifle.add(leftHandMount);

  // Palma anatómica izquierda moldeada en Cordura y gamuza sintética
  const lPalmGeo = createOrganicPouchVolume(0.042, 0.078, 0.072, {
    roundnessXZ: 0.60,
    roundnessY: 0.52,
    pillowBulge: 0.16,
    wrinkleAmp: 0.0016,
    segsW: 24,
    segsH: 22,
    segsD: 16
  });
  const lPalm = new THREE.Mesh(lPalmGeo, materials.corduraVest);
  lPalm.position.set(0.006, 0.004, 0);
  leftHandMount.add(lPalm);

  // Protector de nudillos TPR izquierdo
  const lKnuckleGeo = createOrganicPouchVolume(0.022, 0.028, 0.074, {
    roundnessXZ: 0.56,
    roundnessY: 0.50,
    pillowBulge: 0.22,
    wrinkleAmp: 0,
    segsW: 20,
    segsH: 18,
    segsD: 16
  });
  const lKnuckle = new THREE.Mesh(lKnuckleGeo, materials.combatRubber);
  lKnuckle.position.set(0.020, 0.020, 0);
  lKnuckle.rotation.y = 0.08;
  leftHandMount.add(lKnuckle);

  for (let k = 0; k < 4; k++) {
    const kZ = -0.026 + k * 0.017;
    const lRib = new THREE.Mesh(new THREE.CapsuleGeometry(0.0026, 0.015, 6, 10), materials.darkPolymer);
    lRib.position.set(0.029, 0.020, kZ);
    lRib.rotation.z = -0.20;
    leftHandMount.add(lRib);
  }

  // Pulgar izquierdo en "Thumb-Over-Bore" articulado y apoyado sobre el riel Picatinny superior
  const lThumbGroup = new THREE.Group();
  lThumbGroup.position.set(-0.014, 0.046, 0.016);
  lThumbGroup.rotation.set(0.24, 0.32, Math.PI / 2 - 0.22);
  leftHandMount.add(lThumbGroup);

  const lThumbP1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0074, 0.028, 10, 12), materials.corduraVest);
  lThumbP1.position.y = 0.015;
  lThumbGroup.add(lThumbP1);

  const lThumbP2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0066, 0.024, 10, 12), materials.darkPolymer);
  lThumbP2.position.set(-0.005, 0.038, 0.004);
  lThumbP2.rotation.z = 0.35;
  lThumbGroup.add(lThumbP2);

  // 4 Dedos izquierdos articulados rodeando la parte inferior del guardamanos y empuñadura BCM
  for (let f = 0; f < 4; f++) {
    const lfGroup = new THREE.Group();
    lfGroup.position.set(-0.014, -0.018 - f * 0.013, 0.026 - f * 0.015);
    leftHandMount.add(lfGroup);

    // Falange proximal abrazando el guardamanos
    const lPhalanx1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0062, 0.024, 10, 12), materials.corduraVest);
    lPhalanx1.rotation.z = -Math.PI / 2 + 0.22;
    lPhalanx1.rotation.y = -0.22;
    lPhalanx1.position.set(-0.012, 0, 0);
    lfGroup.add(lPhalanx1);

    // Falange distal con yema de agarre en polímero antideslizante
    const lPhalanx2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0054, 0.022, 10, 12), materials.darkPolymer);
    lPhalanx2.rotation.z = -Math.PI / 2 - 0.38;
    lPhalanx2.rotation.y = -0.35;
    lPhalanx2.position.set(-0.028, 0.006, 0.006);
    lfGroup.add(lPhalanx2);

    // Protector TPR dorsal
    const lTpr = new THREE.Mesh(new THREE.CapsuleGeometry(0.0022, 0.016, 6, 8), materials.combatRubber);
    lTpr.rotation.z = -Math.PI / 2 + 0.22;
    lTpr.rotation.y = -0.22;
    lTpr.position.set(-0.012, -0.006, -0.004);
    lfGroup.add(lTpr);
  }

  // Puño de neopreno y muñequera izquierda
  const lWristCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.046, 0.036, 24), materials.combatRubber);
  lWristCuff.rotation.x = Math.PI / 2;
  lWristCuff.rotation.y = 0.35;
  lWristCuff.position.set(0.022, -0.022, -0.042);
  leftHandMount.add(lWristCuff);

  const lWristTab = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.032, 0.006), materials.darkPolymer);
  lWristTab.position.set(0.044, -0.022, -0.042);
  leftHandMount.add(lWristTab);

  skeleton.leftWristTarget = new THREE.Object3D();
  skeleton.leftWristTarget.position.set(0.028, -0.026, -0.054);
  leftHandMount.add(skeleton.leftWristTarget);

  // ====================================================================
  // 10. ESLINGA TÁCTICA DE 2 PUNTOS CONECTADA AL GUARDAMANOS Y CULATA
  // ====================================================================
  // Anilla QD delantera en el guardamanos Geissele + Correa Ferro Concepts Slingster
  const qdMountFront = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 14), materials.boltSteel);
  qdMountFront.rotation.z = Math.PI / 2;
  qdMountFront.position.set(0.026, 0.022, 0.125);
  rifle.add(qdMountFront);

  const slingCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.028, 0.022, 0.125),
    new THREE.Vector3(0.092, 0.075, 0.020),
    new THREE.Vector3(0.118, 0.118, -0.085),
    new THREE.Vector3(0.032, 0.095, -0.155),
    new THREE.Vector3(-0.015, 0.025, -0.145)
  ]);
  const slingGeo = new THREE.TubeGeometry(slingCurve, 36, 0.0072, 8, false);
  slingGeo.scale(1.0, 0.42, 1.0);
  const slingMesh = new THREE.Mesh(slingGeo, materials.webbing);
  rifle.add(slingMesh);
}

export function buildArmsAndWeapon(materials: MaterialLibrary, skeleton: OperatorSkeleton): void {
  // Hombros anatómicos en el torso superior
  skeleton.rightShoulder = new THREE.Group();
  skeleton.rightShoulder.position.set(-0.232, 0.188, 0.018);
  skeleton.chest.add(skeleton.rightShoulder);

  skeleton.leftShoulder = new THREE.Group();
  skeleton.leftShoulder.position.set(0.232, 0.188, 0.032);
  skeleton.chest.add(skeleton.leftShoulder);

  // Dimensiones óseas calibradas para el Solver de Cinemática Inversa Analítica (2-Bone IK)
  skeleton.upperArmLen = 0.278;
  skeleton.forearmLen = 0.268;

  const createLimbSegments = (isRight: boolean): LimbRig => {
    const side = isRight ? -1 : 1;

    // Grupo del Brazo Superior (Hombro -> Codo, orientado en eje +Z hacia el target)
    const upperGroup = new THREE.Group();
    skeleton.chest.add(upperGroup);

    // Cúpula del Deltoides Superior integrada en la cabeza del hombro (gira de forma continua con el brazo)
    const rawDeltoidGeo = new THREE.SphereGeometry(0.078, 36, 26, 0, Math.PI * 2, 0, Math.PI * 0.72);
    rawDeltoidGeo.scale(1.02, 1.15, 1.05);
    const deltoidGeo = sculptClothFolds(rawDeltoidGeo, 8, 16, 0.0042);
    const dPos = deltoidGeo.attributes.position;
    const dUv = deltoidGeo.attributes.uv;
    if (dUv) {
      for (let i = 0; i < dPos.count; i++) {
        dUv.setXY(i, (dPos.getX(i) + dPos.getZ(i)) * 2.45, dPos.getY(i) * 2.45);
      }
      dUv.needsUpdate = true;
    }
    const deltoidCap = new THREE.Mesh(deltoidGeo, materials.camoFabric);
    deltoidCap.position.set(side * 0.012, 0.008, 0.006);
    deltoidCap.rotation.z = -side * 0.20;
    upperGroup.add(deltoidCap);

    // Costura doble reforzada en la unión del hombro / manga raglán (Shoulder Double-Stitched Seam)
    for (const sOff of [-0.0020, 0.0020]) {
      const shoulderSeamRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.068 + sOff * 0.4, 0.0011, 8, 28),
        materials.stitchThread
      );
      shoulderSeamRing.position.set(side * 0.006, 0.004, 0.022 + sOff);
      shoulderSeamRing.rotation.y = side * 0.22;
      upperGroup.add(shoulderSeamRing);
    }

    // 1. BRAZO SUPERIOR: Deformación anatómica no-cilíndrica con pliegues profundos en la cara interna del codo
    const rawUpperArmGeo = new THREE.CylinderGeometry(0.068, 0.058, skeleton.upperArmLen, 42, 30);
    const uaPos = rawUpperArmGeo.attributes.position;
    for (let i = 0; i < uaPos.count; i++) {
      const ux = uaPos.getX(i);
      const uy = uaPos.getY(i);
      const uz = uaPos.getZ(i);
      const ny = uy / (skeleton.upperArmLen * 0.5); // -1 (hombro, Z=0) a +1 (codo, Z=upperArmLen)
      const ang = Math.atan2(uz, ux);

      // Perfil anatómico elíptico de bíceps/tríceps y caída gravitatoria de la manga
      const bicepSwell = Math.max(0, Math.sin(ang)) * Math.sin((1.0 - ny) * Math.PI * 0.5) * 0.0068;
      const tricepSweep = Math.max(0, -Math.sin(ang)) * Math.cos(ny * Math.PI * 0.4) * 0.0052;
      const diagonalDrape = Math.sin(ny * Math.PI * 2.5 + ang * 2.0 * side) * 0.0028 * (1.0 - Math.abs(ny) * 0.3);

      // Pliegues profundos en acordeón y rombos en la flexura interna del codo (ny > 0.32)
      const crookWeight = 0.55 + 0.45 * Math.max(0, Math.sin(ang));
      const elbowBunch = ny > 0.32
        ? (Math.sin(((ny - 0.32) / 0.68) * Math.PI * 5.5 + Math.cos(ang * 3.0) * 1.1) * 0.0054 +
           Math.cos(((ny - 0.32) / 0.68) * Math.PI * 9.0) * 0.0022) * crookWeight
        : 0.0;

      // Engaste anatómico en la articulación del codo (ny > 0.80)
      let elbowExtend = 0.0;
      if (ny > 0.80) {
        const factor = (ny - 0.80) / 0.20;
        elbowExtend = factor * 0.016;
      }

      // Costura doble longitudinal en relieve (Double-Welt Sleeve Seam)
      const seamDist = Math.abs(ang - Math.PI * 0.5);
      const seamWelt = (Math.exp(-Math.pow((seamDist - 0.04) / 0.04, 2.0)) +
                        Math.exp(-Math.pow((seamDist + 0.04) / 0.04, 2.0))) * 0.0022;

      const rLen = Math.hypot(ux, uz);
      if (rLen > 1e-5) {
        const extraR = bicepSwell + tricepSweep + diagonalDrape + elbowBunch + seamWelt;
        uaPos.setX(i, ux * 1.04 + (ux / rLen) * extraR);
        uaPos.setY(i, uy + elbowExtend);
        uaPos.setZ(i, uz * 0.96 + (uz / rLen) * extraR);
      }
    }
    const upperArmGeo = sculptClothFolds(rawUpperArmGeo, 9, 22, 0.0064);
    upperArmGeo.rotateX(Math.PI / 2);
    upperArmGeo.translate(0, 0, skeleton.upperArmLen / 2);
    const upperArmMesh = new THREE.Mesh(upperArmGeo, materials.camoFabric);
    upperGroup.add(upperArmMesh);

    // Bolsillo táctico de manga Crye G3 redondeado + Panel Velcro con parche IR curvado sobre el brazo
    const pocketGeo = createOrganicPouchVolume(0.024, 0.088, 0.112, {
      roundnessXZ: 0.56,
      roundnessY: 0.52,
      pillowBulge: 0.14,
      wrinkleAmp: 0.0024
    });
    const pPos = pocketGeo.attributes.position;
    const pUv = pocketGeo.attributes.uv;
    if (pUv) {
      for (let i = 0; i < pPos.count; i++) {
        pUv.setXY(i, (pPos.getZ(i) + pPos.getX(i)) * 2.45, pPos.getY(i) * 2.45);
      }
      pUv.needsUpdate = true;
    }
    const pocket = new THREE.Mesh(pocketGeo, materials.camoFabric);
    pocket.position.set(side * 0.056, 0.01, skeleton.upperArmLen * 0.42);
    upperGroup.add(pocket);

    // Costura doble reforzada perimetral en el bolsillo de hombro Crye G3
    for (const sOff of [-0.0018, 0.0018]) {
      const pSeamShape = createRoundedRectShape(0.108 + sOff * 2.0, 0.084 + sOff * 2.0, 0.014);
      const pSeamPts3D = pSeamShape.getPoints(24).map(
        (pt) => new THREE.Vector3(side * 0.066, 0.01 + pt.y, skeleton.upperArmLen * 0.42 + pt.x)
      );
      const pSeamMesh = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pSeamPts3D, true), 28, 0.0009, 6, true),
        materials.stitchThread
      );
      upperGroup.add(pSeamMesh);
    }

    const patchShape = createRoundedRectShape(0.084, 0.064, 0.010);
    const patchGeo = createOrganicExtrude(patchShape, 0.006, 0.002, 4, 16, 4);
    patchGeo.rotateY(Math.PI / 2);
    const patch = new THREE.Mesh(patchGeo, materials.patchMat);
    patch.position.set(side * 0.068, 0.01, skeleton.upperArmLen * 0.42);
    upperGroup.add(patch);

    // 2. GRUPO DEL ANTEBRAZO (Codo en Z=0 -> Muñeca en Z=forearmLen)
    const lowerGroup = new THREE.Group();
    skeleton.chest.add(lowerGroup);

    // Puente de manga flexor continuo en la articulación del codo con pliegues profundos de compresión interna
    const rawElbowBridgeGeo = new THREE.CylinderGeometry(0.061, 0.060, 0.078, 40, 22);
    const ebPos = rawElbowBridgeGeo.attributes.position;
    for (let i = 0; i < ebPos.count; i++) {
      const ex = ebPos.getX(i);
      const ey = ebPos.getY(i);
      const ez = ebPos.getZ(i);
      const ang = Math.atan2(ez, ex);
      const olecranonBulge = Math.cos(ang) < -0.2 ? Math.pow(-Math.cos(ang), 1.5) * 0.013 : 0.0;
      // Pliegues transversales y en V profundos en la fosa cubital (parte interna del codo)
      const crookFold = Math.cos(ang) > 0.10
        ? (-0.0075 + Math.sin(ey * 210.0 + Math.sin(ang * 3.0) * 1.4) * 0.0046) * Math.pow(Math.cos(ang), 0.75)
        : 0.0;
      const rLen = Math.hypot(ex, ez);
      if (rLen > 1e-5) {
        const delta = olecranonBulge + crookFold;
        ebPos.setX(i, ex + (ex / rLen) * delta);
        ebPos.setZ(i, ez + (ez / rLen) * delta);
      }
    }
    const elbowBridgeGeo = sculptClothFolds(rawElbowBridgeGeo, 7, 16, 0.0046);
    elbowBridgeGeo.rotateX(Math.PI / 2);
    const elbowBridgeMesh = new THREE.Mesh(elbowBridgeGeo, materials.camoFabric);
    elbowBridgeMesh.position.set(0, 0, 0);
    lowerGroup.add(elbowBridgeMesh);

    // Antebrazo: pliegues de acordeón en la cara interna del codo, compresión de codera y fruncido en muñeca
    const rawForearmGeo = new THREE.CylinderGeometry(0.060, 0.044, skeleton.forearmLen, 42, 30);
    const faPos = rawForearmGeo.attributes.position;
    for (let i = 0; i < faPos.count; i++) {
      const fx = faPos.getX(i);
      const fy = faPos.getY(i);
      const fz = faPos.getZ(i);
      const ny = fy / (skeleton.forearmLen * 0.5); // -1 (codo, Z=0) a +1 (muñeca, Z=forearmLen)
      const ang = Math.atan2(fz, fx);

      // Pliegues profundos en acordeón y rombos en la unión interna del codo (ny < -0.22)
      const innerWeight = 0.60 + 0.40 * Math.max(0, Math.cos(ang));
      const elbowCrease = ny < -0.22
        ? (Math.sin(((ny + 1.0) / 0.78) * Math.PI * 5.5 + Math.sin(ang * 4.0) * 1.2) * 0.0052 +
           Math.cos(((ny + 1.0) / 0.78) * Math.PI * 9.0) * 0.0022) * innerWeight
        : 0.0;

      // Surco de compresión donde la codera Crye AirFlex se ciñe al antebrazo (ny ~ -0.52)
      const padStrapDist = Math.abs(ny - (-0.52));
      const padStrapPinch = padStrapDist < 0.16
        ? -Math.pow(Math.cos((padStrapDist / 0.16) * Math.PI * 0.5), 2.0) * 0.0032
        : 0.0;

      // Engaste del antebrazo hacia el codo
      let elbowExtend = 0.0;
      if (ny < -0.80) {
        const factor = (-ny - 0.80) / 0.20;
        elbowExtend = -factor * 0.016;
      }

      // Fruncido orgánico en el puño de la muñeca (ny > 0.50)
      const cuffGather = ny > 0.50
        ? Math.sin(((ny - 0.50) / 0.50) * Math.PI * 3.5) * 0.0034 + Math.cos(ang * 8.0) * 0.0020 * ((ny - 0.50) / 0.50)
        : 0.0;
      const forearmMuscle = ny < 0.25 && ny > -0.65 ? Math.sin((ny + 0.65) * Math.PI * 0.8) * 0.0052 : 0.0;
      const seamDist = Math.abs(ang + Math.PI * 0.5);
      const seamWelt = (Math.exp(-Math.pow((seamDist - 0.04) / 0.04, 2.0)) +
                        Math.exp(-Math.pow((seamDist + 0.04) / 0.04, 2.0))) * 0.0020;
      const rLen = Math.hypot(fx, fz);
      if (rLen > 1e-5) {
        const deltaR = forearmMuscle + elbowCrease + padStrapPinch + cuffGather + seamWelt;
        faPos.setX(i, fx * 1.04 + (fx / rLen) * deltaR);
        faPos.setY(i, fy + elbowExtend);
        faPos.setZ(i, fz * 0.96 + (fz / rLen) * deltaR);
      }
    }
    const forearmGeo = sculptClothFolds(rawForearmGeo, 9, 24, 0.0062);
    forearmGeo.rotateX(Math.PI / 2);
    forearmGeo.translate(0, 0, skeleton.forearmLen / 2);
    const forearmMesh = new THREE.Mesh(forearmGeo, materials.camoFabric);
    lowerGroup.add(forearmMesh);

    // Puño de manga Crye G3 con lengüeta de ajuste Velcro (elimina cualquier corte cilíndrico en la muñeca)
    const wristCuffGeo = sculptClothFolds(new THREE.TorusGeometry(0.041, 0.0068, 14, 28), 6, 12, 0.0018);
    const wristCuff = new THREE.Mesh(wristCuffGeo, materials.camoFabric);
    wristCuff.position.set(0, 0, skeleton.forearmLen - 0.008);
    lowerGroup.add(wristCuff);

    // ====================================================================
    // CODERA DE COMBATE ARTICULADA CRYE PRECISION G3 AIRFLEX
    // (Bolsillo de inserción textil + Concha protectora ergonómica con hendiduras de flexión)
    // ====================================================================
    // A) Cuna / bolsillo de tela reforzada cosida a la manga sobre el vértice del codo
    const cradleShape = createRoundedRectShape(0.062, 0.088, 0.016);
    const cradleGeo = createOrganicExtrude(cradleShape, 0.008, 0.002, 4, 16, 4, (v) => {
      // Curvatura envolvente cilíndrica para ceñirse a la manga
      const arc = v.x / 0.060;
      v.z -= Math.cos(arc) * 0.005 - 0.005;
    });
    cradleGeo.rotateX(Math.PI / 2);
    const elbowCradle = new THREE.Mesh(cradleGeo, materials.camoFabric);
    elbowCradle.position.set(0, -0.058, 0.004);
    lowerGroup.add(elbowCradle);

    // B) Concha protectora articulada Crye AirFlex en caucho de combate mate con 3 ranuras chevron
    const padShape = createRoundedRectShape(0.052, 0.076, 0.012);
    const padGeo = createOrganicExtrude(padShape, 0.011, 0.0025, 4, 16, 4, (v) => {
      const arc = v.x / 0.055;
      v.z -= Math.cos(arc) * 0.006 - 0.006;
      // 3 ranuras chevron horizontales que permiten la flexión ergonómica
      const slitDist1 = Math.abs(v.y - 0.018);
      const slitDist2 = Math.abs(v.y);
      const slitDist3 = Math.abs(v.y + 0.018);
      const minSlit = Math.min(slitDist1, slitDist2, slitDist3);
      if (minSlit < 0.0028) {
        v.z -= (0.0028 - minSlit) * 1.2;
      }
    });
    padGeo.rotateX(Math.PI / 2);
    const elbowPad = new THREE.Mesh(padGeo, materials.combatRubber);
    elbowPad.position.set(0, -0.064, 0.005);
    lowerGroup.add(elbowPad);

    // En la muñeca izquierda: Reloj/Navegador GPS Garmin Foretrex 601 con correa y telemetría
    if (!isRight) {
      const gpsGroup = new THREE.Group();
      gpsGroup.position.set(-0.012, 0.044, skeleton.forearmLen * 0.76);
      lowerGroup.add(gpsGroup);

      const gpsStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.046, 0.032, 22), materials.webbing);
      gpsStrap.rotation.x = Math.PI / 2;
      gpsStrap.position.y = -0.044;
      gpsGroup.add(gpsStrap);

      const gpsBodyGeo = createOrganicPouchVolume(0.048, 0.018, 0.036, {
        roundnessXZ: 0.48,
        roundnessY: 0.42,
        pillowBulge: 0.06,
        wrinkleAmp: 0
      });
      const gpsBody = new THREE.Mesh(gpsBodyGeo, materials.darkPolymer);
      gpsGroup.add(gpsBody);

      const gpsScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.036, 0.024),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      gpsScreen.rotation.x = -Math.PI / 2;
      gpsScreen.position.y = 0.0095;
      gpsGroup.add(gpsScreen);
    }

    return { upperGroup, lowerGroup };
  };

  skeleton.rightLimb = createLimbSegments(true);
  skeleton.leftLimb = createLimbSegments(false);

  // ====================================================================
  // CARABINA DE OPERACIONES ESPECIALES (HK416A5 CAG / Geissele SMR)
  // Posicionada desplazada hacia el frente y el costado derecho (-X, +Z)
  // para evitar colisiones con el torso y el chaleco portaplacas.
  // ====================================================================
  skeleton.weaponGroup = new THREE.Group();
  skeleton.weaponGroup.position.set(-0.126, 0.052, 0.368);
  skeleton.chest.add(skeleton.weaponGroup);

  buildAssaultRifle(skeleton.weaponGroup, materials, skeleton);

  // Resolver Cinemática Inversa inicial de ambos brazos hacia las empuñaduras del fusil
  updateWeaponAndArmsIK(skeleton, 0);
}
