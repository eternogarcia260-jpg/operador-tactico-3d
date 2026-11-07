import * as THREE from 'three';
import { MaterialLibrary } from '../types';
import {
  createRoundedRectShape,
  createOrganicExtrude,
  createOrganicPouchVolume,
  createRoundedStrapGeometry
} from '../geometry/organicGeometry';

/**
 * Construye la Mochila de Asalto Táctica Crye Precision AVS 1000 / Zip-On Panel 2.0
 * con compartimentos múltiples esculpidos, cremalleras impermeables YKK AquaGuard #10
 * con tiradores de Paracord, asas de arrastre y transporte reforzadas con costuras Box-X,
 * correas de hombro anatómicas acolchadas en curva S conectadas con hebillas ITW Nexus,
 * cintas de compresión laterales y sistema de hidratación completo.
 */
export function buildDetailedAssaultPack(vestGroup: THREE.Group, materials: MaterialLibrary): void {
  const packRig = new THREE.Group();
  packRig.position.set(0, 0.028, -0.206);
  vestGroup.add(packRig);

  // 1. PANEL BASE ANATÓMICO DE ACOPLAMIENTO Y CREMALLERAS LATERALES CURVAS YKK #10 ZIP-ON
  const zipBaseShape = createRoundedRectShape(0.242, 0.318, 0.044);
  const zipBaseGeo = createOrganicExtrude(zipBaseShape, 0.018, 0.006, 6, 24, 6, (v) => {
    // Ahusar suavemente hacia la corona superior siguiendo la silueta en lágrima de la mochila
    const ny = v.y / 0.16;
    v.x *= 1.0 - ny * 0.12;
    const ventChannel = Math.sin(v.x * 38.0) * 0.0025 * (1.0 - Math.pow(ny, 2.0));
    v.z += Math.cos(v.x * 8.5) * 0.006 + ventChannel;
  });
  const zipBasePanel = new THREE.Mesh(zipBaseGeo, materials.corduraVest);
  zipBasePanel.position.set(0, 0, 0.036);
  packRig.add(zipBasePanel);

  for (const zSide of [-1, 1]) {
    // Carril dentado curvo de la cremallera YKK #10 VisIon siguiendo el contorno redondeado del panel Zip-On
    const zipTrackCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(zSide * 0.122, -0.148, 0.036),
      new THREE.Vector3(zSide * 0.131, -0.055, 0.038),
      new THREE.Vector3(zSide * 0.130, 0.055, 0.038),
      new THREE.Vector3(zSide * 0.120, 0.148, 0.036)
    ]);
    const zipTrack = new THREE.Mesh(
      createRoundedStrapGeometry(zipTrackCurve, 0.014, 0.011, 10, 24),
      materials.gunmetal
    );
    packRig.add(zipTrack);

    // Lengüeta superior redondeada de bloqueo con broche de presión en latón abombado
    const snapTabCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(zSide * 0.118, 0.142, 0.036),
      new THREE.Vector3(zSide * 0.125, 0.156, 0.044),
      new THREE.Vector3(zSide * 0.122, 0.168, 0.038)
    ]);
    const snapTab = new THREE.Mesh(
      createRoundedStrapGeometry(snapTabCurve, 0.022, 0.006, 10, 16),
      materials.webbing
    );
    packRig.add(snapTab);

    const snapButton = new THREE.Mesh(new THREE.SphereGeometry(0.0058, 16, 12), materials.brass);
    snapButton.scale.set(1.0, 1.0, 0.52);
    snapButton.position.set(zSide * 0.125, 0.156, 0.047);
    packRig.add(snapButton);
  }

  // 2. CUERPO PRINCIPAL DE LA MOCHILA EN SILUETA DE LÁGRIMA ANATÓMICA (TEARDROP SOFT-BODY LOFT)
  // Más estilizada en la corona superior, abombada en el tercio inferior por el peso de carga y ceñida por las dos correas de compresión
  const mainCompartmentGeo = createOrganicPouchVolume(0.256, 0.332, 0.114, {
    roundnessXZ: 0.56,
    roundnessY: 0.48,
    teardropSag: 0.16,
    pillowBulge: 0.18,
    backConcavity: 0.008,
    pinchY: [
      { y: 0.52, width: 0.18, depth: 0.065 },  // Hundimiento real bajo la correa de compresión superior
      { y: -0.52, width: 0.18, depth: 0.055 }  // Hundimiento real bajo la correa de compresión inferior
    ],
    wrinkleAmp: 0.0028,
    wrinkleFreq: 20,
    segsW: 36,
    segsH: 38,
    segsD: 24
  });
  const mainCompartment = new THREE.Mesh(mainCompartmentGeo, materials.corduraVest);
  mainCompartment.position.set(0, -0.002, -0.018);
  packRig.add(mainCompartment);

  // Ribete perimetral cosido (Edge Binding Seam) recorriendo la silueta orgánica de lágrima del cuerpo principal
  const seamCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.118, -0.152, -0.058),
    new THREE.Vector3(-0.130, -0.045, -0.062),
    new THREE.Vector3(-0.112, 0.085, -0.056),
    new THREE.Vector3(-0.078, 0.154, -0.046),
    new THREE.Vector3(0.0, 0.162, -0.042),
    new THREE.Vector3(0.078, 0.154, -0.046),
    new THREE.Vector3(0.112, 0.085, -0.056),
    new THREE.Vector3(0.130, -0.045, -0.062),
    new THREE.Vector3(0.118, -0.152, -0.058),
    new THREE.Vector3(0.0, -0.164, -0.056)
  ], true);
  const seamPiping = new THREE.Mesh(
    new THREE.TubeGeometry(seamCurve, 64, 0.0046, 10, true),
    materials.webbing
  );
  packRig.add(seamPiping);

  // 3. COMPARTIMENTO SUPERIOR CLAMSHELL ADMIN / BREACHING (DOMO TRAPEZOIDAL REDONDEADO CON CREMALLERA HUNDIDA)
  const upperPocketGeo = createOrganicPouchVolume(0.222, 0.136, 0.064, {
    roundnessXZ: 0.62,
    roundnessY: 0.56,
    teardropSag: 0.11,
    pillowBulge: 0.22,
    backConcavity: 0.010,
    pinchY: [{ y: 0.18, width: 0.32, depth: 0.045 }],
    wrinkleAmp: 0.0024,
    wrinkleFreq: 22,
    segsW: 32,
    segsH: 28,
    segsD: 18
  });
  const upperPocket = new THREE.Mesh(upperPocketGeo, materials.corduraVest);
  upperPocket.position.set(0, 0.078, -0.082);
  packRig.add(upperPocket);

  // Función auxiliar que evalúa la coordenada Z exterior curvada del bolsillo superior para adosar elementos sin flotar
  const evalUpperDomeZ = (x: number, yRel: number): number => {
    const nx = Math.min(1.0, Math.abs(x) / 0.111);
    const ny = Math.min(1.0, Math.abs(yRel) / 0.068);
    const dome = Math.cos(nx * Math.PI * 0.48) * Math.cos(ny * Math.PI * 0.48);
    return -0.114 - Math.pow(Math.max(0, dome), 1.25) * 0.014;
  };

  // Panel exterior de Velcro Loop con esquinas de radio amplio, perforaciones láser oblongas y curvatura 3D exacta sobre el domo superior
  const velcroShape = createRoundedRectShape(0.172, 0.072, 0.018);
  for (const slotY of [-0.018, 0.0, 0.018]) {
    for (const slotX of [-0.048, 0, 0.048]) {
      const slotHole = new THREE.Path();
      const hw = 0.015, hh = 0.0028;
      slotHole.moveTo(slotX - hw, slotY - hh);
      slotHole.lineTo(slotX + hw, slotY - hh);
      slotHole.absarc(slotX + hw, slotY, hh, -Math.PI * 0.5, Math.PI * 0.5, false);
      slotHole.lineTo(slotX - hw, slotY + hh);
      slotHole.absarc(slotX - hw, slotY, hh, Math.PI * 0.5, Math.PI * 1.5, false);
      velcroShape.holes.push(slotHole);
    }
  }
  const velcroGeo = createOrganicExtrude(velcroShape, 0.0045, 0.0018, 5, 24, 6, (v) => {
    const surfaceZ = evalUpperDomeZ(v.x, v.y);
    v.z += surfaceZ + 0.118;
  });
  const laserVelcroPanel = new THREE.Mesh(velcroGeo, materials.patchMat);
  laserVelcroPanel.position.set(0, 0.080, -0.118);
  packRig.add(laserVelcroPanel);

  // Cremallera impermeable YKK AquaGuard siguiendo el contorno abovedado del bolsillo superior
  const upperZipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.104, 0.032, -0.076),
    new THREE.Vector3(-0.102, 0.108, -0.082),
    new THREE.Vector3(-0.068, 0.138, -0.084),
    new THREE.Vector3(0.0, 0.144, -0.086),
    new THREE.Vector3(0.068, 0.138, -0.084),
    new THREE.Vector3(0.102, 0.108, -0.082),
    new THREE.Vector3(0.104, 0.032, -0.076)
  ]);
  const upperZipTrack = new THREE.Mesh(
    createRoundedStrapGeometry(upperZipCurve, 0.009, 0.0045, 10, 40),
    materials.hypalon
  );
  packRig.add(upperZipTrack);

  // Cursores YKK moldeados con tiradores de Paracord 550 que caen por gravedad (curva catenaria natural)
  const addParacordZipperPull = (pos: THREE.Vector3, swayX: number) => {
    const sliderGroup = new THREE.Group();
    sliderGroup.position.copy(pos);
    packRig.add(sliderGroup);

    const sliderBodyGeo = createOrganicExtrude(createRoundedRectShape(0.011, 0.017, 0.004), 0.009, 0.0022, 4, 14, 2);
    const sliderBody = new THREE.Mesh(sliderBodyGeo, materials.gunmetal);
    sliderGroup.add(sliderBody);

    // Tubo termorretráctil curvado hacia abajo por gravedad
    const shrinkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.006, -0.002),
      new THREE.Vector3(swayX * 0.4, -0.016, -0.007),
      new THREE.Vector3(swayX, -0.026, -0.009)
    ]);
    const heatShrink = new THREE.Mesh(
      new THREE.TubeGeometry(shrinkCurve, 12, 0.0038, 10, false),
      materials.hypalon
    );
    sliderGroup.add(heatShrink);

    // Lazo de Paracord en forma de lágrima colgante
    const cordLoopCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(swayX - 0.002, -0.024, -0.009),
      new THREE.Vector3(swayX - 0.007, -0.038, -0.011),
      new THREE.Vector3(swayX, -0.045, -0.012),
      new THREE.Vector3(swayX + 0.007, -0.038, -0.010),
      new THREE.Vector3(swayX + 0.002, -0.024, -0.009)
    ]);
    const cordLoop = new THREE.Mesh(
      new THREE.TubeGeometry(cordLoopCurve, 20, 0.0026, 8, false),
      materials.bootLaces
    );
    sliderGroup.add(cordLoop);
  };

  addParacordZipperPull(new THREE.Vector3(-0.056, 0.139, -0.086), -0.004);
  addParacordZipperPull(new THREE.Vector3(0.042, 0.140, -0.086), 0.005);

  // 4. COMPARTIMENTO INFERIOR DE CARGA / ORDNANCE POUCH (VOLUMEN DE GOTA CON GRAVEDAD Y MOLLE ONDULADO CONFORME)
  const lowerPocketGeo = createOrganicPouchVolume(0.236, 0.156, 0.072, {
    roundnessXZ: 0.58,
    roundnessY: 0.52,
    teardropSag: 0.20, // Panza inferior pronunciada por el peso de carga
    pillowBulge: 0.24,
    backConcavity: 0.010,
    pinchY: [{ y: -0.08, width: 0.28, depth: 0.05 }],
    wrinkleAmp: 0.0028,
    wrinkleFreq: 20,
    segsW: 34,
    segsH: 30,
    segsD: 20
  });
  const lowerPocket = new THREE.Mesh(lowerPocketGeo, materials.corduraVest);
  lowerPocket.position.set(0, -0.078, -0.086);
  packRig.add(lowerPocket);

  // Cremallera curva en arco rodeando la corona del compartimento inferior
  const lowerZipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.112, -0.095, -0.078),
    new THREE.Vector3(-0.108, -0.018, -0.084),
    new THREE.Vector3(-0.065, -0.002, -0.092),
    new THREE.Vector3(0.0, 0.002, -0.095),
    new THREE.Vector3(0.065, -0.002, -0.092),
    new THREE.Vector3(0.108, -0.018, -0.084),
    new THREE.Vector3(0.112, -0.095, -0.078)
  ]);
  const lowerZipTrack = new THREE.Mesh(
    createRoundedStrapGeometry(lowerZipCurve, 0.0085, 0.0042, 10, 36),
    materials.hypalon
  );
  packRig.add(lowerZipTrack);
  addParacordZipperPull(new THREE.Vector3(-0.078, -0.006, -0.092), -0.005);

  // Cintas PALS / MOLLE curvadas sobre el domo del bolsillo inferior con ondulación real entre costuras Bartack
  for (let row = -1; row <= 1; row++) {
    const rowY = -0.078 + row * 0.036;
    const yRel = row * 0.036;
    const ny = yRel / 0.078;
    const rowSagFactor = 1.0 - ny * 0.16;
    const halfSpan = 0.098 * rowSagFactor;

    const palsPts: THREE.Vector3[] = [];
    const numSamples = 28;
    for (let s = 0; s <= numSamples; s++) {
      const u = (s / numSamples) * 2 - 1; // -1 a 1
      const px = u * halfSpan;
      // Evaluar la superficie convexa del bolsillo inferior en (px, yRel)
      const dome = Math.cos(u * Math.PI * 0.46) * Math.cos(ny * Math.PI * 0.46);
      // Onda PALS: 4 celdas MOLLE (hundida en cada costura Bartack, arqueada en el centro de cada canal)
      const cellWave = Math.abs(Math.sin(u * Math.PI * 2.0)) * 0.0038;
      const pz = -0.112 - Math.pow(Math.max(0, dome), 1.2) * 0.022 - cellWave;
      palsPts.push(new THREE.Vector3(px, rowY - (1.0 - dome) * 0.003, pz));
    }
    const palsCurve = new THREE.CatmullRomCurve3(palsPts);
    const palsWebbing = new THREE.Mesh(
      createRoundedStrapGeometry(palsCurve, 0.019, 0.0038, 10, 36),
      materials.webbing
    );
    packRig.add(palsWebbing);

    // Costuras Bartack redondeadas en los valles de la cinta PALS
    for (let col = -2; col <= 2; col++) {
      const u = col * 0.5;
      const sx = u * halfSpan;
      const dome = Math.cos(u * Math.PI * 0.46) * Math.cos(ny * Math.PI * 0.46);
      const sz = -0.112 - Math.pow(Math.max(0, dome), 1.2) * 0.022;
      const stitch = new THREE.Mesh(new THREE.CapsuleGeometry(0.0018, 0.016, 6, 8), materials.stitchThread);
      stitch.position.set(sx, rowY - (1.0 - dome) * 0.003, sz - 0.001);
      stitch.rotation.y = -u * 0.35;
      packRig.add(stitch);
    }
  }

  // Ojales metálicos de drenaje embutidos en la base curva de la mochila (Brass Grommets)
  for (const gSide of [-0.062, 0.062]) {
    const grommet = new THREE.Mesh(new THREE.TorusGeometry(0.0068, 0.0022, 10, 20), materials.brass);
    grommet.rotation.x = Math.PI / 2 - 0.18;
    grommet.position.set(gSide, -0.163, -0.042);
    packRig.add(grommet);
  }

  // ====================================================================
  // 5. SISTEMA DE ASAS DE ARRASTRE Y CORREAS DE HOMBRO ANATÓMICAS ("SUS ASAS")
  // ====================================================================
  // A) ASA CENTRAL SUPERIOR DE EXTRACCIÓN Y ARRASTRE PESADO (HEAVY-DUTY HAUL/DRAG HANDLE)
  const haulHandleGroup = new THREE.Group();
  haulHandleGroup.position.set(0, 0.158, -0.014);
  packRig.add(haulHandleGroup);

  // Refuerzos en gota (Teardrop Gussets) de Hypalon curvados sobre los hombros superiores de la mochila
  const gussetShape = createRoundedRectShape(0.036, 0.028, 0.011);
  const gussetGeo = createOrganicExtrude(gussetShape, 0.010, 0.003, 5, 18, 4, (v) => {
    v.z -= Math.cos(v.x * 30.0) * 0.003;
  });
  for (const hSide of [-1, 1]) {
    const gusset = new THREE.Mesh(gussetGeo, materials.hypalon);
    gusset.position.set(hSide * 0.054, -0.008, -0.004);
    gusset.rotation.z = hSide * -0.24;
    gusset.rotation.x = 0.32;
    haulHandleGroup.add(gusset);
  }

  // Arco orgánico de cinta de poliamida doblada + Manguito central ergonómico con anillos de agarre para los dedos
  const haulCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.056, -0.008, -0.004),
    new THREE.Vector3(-0.045, 0.026, -0.008),
    new THREE.Vector3(0.0, 0.038, -0.010),
    new THREE.Vector3(0.045, 0.026, -0.008),
    new THREE.Vector3(0.056, -0.008, -0.004)
  ]);
  const haulWebbing = new THREE.Mesh(
    createRoundedStrapGeometry(haulCurve, 0.020, 0.008, 12, 32),
    materials.webbing
  );
  haulHandleGroup.add(haulWebbing);

  const gripSleeveCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.030, 0.030, -0.008),
    new THREE.Vector3(0.0, 0.038, -0.010),
    new THREE.Vector3(0.030, 0.030, -0.008)
  ]);
  const rubberGripGeo = new THREE.TubeGeometry(gripSleeveCurve, 24, 0.0105, 16, false);
  const rgPos = rubberGripGeo.attributes.position;
  for (let i = 0; i < rgPos.count; i++) {
    const rx = rgPos.getX(i);
    // Surcos ergonómicos para los dedos en el manguito del asa
    const fingerGroove = 1.0 + Math.cos(rx * 220.0) * 0.06;
    rgPos.setY(i, rgPos.getY(i) * fingerGroove);
    rgPos.setZ(i, rgPos.getZ(i) * 0.78);
  }
  rubberGripGeo.computeVertexNormals();
  const rubberGripSleeve = new THREE.Mesh(rubberGripGeo, materials.combatRubber);
  haulHandleGroup.add(rubberGripSleeve);

  // B) CORREAS TENSORAS DE HOMBRO ANATÓMICAS INTEGRADAS CON LAS HOMBRERAS DEL CHALECO Y HEBILLAS CURVAS ITW NEXUS
  const yokeShape = createRoundedRectShape(0.048, 0.044, 0.015);
  const yokeGeo = createOrganicExtrude(yokeShape, 0.009, 0.0028, 5, 18, 4);
  const frontBuckleShape = createRoundedRectShape(0.028, 0.038, 0.008);
  const frontBuckleGeo = createOrganicExtrude(frontBuckleShape, 0.011, 0.003, 5, 18, 4, (v) => {
    v.z -= Math.cos(v.y * 22.0) * 0.0022;
  });
  const ladderlocShape = createRoundedRectShape(0.024, 0.028, 0.007);
  const ladderlocGeo = createOrganicExtrude(ladderlocShape, 0.009, 0.0026, 5, 16, 4);

  for (const sSide of [-1, 1]) {
    // Yugo trasero superior de Hypalon con esquinas redondeadas donde nacen las correas de carga
    const yokeBase = new THREE.Mesh(yokeGeo, materials.hypalon);
    yokeBase.position.set(sSide * 0.088, 0.136, 0.034);
    yokeBase.rotation.z = sSide * -0.14;
    packRig.add(yokeBase);

    // Cinta tensora superior de 1" (Load-Lifter & Shoulder Harness Webbing) que sube desde el yugo
    // de la mochila, discurre exactamente sobre el canal central de la hombrera acolchada del JPC 2.0
    // (bajo sus presillas One-Wrap) y ancla en la hebilla frontal del pecho sin atravesar ningún elemento
    const webbingOverCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sSide * 0.088, 0.138, 0.032),
      new THREE.Vector3(sSide * 0.116, 0.194, 0.134),
      new THREE.Vector3(sSide * 0.123, 0.207, 0.201),
      new THREE.Vector3(sSide * 0.118, 0.203, 0.262),
      new THREE.Vector3(sSide * 0.106, 0.181, 0.318),
      new THREE.Vector3(sSide * 0.098, 0.146, 0.354)
    ]);
    const harnessWebbing = new THREE.Mesh(
      createRoundedStrapGeometry(webbingOverCurve, 0.022, 0.0052, 12, 40),
      materials.webbing
    );
    packRig.add(harnessWebbing);

    // Hebilla de liberación rápida ITW Nexus GT Cobra esculpida en el frontal superior del pecho + Anilla D-Ring
    const frontReleaseBuckle = new THREE.Mesh(frontBuckleGeo, materials.darkPolymer);
    frontReleaseBuckle.position.set(sSide * 0.098, 0.144, 0.356);
    frontReleaseBuckle.rotation.x = 0.36;
    frontReleaseBuckle.rotation.z = sSide * -0.10;
    packRig.add(frontReleaseBuckle);

    const strapDRing = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0030, 10, 20), materials.gunmetal);
    strapDRing.position.set(sSide * 0.104, 0.172, 0.334);
    strapDRing.rotation.x = 0.48;
    packRig.add(strapDRing);

    // Correa estabilizadora inferior trasera conectada limpiamente desde la base de la mochila
    // hacia el anclaje posterior del portaplacas (detrás del bolsillo de placa lateral 6x6", sin cruzarlo)
    const lowerStabilizerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sSide * 0.114, -0.134, 0.016),
      new THREE.Vector3(sSide * 0.132, -0.116, 0.044),
      new THREE.Vector3(sSide * 0.128, -0.102, 0.068)
    ]);
    const lowerStabilizerWebbing = new THREE.Mesh(
      createRoundedStrapGeometry(lowerStabilizerCurve, 0.020, 0.0048, 10, 20),
      materials.webbing
    );
    packRig.add(lowerStabilizerWebbing);

    // Hebilla tensora inferior redondeada (Ladderloc Buckle) y rollo de cinta sobrante recogido
    const lowerLadderloc = new THREE.Mesh(ladderlocGeo, materials.darkPolymer);
    lowerLadderloc.position.set(sSide * 0.130, -0.116, 0.044);
    lowerLadderloc.rotation.y = sSide * 1.15;
    packRig.add(lowerLadderloc);

    const rolledWebbing = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.011, 10, 16), materials.webbing);
    rolledWebbing.rotation.z = Math.PI / 2;
    rolledWebbing.position.set(sSide * 0.134, -0.128, 0.036);
    packRig.add(rolledWebbing);

    // C) ASAS DE AGARRE LATERALES CONTORNEADAS Y CORREAS DE COMPRESIÓN HORIZONTALES ENCAJADAS EN LOS SURCOS DE LA MOCHILA
    const sideHandleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sSide * 0.122, 0.052, -0.022),
      new THREE.Vector3(sSide * 0.142, 0.026, -0.028),
      new THREE.Vector3(sSide * 0.144, 0.0, -0.030),
      new THREE.Vector3(sSide * 0.142, -0.026, -0.028),
      new THREE.Vector3(sSide * 0.122, -0.052, -0.022)
    ]);
    const sideGrabHandle = new THREE.Mesh(
      createRoundedStrapGeometry(sideHandleCurve, 0.018, 0.0065, 12, 28),
      materials.webbing
    );
    packRig.add(sideGrabHandle);

    // 2 Correas de compresión laterales que se hunden físicamente en los surcos laterales del cuerpo de la mochila
    const compBuckleShape = createRoundedRectShape(0.030, 0.026, 0.007);
    const compBuckleGeo = createOrganicExtrude(compBuckleShape, 0.011, 0.003, 5, 16, 4, (v) => {
      const ox = v.x;
      v.x = v.z + Math.cos(ox * 25.0) * 0.0025;
      v.z = ox;
    });

    for (const cY of [0.084, -0.088]) {
      const sideX = cY > 0 ? 0.116 : 0.124; // Se adapta al perfil en lágrima (más ancho abajo que arriba)
      const compCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sSide * (sideX - 0.006), cY, 0.032),
        new THREE.Vector3(sSide * (sideX + 0.006), cY, -0.012),
        new THREE.Vector3(sSide * (sideX + 0.002), cY, -0.056),
        new THREE.Vector3(sSide * (sideX - 0.014), cY, -0.096)
      ]);
      const compStrap = new THREE.Mesh(
        createRoundedStrapGeometry(compCurve, 0.020, 0.0048, 12, 28),
        materials.webbing
      );
      packRig.add(compStrap);

      const compBuckle = new THREE.Mesh(compBuckleGeo, materials.darkPolymer);
      compBuckle.position.set(sSide * (sideX + 0.006), cY, -0.026);
      compBuckle.rotation.y = sSide * -0.18;
      packRig.add(compBuckle);
    }
  }

  // 6. ACCESORIOS EXTERNOS DE LA MOCHILA: FUNDA DE CIZALLA / BREACHING ORGÁNICA + HIDRATACIÓN
  const breacherToolGroup = new THREE.Group();
  breacherToolGroup.position.set(0.114, 0.035, -0.056);
  breacherToolGroup.rotation.z = -0.06;
  packRig.add(breacherToolGroup);

  // Funda tubular acolchada con pliegues de tensión y boca acampanada
  const toolSleeveGeo = new THREE.CylinderGeometry(0.025, 0.020, 0.24, 24, 18);
  const tsPos = toolSleeveGeo.attributes.position;
  for (let i = 0; i < tsPos.count; i++) {
    const ty = tsPos.getY(i);
    const ny = ty / 0.12;
    const ang = Math.atan2(tsPos.getZ(i), tsPos.getX(i));
    const pinch = 1.0 - 0.10 * Math.exp(-Math.pow((ny - 0.25) / 0.22, 2.0));
    const fold = Math.sin(ang * 4.0 + ny * 8.0) * 0.0015;
    tsPos.setX(i, tsPos.getX(i) * pinch + Math.cos(ang) * fold);
    tsPos.setZ(i, tsPos.getZ(i) * pinch * 0.88 + Math.sin(ang) * fold);
  }
  toolSleeveGeo.computeVertexNormals();
  const toolSleeve = new THREE.Mesh(toolSleeveGeo, materials.corduraVest);
  toolSleeve.position.y = -0.04;
  breacherToolGroup.add(toolSleeve);

  for (let h = -1; h <= 1; h += 2) {
    const cutterShaft = new THREE.Mesh(new THREE.CapsuleGeometry(0.0068, 0.17, 8, 14), materials.gunmetal);
    cutterShaft.position.set(h * 0.010, 0.12, 0);
    cutterShaft.rotation.z = h * -0.05;
    breacherToolGroup.add(cutterShaft);

    // Empuñaduras de caucho ergonómicas con anillos moldeados para los dedos
    const gripGeo = new THREE.CapsuleGeometry(0.0098, 0.095, 10, 18);
    const cgPos = gripGeo.attributes.position;
    for (let i = 0; i < cgPos.count; i++) {
      const gy = cgPos.getY(i);
      const groove = 1.0 + Math.sin(gy * 180.0) * 0.08;
      cgPos.setX(i, cgPos.getX(i) * groove);
      cgPos.setZ(i, cgPos.getZ(i) * groove);
    }
    gripGeo.computeVertexNormals();
    const cutterGrip = new THREE.Mesh(gripGeo, materials.combatRubber);
    cutterGrip.position.set(h * 0.013, 0.165, 0);
    cutterGrip.rotation.z = h * -0.05;
    breacherToolGroup.add(cutterGrip);
  }

  // Puerto superior de salida Hydro en Hypalon redondeado + Tubo forrado en neopreno guiado en paralelo
  // junto a la cinta de la hombrera izquierda sin cruzarse con ella + Válvula CamelBak en codo curvo
  const hydroPortShape = createRoundedRectShape(0.036, 0.024, 0.009);
  const hydroPortGeo = createOrganicExtrude(hydroPortShape, 0.010, 0.003, 5, 16, 3);
  const hydroPort = new THREE.Mesh(hydroPortGeo, materials.hypalon);
  hydroPort.position.set(0.062, 0.148, -0.046);
  hydroPort.rotation.x = 0.48;
  packRig.add(hydroPort);

  const hydroCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.062, 0.154, -0.046),
    new THREE.Vector3(0.104, 0.196, 0.068),
    new THREE.Vector3(0.136, 0.206, 0.188),
    new THREE.Vector3(0.134, 0.198, 0.268),
    new THREE.Vector3(0.122, 0.168, 0.332),
    new THREE.Vector3(0.114, 0.122, 0.366)
  ]);
  const hydroTube = new THREE.Mesh(
    new THREE.TubeGeometry(hydroCurve, 36, 0.0072, 14, false),
    materials.corduraVest
  );
  packRig.add(hydroTube);

  // Válvula de mordida (90-Degree Bite Valve) esculpida mediante tubo acodado suave
  const valveCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.114, 0.122, 0.366),
    new THREE.Vector3(0.110, 0.114, 0.376),
    new THREE.Vector3(0.098, 0.112, 0.380)
  ]);
  const biteValve = new THREE.Mesh(
    new THREE.TubeGeometry(valveCurve, 16, 0.0068, 12, false),
    materials.darkPolymer
  );
  packRig.add(biteValve);
}
