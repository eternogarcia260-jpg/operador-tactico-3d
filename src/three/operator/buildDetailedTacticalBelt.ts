import * as THREE from 'three';
import { MaterialLibrary } from '../types';
import {
  createRoundedRectShape,
  createOrganicExtrude,
  createOrganicPouchVolume,
  createRoundedStrapGeometry
} from '../geometry/organicGeometry';

/**
 * Construye el Cinturón Táctico de Operaciones Especiales Ronin Tactics Senshi
 * con sistema de doble cinturón (Inner Velcro + Outer MOLLE Load-Rated Belt),
 * hebilla AustriAlpin COBRA® Pro con anilla D-Ring de extracción helitransportada,
 * costuras Box-X de carga, pouches Esstac Kywi con munición 9mm/5.56mm visible,
 * bolsa de descarga plegada con cordón elástico y botiquín IFAK trasero con torniquete.
 */
export function buildDetailedTacticalBelt(parentHips: THREE.Group, materials: MaterialLibrary): void {
  const beltRigGroup = new THREE.Group();
  beltRigGroup.position.y = 0.052;
  parentHips.add(beltRigGroup);

  // 1. CINTURÓN INTERIOR DE VELCRO CON BORDES BISELADOS Y TRABILLAS EN ARCO TEXTIL (CRYE G3 LOOPS)
  const innerBeltGeo = new THREE.CylinderGeometry(0.183, 0.183, 0.058, 64, 12);
  const ibPos = innerBeltGeo.attributes.position;
  for (let i = 0; i < ibPos.count; i++) {
    const ny = ibPos.getY(i) / 0.029;
    const bevel = Math.pow(Math.max(0.001, 1.0 - Math.pow(Math.abs(ny), 3.6)), 0.18);
    ibPos.setX(i, ibPos.getX(i) * 1.11 * bevel);
    ibPos.setZ(i, ibPos.getZ(i) * 0.83 * bevel);
  }
  innerBeltGeo.computeVertexNormals();
  const innerBelt = new THREE.Mesh(innerBeltGeo, materials.hypalon);
  beltRigGroup.add(innerBelt);

  // 7 Trabillas textiles del pantalón con arco superior/inferior cosido al pantalón y puente convexo sobre el cinturón
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + 0.45;
    if (Math.cos(angle) > 0.85) continue; // Dejar libre el frontal de la hebilla Cobra
    const loopCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.038, -0.006),
      new THREE.Vector3(0, -0.022, 0.005),
      new THREE.Vector3(0, 0.0, 0.007),
      new THREE.Vector3(0, 0.022, 0.005),
      new THREE.Vector3(0, 0.038, -0.006)
    ]);
    const loopGeo = createRoundedStrapGeometry(loopCurve, 0.018, 0.0055, 10, 20);
    const beltLoop = new THREE.Mesh(loopGeo, materials.camoFabric);
    beltLoop.position.set(Math.sin(angle) * 0.203, -0.003, Math.cos(angle) * 0.152);
    beltLoop.rotation.y = angle;
    beltRigGroup.add(beltLoop);
  }

  // 2. CINTURÓN EXTERIOR RONIN SENSHI (PERFIL CONVEXO ACOLCHADO + BANDA MICRO-MOLLE CON ONDULACIÓN DE COSTURA)
  const outerBeltGeo = new THREE.CylinderGeometry(0.191, 0.191, 0.050, 72, 16);
  const obPos = outerBeltGeo.attributes.position;
  for (let i = 0; i < obPos.count; i++) {
    const ox = obPos.getX(i);
    const oy = obPos.getY(i);
    const oz = obPos.getZ(i);
    const ny = oy / 0.025;
    const ang = Math.atan2(ox, oz);
    // Perfil transversal convexo tipo almohadilla de carga con cantos redondeados
    const crown = Math.pow(Math.max(0.001, 1.0 - Math.pow(Math.abs(ny), 2.8)), 0.26);
    // Ligera modulación orgánica entre costuras Bartack cada 16 grados
    const bartackWave = Math.cos(ang * (360 / 16)) * 0.0012;
    const rScale = (0.97 + 0.045 * crown) + bartackWave;
    obPos.setX(i, ox * 1.11 * rScale);
    obPos.setZ(i, oz * 0.84 * rScale);
  }
  outerBeltGeo.computeVertexNormals();
  const outerBelt = new THREE.Mesh(outerBeltGeo, materials.corduraVest);
  beltRigGroup.add(outerBelt);

  // Ribetes superior e inferior en poliamida tejida + Doble banda Micro-MOLLE con ondulación real sobre las celdas PALS
  for (const edgeY of [-0.023, 0.023]) {
    const bindingRim = new THREE.Mesh(new THREE.TorusGeometry(0.191, 0.0042, 12, 64), materials.webbing);
    bindingRim.rotation.x = Math.PI / 2;
    bindingRim.scale.set(1.11, 0.84, 1.0);
    bindingRim.position.y = edgeY;
    beltRigGroup.add(bindingRim);
  }

  for (const molleY of [-0.011, 0.011]) {
    const molleGeo = new THREE.TorusGeometry(0.1935, 0.0034, 10, 96);
    molleGeo.rotateX(Math.PI / 2);
    const mPos = molleGeo.attributes.position;
    for (let i = 0; i < mPos.count; i++) {
      const mx = mPos.getX(i);
      const mz = mPos.getZ(i);
      const ang = Math.atan2(mx, mz);
      // Hundimiento en cada costura Bartack (cada 16 grados) y arco convexo en el centro de la celda MOLLE
      const wave = (Math.abs(ang) > 0.45) ? Math.sin(ang * 22.5) * 0.0022 : 0;
      mPos.setX(i, mx * 1.11 + Math.sin(ang) * wave);
      mPos.setZ(i, mz * 0.84 + Math.cos(ang) * wave);
    }
    molleGeo.computeVertexNormals();
    const molleBand = new THREE.Mesh(molleGeo, materials.webbing);
    molleBand.position.y = molleY;
    beltRigGroup.add(molleBand);
  }

  // Costuras verticales de refuerzo (MOLLE Bartacks) esculpidas como cordones de hilo redondeados
  for (let deg = 28; deg < 332; deg += 16) {
    const rad = THREE.MathUtils.degToRad(deg);
    const bx = Math.sin(rad) * 0.214;
    const bz = Math.cos(rad) * 0.163;
    const bartackGeo = new THREE.CapsuleGeometry(0.0022, 0.038, 6, 10);
    const bartack = new THREE.Mesh(bartackGeo, materials.stitchThread);
    bartack.position.set(bx, 0, bz);
    bartack.rotation.y = rad;
    beltRigGroup.add(bartack);
  }

  // 3. HEBILLA AUSTRIALPIN COBRA® PRO CNC (SILUETA OCTOGONAL CHAFLANADA + OREJETAS DE LATÓN CURVAS + D-RING)
  const cobraGroup = new THREE.Group();
  cobraGroup.position.set(0, 0, 0.164);
  beltRigGroup.add(cobraGroup);

  // Chasis hembra fresado en CNC con contorno octogonal redondeado y rebaje central
  const cobraFemaleShape = createRoundedRectShape(0.036, 0.056, 0.009);
  const cobraFemaleGeo = createOrganicExtrude(cobraFemaleShape, 0.015, 0.0032, 6, 20, 4);
  const cobraFemale = new THREE.Mesh(cobraFemaleGeo, materials.gunmetal);
  cobraFemale.position.set(-0.012, 0, 0.004);
  cobraGroup.add(cobraFemale);

  // Chasis macho fresado en CNC con hombros curvos
  const cobraMaleShape = createRoundedRectShape(0.030, 0.052, 0.008);
  const cobraMaleGeo = createOrganicExtrude(cobraMaleShape, 0.014, 0.003, 6, 20, 4);
  const cobraMale = new THREE.Mesh(cobraMaleGeo, materials.gunmetal);
  cobraMale.position.set(0.018, 0, 0.004);
  cobraGroup.add(cobraMale);

  // Remaches abombados de acero inoxidable y Pestillos de liberación rápida en latón con perfil de aleta ergonómica
  const earShape = createRoundedRectShape(0.015, 0.011, 0.0045);
  const earGeo = createOrganicExtrude(earShape, 0.011, 0.0025, 5, 16, 3);
  for (const rY of [-0.018, 0.018]) {
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 14, 10), materials.boltSteel);
    rivet.scale.set(1.0, 1.0, 0.55);
    rivet.position.set(-0.014, rY, 0.011);
    cobraGroup.add(rivet);

    const brassEar = new THREE.Mesh(earGeo, materials.brass);
    brassEar.position.set(0.003, rY * 1.38, 0.005);
    brassEar.rotation.z = rY > 0 ? -0.24 : 0.24;
    cobraGroup.add(brassEar);
  }

  // Anilla D-Ring de acero forjado para extracción helitransportada + presilla de Hypalon curvada
  const dRing = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0048, 14, 28, Math.PI * 1.25), materials.boltSteel);
  dRing.rotation.z = -Math.PI / 2 - 0.35;
  dRing.rotation.y = 0.22;
  dRing.position.set(0.032, 0, 0.009);
  cobraGroup.add(dRing);

  const keeperCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.042, 0.013, 0.001),
    new THREE.Vector3(0.048, 0.013, 0.011),
    new THREE.Vector3(0.052, 0.0, 0.013),
    new THREE.Vector3(0.048, -0.013, 0.011),
    new THREE.Vector3(0.042, -0.013, 0.001)
  ]);
  const dRingKeeper = new THREE.Mesh(
    createRoundedStrapGeometry(keeperCurve, 0.018, 0.0045, 10, 20),
    materials.hypalon
  );
  cobraGroup.add(dRingKeeper);

  // Extremo sobrante de la cinta de ajuste (Running Webbing Tail) curvándose orgánicamente sobre el cinturón + Presilla elástica
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.028, 0, 0.005),
    new THREE.Vector3(-0.048, -0.002, 0.006),
    new THREE.Vector3(-0.072, -0.005, -0.002),
    new THREE.Vector3(-0.088, -0.008, -0.010)
  ]);
  const webbingTail = new THREE.Mesh(
    createRoundedStrapGeometry(tailCurve, 0.043, 0.0055, 12, 24),
    materials.webbing
  );
  cobraGroup.add(webbingTail);

  // 4. CADERA IZQUIERDA (+X): POUCHES ESSTAC KYWI 2+1 (2x PISTOLA + 1x 5.56mm) CON FORMAS ORGÁNICAS Y LABIOS KYDEX ACAMPANADOS
  const leftPouchesGroup = new THREE.Group();
  beltRigGroup.add(leftPouchesGroup);

  for (let p = 0; p < 2; p++) {
    const angle = 1.08 + p * 0.26;
    const px = Math.sin(angle) * 0.214;
    const pz = Math.cos(angle) * 0.164;

    const kywiPistol = new THREE.Group();
    kywiPistol.position.set(px, 0.006, pz);
    kywiPistol.rotation.y = angle + Math.PI / 2;
    kywiPistol.rotation.z = -0.10; // Inclinación ergonómica de recarga rápida
    leftPouchesGroup.add(kywiPistol);

    // Funda exterior de Cordura tensada con sección de estadio redondeado y cintura ceñida por las costuras laterales
    const pouchShellGeo = createOrganicPouchVolume(0.044, 0.088, 0.036, {
      roundnessXZ: 0.52,
      roundnessY: 0.28,
      teardropSag: -0.08, // Ligeramente acampanado arriba por la presión del Kydex
      pillowBulge: 0.12,
      pinchY: [{ y: -0.35, width: 0.35, depth: 0.06 }],
      wrinkleAmp: 0.0018,
      segsW: 20,
      segsH: 20,
      segsD: 14
    });
    const pouchShell = new THREE.Mesh(pouchShellGeo, materials.corduraVest);
    kywiPistol.add(pouchShell);

    // Cuña de retención Kydex interior (KYWI Wedge) con boca superior curvada y acampanada
    const kydexInsertGeo = createOrganicPouchVolume(0.039, 0.095, 0.030, {
      roundnessXZ: 0.58,
      roundnessY: 0.22,
      teardropSag: -0.12,
      pillowBulge: 0.06,
      wrinkleAmp: 0
    });
    const kydexInsert = new THREE.Mesh(kydexInsertGeo, materials.darkPolymer);
    kydexInsert.position.y = 0.005;
    kywiPistol.add(kydexInsert);

    // Cuerpo del cargador Glock de 17 proyectiles con lomo redondeado y labios de alimentación
    const glockMagGeo = createOrganicPouchVolume(0.033, 0.046, 0.024, {
      roundnessXZ: 0.48,
      roundnessY: 0.24,
      teardropSag: 0.0,
      pillowBulge: 0.05,
      wrinkleAmp: 0
    });
    const glockMag = new THREE.Mesh(glockMagGeo, materials.darkPolymer);
    glockMag.position.y = 0.056;
    kywiPistol.add(glockMag);

    // Zapata extendida CNC (Taran Tactical / Geissele Basepad) con perfil ergonómico curvo y rebajes para los dedos
    const magPadGeo = createOrganicPouchVolume(0.038, 0.018, 0.030, {
      roundnessXZ: 0.56,
      roundnessY: 0.46,
      teardropSag: -0.14,
      pillowBulge: 0.10,
      wrinkleAmp: 0
    });
    const magPad = new THREE.Mesh(magPadGeo, materials.geisseleDDC);
    magPad.position.y = 0.083;
    kywiPistol.add(magPad);

    // Cartucho 9x19mm Parabellum con vaina de latón y ojiva parabólica redondeada visible en los labios del cargador
    const round9mm = new THREE.Mesh(new THREE.CapsuleGeometry(0.0046, 0.015, 8, 14), materials.brass);
    round9mm.rotation.z = Math.PI / 2;
    round9mm.position.set(0, 0.045, 0.004);
    kywiPistol.add(round9mm);
  }

  // Pouch rápido de Carabina 5.56mm (Esstac Kywi Shorty) con cargador PMAG Gen M3 curvado y nervaduras redondeadas
  const rifleBeltMagGroup = new THREE.Group();
  const rAngle = 1.68;
  rifleBeltMagGroup.position.set(Math.sin(rAngle) * 0.218, 0.005, Math.cos(rAngle) * 0.166);
  rifleBeltMagGroup.rotation.y = rAngle + Math.PI / 2;
  rifleBeltMagGroup.rotation.z = 0.06;
  leftPouchesGroup.add(rifleBeltMagGroup);

  const shortyPouchGeo = createOrganicPouchVolume(0.078, 0.092, 0.038, {
    roundnessXZ: 0.46,
    roundnessY: 0.28,
    teardropSag: -0.06,
    pillowBulge: 0.12,
    pinchY: [{ y: -0.25, width: 0.35, depth: 0.05 }],
    wrinkleAmp: 0.0020
  });
  const shortyPouch = new THREE.Mesh(shortyPouchGeo, materials.corduraVest);
  rifleBeltMagGroup.add(shortyPouch);

  const shortyKydexGeo = createOrganicPouchVolume(0.071, 0.098, 0.031, {
    roundnessXZ: 0.52,
    roundnessY: 0.22,
    teardropSag: -0.10,
    pillowBulge: 0.06,
    wrinkleAmp: 0
  });
  const shortyKydex = new THREE.Mesh(shortyKydexGeo, materials.darkPolymer);
  shortyKydex.position.y = 0.004;
  rifleBeltMagGroup.add(shortyKydex);

  // Cargador Magpul PMAG 30 AR/M4 Gen M3 con curvatura real STANAG, lomos redondeados y nervaduras de agarre
  const beltPmagGeo = createOrganicPouchVolume(0.065, 0.074, 0.026, {
    roundnessXZ: 0.44,
    roundnessY: 0.24,
    teardropSag: 0.0,
    pillowBulge: 0.07,
    wrinkleAmp: 0
  });
  const pmPos = beltPmagGeo.attributes.position;
  for (let i = 0; i < pmPos.count; i++) {
    const py = pmPos.getY(i);
    const px = pmPos.getX(i);
    // Curva longitudinal constante de cargador 5.56mm + nervaduras horizontales PMAG
    const curveX = Math.pow(Math.max(0.0, (py + 0.037) / 0.074), 1.8) * 0.0065;
    const rib = Math.sin(py * 240.0) * 0.0009;
    pmPos.setX(i, px + curveX);
    pmPos.setZ(i, pmPos.getZ(i) + Math.sign(pmPos.getZ(i)) * rib);
  }
  beltPmagGeo.computeVertexNormals();
  const beltPmag = new THREE.Mesh(beltPmagGeo, materials.pmagFDE);
  beltPmag.position.y = 0.068;
  rifleBeltMagGroup.add(beltPmag);

  // Placa base acampanada del PMAG (Flared Floorplate) con bordes redondeados
  const beltPmagBaseGeo = createOrganicPouchVolume(0.071, 0.016, 0.032, {
    roundnessXZ: 0.52,
    roundnessY: 0.48,
    teardropSag: -0.12,
    pillowBulge: 0.09,
    wrinkleAmp: 0
  });
  const beltPmagBase = new THREE.Mesh(beltPmagBaseGeo, materials.darkPolymer);
  beltPmagBase.position.set(0.006, 0.107, 0);
  beltPmagBase.rotation.z = -0.09;
  rifleBeltMagGroup.add(beltPmagBase);

  // 5. BOLSA DE DESCARGA ORGÁNICA (T.REX / BFG DUMP POUCH) CON SILUETA DE SACO FRUNCIDO Y CAÍDA DE PERA
  const dumpGroup = new THREE.Group();
  const dAngle = 2.28;
  dumpGroup.position.set(Math.sin(dAngle) * 0.212, -0.024, Math.cos(dAngle) * 0.162);
  dumpGroup.rotation.y = dAngle + Math.PI;
  beltRigGroup.add(dumpGroup);

  // Solapa de montaje MOLLE en Hypalon curvada sobre el cinturón con esquinas redondeadas
  const dumpMountShape = createRoundedRectShape(0.088, 0.054, 0.016);
  const dumpMountGeo = createOrganicExtrude(dumpMountShape, 0.012, 0.0035, 5, 20, 4, (v) => {
    v.z -= Math.cos(v.x * 16.0) * 0.005;
  });
  const dumpMount = new THREE.Mesh(dumpMountGeo, materials.hypalon);
  dumpMount.position.set(0, 0.028, 0.004);
  dumpGroup.add(dumpMount);

  // Saco de nylon Ripstop con cuello fruncido por cordón elástico, panza abombada por gravedad (Teardrop Sack) y fondo hemisférico continuo sin pellizco polar
  const dumpBagGeo = createOrganicPouchVolume(0.092, 0.146, 0.068, {
    roundnessXZ: 0.78,
    roundnessY: 0.68,
    teardropSag: 0.24,
    pillowBulge: 0.20,
    pinchY: [{ y: 0.56, width: 0.34, depth: 0.28 }],
    wrinkleAmp: 0.0028,
    wrinkleFreq: 24,
    segsW: 32,
    segsH: 32,
    segsD: 24
  });
  const dbPos = dumpBagGeo.attributes.position;
  const dbv = new THREE.Vector3();
  for (let i = 0; i < dbPos.count; i++) {
    dbv.fromBufferAttribute(dbPos, i);
    const ny = THREE.MathUtils.clamp(dbv.y / 0.073, -1.0, 1.0);
    const ang = Math.atan2(dbv.z, dbv.x);

    // Pliegues radiales de fruncido en el cuello que se suavizan hacia la panza
    const neckZone = Math.exp(-Math.pow((ny - 0.56) / 0.35, 2.0));
    const radialPleats = Math.sin(ang * 8.0 + ny * 3.0) * (0.042 * neckZone + 0.015);
    const lipFlare = ny > 0.68 ? 1.0 + Math.pow((ny - 0.68) / 0.32, 1.5) * 0.22 : 1.0;

    const dx = dbv.x * lipFlare * (1.0 + radialPleats);
    let dz = dbv.z * lipFlare * (1.0 + radialPleats);
    if (dz < 0) dz *= 0.76;
    dz += Math.sin((1.0 - ny) * Math.PI * 0.5) * 0.010;

    // Hundir ligeramente el interior de la boca superior del saco
    let dy = dbv.y;
    if (ny > 0.82) {
      const rNorm = Math.min(1.0, Math.sqrt(dbv.x * dbv.x + dbv.z * dbv.z) / 0.034);
      dy -= (1.0 - rNorm * rNorm) * 0.016;
    }

    dbPos.setXYZ(i, dx, dy, dz);
  }
  dumpBagGeo.computeVertexNormals();
  const dumpBag = new THREE.Mesh(dumpBagGeo, materials.corduraVest);
  dumpBag.position.set(0, -0.042, 0.020);
  dumpGroup.add(dumpBag);

  // Cordón elástico Shock-Cord alojado exactamente dentro del cuello fruncido del saco + Tanka (Cord Lock) redondeada
  const shockCurvePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const rx = 0.036 * (1.0 + 0.04 * Math.sin(a * 6));
    const rz = 0.026 * (1.0 + 0.04 * Math.cos(a * 6));
    shockCurvePts.push(new THREE.Vector3(Math.cos(a) * rx, -0.002 + Math.sin(a * 3) * 0.0015, 0.023 + Math.sin(a) * rz));
  }
  const shockCurve = new THREE.CatmullRomCurve3(shockCurvePts, true);
  const dumpShockCord = new THREE.Mesh(new THREE.TubeGeometry(shockCurve, 36, 0.0038, 10, true), materials.hypalon);
  dumpGroup.add(dumpShockCord);

  const cordLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.008, 8, 14), materials.darkPolymer);
  cordLock.position.set(0.024, -0.002, 0.048);
  cordLock.rotation.z = 0.35;
  dumpGroup.add(cordLock);

  // Ojal metálico de drenaje embutido en el fondo curvo del saco
  const dumpGrommet = new THREE.Mesh(new THREE.TorusGeometry(0.0065, 0.0020, 10, 20), materials.brass);
  dumpGrommet.rotation.x = Math.PI / 2;
  dumpGrommet.position.set(0, -0.114, 0.028);
  dumpGroup.add(dumpGrommet);

  // 6. BOTIQUÍN DE TRAUMA LUMBAR CURVADO (FERRO ROLL 1 / BFG BLOW-OUT IFAK) CON ASAS EN LÁGRIMA Y TORNIQUETE CAT GEN-7
  const ifakGroup = new THREE.Group();
  ifakGroup.position.set(0, 0.012, -0.176);
  beltRigGroup.add(ifakGroup);

  // Funda exterior envolvente tipo "Burrito/Taco" curvada siguiendo la lordosis lumbar, con labios acampanados y tensión central
  const ifakSleeveGeo = createOrganicPouchVolume(0.164, 0.104, 0.074, {
    roundnessXZ: 0.58,
    roundnessY: 0.52,
    teardropSag: 0.06,
    pillowBulge: 0.16,
    wrapRadiusX: -0.34, // Se curva orgánicamente abrazando la zona lumbar del cinturón
    pinchY: [{ y: 0.0, width: 0.45, depth: -0.04 }],
    wrinkleAmp: 0.0024,
    segsW: 32,
    segsH: 24,
    segsD: 20
  });
  const ifakSleeve = new THREE.Mesh(ifakSleeveGeo, materials.corduraVest);
  ifakGroup.add(ifakSleeve);

  // Rollo médico interior deslizable con extremos abombados plisados alojado limpiamente dentro de la funda exterior
  const medRollCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.090, 0.0, 0.018),
    new THREE.Vector3(-0.045, 0.001, 0.010),
    new THREE.Vector3(0.0, 0.002, 0.008),
    new THREE.Vector3(0.045, 0.001, 0.010),
    new THREE.Vector3(0.090, 0.0, 0.018)
  ]);
  const medRollGeo = new THREE.TubeGeometry(medRollCurve, 32, 0.024, 24, false);
  const mrPos = medRollGeo.attributes.position;
  for (let i = 0; i < mrPos.count; i++) {
    const mx = mrPos.getX(i);
    const my = mrPos.getY(i);
    const mz = mrPos.getZ(i);
    const ang = Math.atan2(my, mz);
    // Pliegues suaves de rollo textil comprimido en los extremos laterales que asoman por la funda
    const endFactor = Math.min(1.0, Math.abs(mx) / 0.090);
    const domeTaper = Math.pow(Math.max(0.22, 1.0 - Math.pow(endFactor, 3.4)), 0.26);
    const rollCrease = Math.sin(ang * 5.0 + mx * 45.0) * 0.0020 * endFactor;
    mrPos.setY(i, my * domeTaper + Math.sin(ang) * rollCrease);
    mrPos.setZ(i, mz * domeTaper + Math.cos(ang) * rollCrease);
  }
  medRollGeo.computeVertexNormals();
  const medInsertRoll = new THREE.Mesh(medRollGeo, materials.patchMat);
  ifakGroup.add(medInsertRoll);

  // Asas de extracción ambidiestras de Hypalon cortadas a láser en forma de cinta plana contorneada en gota (Teardrop Pull Tabs)
  for (const side of [-1, 1]) {
    const pullHandleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.080, 0.015, 0.016),
      new THREE.Vector3(side * 0.104, 0.018, 0.008),
      new THREE.Vector3(side * 0.116, 0.0, -0.002),
      new THREE.Vector3(side * 0.104, -0.018, 0.008),
      new THREE.Vector3(side * 0.080, -0.015, 0.016)
    ]);
    const pullLoopGeo = createRoundedStrapGeometry(pullHandleCurve, 0.015, 0.0038, 12, 28);
    const pullLoop = new THREE.Mesh(
      pullLoopGeo,
      side === -1 ? materials.redTab : materials.hypalon
    );
    ifakGroup.add(pullLoop);
  }

  // Parche indicador de Cruz Médica en Velcro/Hypalon redondeado y amoldado a la curvatura posterior del IFAK
  const crossPatchShape = createRoundedRectShape(0.038, 0.038, 0.010);
  const crossPatchGeo = createOrganicExtrude(crossPatchShape, 0.004, 0.0015, 5, 18, 4, (v) => {
    v.z += Math.cos(v.x * 18.0) * 0.0025 + Math.cos(v.y * 18.0) * 0.0025;
  });
  const crossPatchBg = new THREE.Mesh(crossPatchGeo, materials.patchMat);
  crossPatchBg.position.set(0, 0.004, -0.0435);
  ifakGroup.add(crossPatchBg);

  const crossVGeo = createOrganicExtrude(createRoundedRectShape(0.009, 0.024, 0.0025), 0.004, 0.0012, 4, 12, 2);
  const crossV = new THREE.Mesh(crossVGeo, materials.redTab);
  crossV.position.set(0, 0.004, -0.0452);
  ifakGroup.add(crossV);

  const crossHGeo = createOrganicExtrude(createRoundedRectShape(0.024, 0.009, 0.0025), 0.004, 0.0012, 4, 12, 2);
  const crossH = new THREE.Mesh(crossHGeo, materials.redTab);
  crossH.position.set(0, 0.004, -0.0452);
  ifakGroup.add(crossH);

  // Segundo Torniquete CAT Gen-7 suspendido bajo el IFAK con pliegues en "U" de cinta doblada, molinete ergonómico y anillas elásticas
  const bottomCatGroup = new THREE.Group();
  bottomCatGroup.position.set(0, -0.068, -0.010);
  ifakGroup.add(bottomCatGroup);

  // Cuerpo de cinta doblada en bucle continuo con cintura ceñida donde aprietan las gomas elásticas
  const bottomCatGeo = createOrganicPouchVolume(0.128, 0.034, 0.034, {
    roundnessXZ: 0.56,
    roundnessY: 0.52,
    teardropSag: 0.0,
    pillowBulge: 0.10,
    wrapRadiusX: -0.42,
    wrinkleAmp: 0.0016
  });
  const bcPos = bottomCatGeo.attributes.position;
  for (let i = 0; i < bcPos.count; i++) {
    const bx = bcPos.getX(i);
    // Hundimiento donde las dos bandas elásticas en [-0.036, 0.036] comprimen el torniquete
    const pinchL = Math.exp(-Math.pow((bx + 0.036) / 0.012, 2.0)) * 0.14;
    const pinchR = Math.exp(-Math.pow((bx - 0.036) / 0.012, 2.0)) * 0.14;
    bcPos.setY(i, bcPos.getY(i) * (1.0 - pinchL - pinchR));
    bcPos.setZ(i, bcPos.getZ(i) * (1.0 - pinchL - pinchR));
  }
  bottomCatGeo.computeVertexNormals();
  const bottomCatBody = new THREE.Mesh(bottomCatGeo, materials.darkPolymer);
  bottomCatGroup.add(bottomCatBody);

  // Varilla del molinete (Windlass Rod) con puntas semiesféricas y anillos de agarre antideslizantes
  const bottomWindlass = new THREE.Mesh(new THREE.CapsuleGeometry(0.0048, 0.098, 8, 16), materials.darkPolymer);
  bottomWindlass.rotation.z = Math.PI / 2;
  bottomWindlass.position.set(0, -0.016, -0.015);
  bottomCatGroup.add(bottomWindlass);

  for (const gripX of [-0.038, -0.028, 0.028, 0.038]) {
    const gripRing = new THREE.Mesh(new THREE.TorusGeometry(0.0052, 0.0012, 8, 16), materials.combatRubber);
    gripRing.rotation.y = Math.PI / 2;
    gripRing.position.set(gripX, -0.016, -0.015);
    bottomCatGroup.add(gripRing);
  }

  // Lengüeta roja redondeada (Red Tip Tab) del CAT Gen-7
  const redTipGeo = createOrganicPouchVolume(0.024, 0.032, 0.034, {
    roundnessXZ: 0.62,
    roundnessY: 0.55,
    pillowBulge: 0.08,
    wrinkleAmp: 0
  });
  const bottomRedTip = new THREE.Mesh(redTipGeo, materials.redTab);
  bottomRedTip.position.set(-0.048, 0, 0.002);
  bottomCatGroup.add(bottomRedTip);

  // Lazos elásticos de sujeción (Elastic Hammock Keepers) con sección de cinta redondeada envolviendo el torniquete
  for (const elX of [-0.036, 0.036]) {
    const keeperPts: THREE.Vector3[] = [];
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      keeperPts.push(new THREE.Vector3(elX, 0.005 + Math.sin(a) * 0.022, Math.cos(a) * 0.018));
    }
    const elCurve = new THREE.CatmullRomCurve3(keeperPts, true);
    const elasticKeeper = new THREE.Mesh(
      createRoundedStrapGeometry(elCurve, 0.018, 0.0042, 10, 28),
      materials.webbing
    );
    bottomCatGroup.add(elasticKeeper);
  }

  // 7. CADERA POSTERIOR DERECHA (-X): POUCH DE GRANADA FLASHBANG M84 CON SOLAPA CONTORNEADA EN ARCO Y HEBILLA FASTEX
  const flashbangPouch = new THREE.Group();
  const fbAngle = -2.25;
  flashbangPouch.position.set(Math.sin(fbAngle) * 0.214, 0.008, Math.cos(fbAngle) * 0.162);
  flashbangPouch.rotation.y = fbAngle + Math.PI;
  beltRigGroup.add(flashbangPouch);

  // Cuerpo textil del pouch moldeado alrededor del cilindro de la granada M84 con cintura elástica a media altura
  const fbBodyGeo = new THREE.CylinderGeometry(0.027, 0.023, 0.104, 28, 20);
  const fbPos = fbBodyGeo.attributes.position;
  for (let i = 0; i < fbPos.count; i++) {
    const fy = fbPos.getY(i);
    const ny = fy / 0.052;
    const ang = Math.atan2(fbPos.getZ(i), fbPos.getX(i));
    // Cintura ceñida en el medio + fondo redondeado en copa + pliegues de costura
    const waist = 1.0 - 0.10 * Math.exp(-Math.pow(ny * 1.8, 2.0)) + 0.08 * Math.cos(ny * Math.PI * 0.45);
    const cupBottom = ny < -0.7 ? Math.cos(((ny + 0.7) / 0.3) * Math.PI * 0.42) : 1.0;
    const fold = Math.sin(ang * 5.0 + ny * 6.0) * 0.0014;
    const rScale = waist * Math.max(0.35, cupBottom);
    fbPos.setX(i, fbPos.getX(i) * rScale + Math.cos(ang) * fold);
    fbPos.setZ(i, fbPos.getZ(i) * rScale * 1.08 + Math.sin(ang) * fold);
  }
  fbBodyGeo.computeVertexNormals();
  const fbBody = new THREE.Mesh(fbBodyGeo, materials.corduraVest);
  flashbangPouch.add(fbBody);

  // Cabezal de espoleta M84 y anilla de extracción asomando bajo la capucha del pouch
  const fuzeHead = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.022, 16), materials.gunmetal);
  fuzeHead.position.set(0, 0.054, 0);
  flashbangPouch.add(fuzeHead);

  const pullPinRing = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0022, 10, 20), materials.boltSteel);
  pullPinRing.position.set(0.016, 0.052, -0.008);
  pullPinRing.rotation.y = 0.45;
  flashbangPouch.add(pullPinRing);

  // Solapa superior contorneada (Contoured Hood Flap) que nace detrás, envuelve en domo la espoleta y baja por delante hacia la hebilla
  const fbFlapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.028, 0.026),
    new THREE.Vector3(0, 0.064, 0.018),
    new THREE.Vector3(0, 0.072, -0.004),
    new THREE.Vector3(0, 0.054, -0.026),
    new THREE.Vector3(0, 0.014, -0.030)
  ]);
  const fbFlapGeo = createRoundedStrapGeometry(fbFlapCurve, 0.042, 0.0075, 14, 32);
  const fbfPos = fbFlapGeo.attributes.position;
  for (let i = 0; i < fbfPos.count; i++) {
    const fx = fbfPos.getX(i);
    const fy = fbfPos.getY(i);
    // Acopar transversalmente los bordes laterales de la solapa para que abrace el cuerpo de la granada
    fbfPos.setZ(i, fbfPos.getZ(i) + Math.pow(fx / 0.021, 2.0) * 0.005);
    // Estrechar en punta redondeada el extremo frontal inferior
    if (fy < 0.030 && fbfPos.getZ(i) < 0) {
      const taper = Math.max(0.55, (fy - 0.010) / 0.025);
      fbfPos.setX(i, fx * taper);
    }
  }
  fbFlapGeo.computeVertexNormals();
  const fbFlap = new THREE.Mesh(fbFlapGeo, materials.corduraVest);
  flashbangPouch.add(fbFlap);

  // Hebilla de liberación rápida ITW Nexus Fastex esculpida con curvas ergonómicas
  const fbBuckleShape = createRoundedRectShape(0.026, 0.032, 0.008);
  const fbBuckleGeo = createOrganicExtrude(fbBuckleShape, 0.012, 0.0032, 5, 18, 4, (v) => {
    v.z -= Math.cos(v.x * 25.0) * 0.0025;
  });
  const fbBuckle = new THREE.Mesh(fbBuckleGeo, materials.darkPolymer);
  fbBuckle.position.set(0, -0.004, -0.029);
  flashbangPouch.add(fbBuckle);

  // Anilla del puñal de rescate Benchmade SOCP asomando junto a la funda de pistola con chaflán interior suave
  const socpRing = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0034, 12, 24), materials.gunmetal);
  socpRing.position.set(-0.165, 0.056, 0.082);
  socpRing.rotation.y = 0.65;
  beltRigGroup.add(socpRing);
}
