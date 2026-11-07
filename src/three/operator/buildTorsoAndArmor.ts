import * as THREE from 'three';
import { MaterialLibrary, OperatorSkeleton } from '../types';
import {
  sculptClothFolds,
  createRoundedRectShape,
  createOrganicExtrude,
  createOrganicPouchVolume,
  createRoundedStrapGeometry
} from '../geometry/organicGeometry';
import { buildDetailedAssaultPack } from './buildDetailedAssaultPack';

/**
 * Construye un Shape 2D de placa balística SAPI Swimmer-Cut con todas las esquinas
 * suavizadas mediante arcos continuos (C1/C2) para evitar aristas poligonales duras.
 */
function createSwimmerPlateShape(width: number, height: number): THREE.Shape {
  const hw = width * 0.5;
  const hh = height * 0.5;
  const topW = hw * 0.62;
  const cutY = hh * 0.34;
  const r = 0.022;

  const pts = [
    new THREE.Vector2(-hw + r, -hh),
    new THREE.Vector2(hw - r, -hh),
    new THREE.Vector2(hw, -hh + r),
    new THREE.Vector2(hw, cutY - r * 0.6),
    new THREE.Vector2(topW + r * 0.5, hh - r * 0.4),
    new THREE.Vector2(topW - r * 0.5, hh),
    new THREE.Vector2(-topW + r * 0.5, hh),
    new THREE.Vector2(-topW - r * 0.5, hh - r * 0.4),
    new THREE.Vector2(-hw, cutY - r * 0.6),
    new THREE.Vector2(-hw, -hh + r)
  ];

  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  shape.lineTo(pts[1].x, pts[1].y);
  shape.quadraticCurveTo(hw, -hh, pts[2].x, pts[2].y);
  shape.lineTo(pts[3].x, pts[3].y);
  shape.quadraticCurveTo(hw, cutY + r * 0.4, pts[4].x, pts[4].y);
  shape.quadraticCurveTo(topW, hh, pts[5].x, pts[5].y);
  shape.lineTo(pts[6].x, pts[6].y);
  shape.quadraticCurveTo(-topW, hh, pts[7].x, pts[7].y);
  shape.quadraticCurveTo(-hw, cutY + r * 0.4, pts[8].x, pts[8].y);
  shape.lineTo(pts[9].x, pts[9].y);
  shape.quadraticCurveTo(-hw, -hh, pts[0].x, pts[0].y);

  return shape;
}

export function buildTorsoAndArmor(materials: MaterialLibrary, skeleton: OperatorSkeleton): void {
  // 1. TEJIDO TRANSPIRABLE DEL TORSO DE LA CAMISA CRYE G3 COMBAT SHIRT
  // Esculpido con cintura atlética entallada, pliegues horizontales de compresión y caída orgánica sobre el cinturón
  const rawAbdomenGeo = new THREE.CylinderGeometry(0.190, 0.174, 0.30, 44, 24);
  const abPos = rawAbdomenGeo.attributes.position;
  for (let i = 0; i < abPos.count; i++) {
    const ax = abPos.getX(i);
    const ay = abPos.getY(i);
    const az = abPos.getZ(i);
    const ny = ay / 0.15; // -1 (cinturón) a +1 (tórax)

    // Entalle atlético en la cintura media (ny entre -0.3 y 0.2)
    const waistPinch = Math.exp(-Math.pow((ny + 0.05) * 2.5, 2.0)) * 0.014;
    // Abombamiento de tela justo encima del cinturón táctico (blousing fold)
    const blouseFold = ny < -0.55 ? Math.sin(((ny + 1.0) / 0.45) * Math.PI) * 0.008 : 0.0;
    // Pliegues horizontales sutiles por flexión y compresión del portaplacas
    const clothCrease = Math.sin(ay * 52.0) * 0.0024 * (1.0 - Math.abs(ny) * 0.4);

    const rScale = (1.0 - waistPinch) + blouseFold;
    abPos.setXYZ(i, ax * rScale * 1.12, ay, (az * rScale + clothCrease) * 0.82);
  }
  const abdomenGeo = sculptClothFolds(rawAbdomenGeo, 7, 18, 0.0048);
  // Coordenadas métricas UV para que el camuflaje fluya sin costuras desde los pantalones hacia el torso
  const abGeoPos = abdomenGeo.attributes.position;
  const abUv = abdomenGeo.attributes.uv;
  if (abUv) {
    for (let i = 0; i < abGeoPos.count; i++) {
      const ax = abGeoPos.getX(i);
      const ay = abGeoPos.getY(i);
      const az = abGeoPos.getZ(i);
      abUv.setXY(i, (ax + az * 0.45) * 2.45, ay * 2.45);
    }
    abUv.needsUpdate = true;
  }
  const abdomen = new THREE.Mesh(abdomenGeo, materials.camoFabric);
  abdomen.position.y = 0.07;
  skeleton.spine.add(abdomen);

  // Canesú superior (Yoke) y hombros de la camisa Crye G3 en tejido NYCO Ripstop:
  // Fusión continua del trapecio hacia los deltoides (elimina el escalón de rótula)
  const rawUpperChestGeo = new THREE.CylinderGeometry(0.222, 0.188, 0.30, 48, 22);
  const ucPos = rawUpperChestGeo.attributes.position;
  for (let i = 0; i < ucPos.count; i++) {
    const ux = ucPos.getX(i);
    const uy = ucPos.getY(i);
    const uz = ucPos.getZ(i);
    const ny = uy / 0.15; // -1 (abajo) a +1 (hombros)
    const nx = Math.abs(ux) / 0.222;

    // Caída anatómica del trapecio hacia los hombros
    const trapSlope = ny > 0.15 ? nx * Math.pow((ny - 0.15) / 0.85, 1.4) * 0.024 : 0.0;
    // Borde lateral abovedado que se proyecta hacia la raíz del deltoide (X = ±0.235)
    const shoulderExtension = nx > 0.55 && ny > 0.20 ? Math.pow((nx - 0.55) / 0.45, 1.3) * 0.016 : 0.0;

    const radialScale = 1.0 - (ny > 0.5 ? Math.pow((ny - 0.5) / 0.5, 2.0) * 0.08 : 0.0);
    ucPos.setXYZ(
      i,
      (ux + Math.sign(ux) * shoulderExtension) * radialScale * 1.15,
      uy - trapSlope,
      uz * radialScale * 0.80
    );
  }
  const upperChestGeo = sculptClothFolds(rawUpperChestGeo, 7, 18, 0.0054);
  const upperChest = new THREE.Mesh(upperChestGeo, materials.camoFabric);
  upperChest.position.y = 0.10;
  skeleton.chest.add(upperChest);

  // Cuello alto anatómico en tejido Ripstop con borde superior acolchado (Rolled Collar Lip) y cremallera YKK frontal
  const collarGeo = sculptClothFolds(new THREE.CylinderGeometry(0.090, 0.108, 0.098, 36, 14), 6, 12, 0.0036);
  const collar = new THREE.Mesh(collarGeo, materials.camoFabric);
  collar.position.set(0, 0.258, 0);
  skeleton.chest.add(collar);

  const collarRim = new THREE.Mesh(
    sculptClothFolds(new THREE.TorusGeometry(0.088, 0.0065, 12, 32), 6, 10, 0.0012),
    materials.camoFabric
  );
  collarRim.rotation.x = Math.PI / 2;
  collarRim.position.set(0, 0.302, 0);
  skeleton.chest.add(collarRim);

  const zipperCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.155, 0.148),
    new THREE.Vector3(0, 0.215, 0.142),
    new THREE.Vector3(0, 0.275, 0.128)
  ]);
  const zipperTrack = new THREE.Mesh(
    createRoundedStrapGeometry(zipperCurve, 0.012, 0.006, 8, 16),
    materials.darkPolymer
  );
  skeleton.chest.add(zipperTrack);

  // ====================================================================
  // 2. CHALECO PORTAPLACAS TIER-1 (CRYE PRECISION JPC 2.0 / AVS HYBRID)
  // ====================================================================
  const vestGroup = new THREE.Group();
  vestGroup.position.y = 0.06;
  skeleton.chest.add(vestGroup);

  const plateBagShape = createSwimmerPlateShape(0.278, 0.334);

  // Función que evalúa la curvatura multi-curva 3D de la placa SAPI frontal
  const evalFrontPlateZ = (x: number, y: number): number => {
    const chestWrap = -(x * x) * 1.45;
    const verticalTilt = -y * 0.075 - (y * y) * 0.18;
    const centerLoft = Math.cos(Math.min(1, Math.abs(x) / 0.14) * Math.PI * 0.5) *
                       Math.cos(Math.min(1, Math.abs(y) / 0.17) * Math.PI * 0.5) * 0.006;
    return chestWrap + verticalTilt + centerLoft;
  };

  // A) Funda Portaplacas Frontal (Front SAPI Plate Bag) esculpida en 3D con bordes redondeados y acolchado
  const frontPlateGeo = createOrganicExtrude(
    plateBagShape,
    0.034,
    0.013,
    8,
    28,
    10,
    (v) => {
      const nx = v.x / 0.139;
      const ny = v.y / 0.167;
      // Estrechar sutilmente la cintura media para una silueta atlética real
      const waistContour = 1.0 - 0.035 * Math.exp(-Math.pow((ny + 0.15) * 2.2, 2.0));
      v.x *= waistContour;
      // Pliegues de tensión textil en Cordura 1000D y costura perimetral hundida
      const seamGroove = Math.exp(-Math.pow((Math.hypot(nx * 0.85, ny * 0.85) - 0.86) / 0.08, 2.0)) * 0.0022;
      const microWrinkle = Math.sin(nx * 9.0 + ny * 7.0) * 0.0008;
      v.z += evalFrontPlateZ(v.x, v.y) - seamGroove * Math.sign(v.z) + microWrinkle;
    }
  );
  const frontPlate = new THREE.Mesh(frontPlateGeo, materials.corduraVest);
  frontPlate.position.set(0, 0.022, 0.150);
  vestGroup.add(frontPlate);

  // Almohadillas internas transpirables (3D Spacer Mesh Comfort Pads) detrás de la placa frontal
  for (const padSide of [-1, 1]) {
    const comfortPadGeo = createOrganicPouchVolume(0.095, 0.275, 0.016, {
      roundnessXZ: 0.62,
      roundnessY: 0.55,
      pillowBulge: 0.14,
      wrinkleAmp: 0.001
    });
    const comfortPad = new THREE.Mesh(comfortPadGeo, materials.hypalon);
    comfortPad.position.set(padSide * 0.068, 0.020, 0.132);
    comfortPad.rotation.y = padSide * 0.16;
    vestGroup.add(comfortPad);
  }

  // Ribete perimetral cosido (Edge Binding Piping) + Costuras dobles reforzadas alrededor de la placa frontal
  const frontPipingPts = [
    new THREE.Vector3(-0.125, -0.142, 0.150 + evalFrontPlateZ(-0.125, -0.142)),
    new THREE.Vector3(0.0, -0.146, 0.152 + evalFrontPlateZ(0, -0.146)),
    new THREE.Vector3(0.125, -0.142, 0.150 + evalFrontPlateZ(0.125, -0.142)),
    new THREE.Vector3(0.136, 0.055, 0.148 + evalFrontPlateZ(0.136, 0.055)),
    new THREE.Vector3(0.088, 0.184, 0.144 + evalFrontPlateZ(0.088, 0.184)),
    new THREE.Vector3(0.0, 0.188, 0.145 + evalFrontPlateZ(0, 0.188)),
    new THREE.Vector3(-0.088, 0.184, 0.144 + evalFrontPlateZ(-0.088, 0.184)),
    new THREE.Vector3(-0.136, 0.055, 0.148 + evalFrontPlateZ(-0.136, 0.055))
  ];
  const frontPipingCurve = new THREE.CatmullRomCurve3(frontPipingPts, true);
  const frontPiping = new THREE.Mesh(
    new THREE.TubeGeometry(frontPipingCurve, 64, 0.0042, 10, true),
    materials.webbing
  );
  vestGroup.add(frontPiping);

  for (const sScale of [0.955, 0.925]) {
    const stitchPts = frontPipingPts.map(
      (p) => new THREE.Vector3(p.x * sScale, (p.y - 0.022) * sScale + 0.022, p.z + 0.0155)
    );
    const vestDoubleStitch = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stitchPts, true), 64, 0.00095, 6, true),
      materials.stitchThread
    );
    vestGroup.add(vestDoubleStitch);
  }

  // B) Funda Portaplacas Trasera (Rear SAPI Plate Bag) con curvatura dorsal multi-curva y sin esquinas duras
  const evalBackPlateZ = (x: number, y: number): number => {
    const dorsalWrap = (x * x) * 1.35;
    const verticalCurve = y * 0.045 + (y * y) * 0.16;
    return dorsalWrap + verticalCurve;
  };

  const backPlateGeo = createOrganicExtrude(
    plateBagShape,
    0.032,
    0.013,
    8,
    28,
    10,
    (v) => {
      const nx = v.x / 0.139;
      const ny = v.y / 0.167;
      const waistContour = 1.0 - 0.035 * Math.exp(-Math.pow((ny + 0.15) * 2.2, 2.0));
      v.x *= waistContour;
      v.z += evalBackPlateZ(v.x, v.y);
    }
  );
  const backPlate = new THREE.Mesh(backPlateGeo, materials.corduraVest);
  backPlate.position.set(0, 0.028, -0.156);
  vestGroup.add(backPlate);

  // Almohadillas dorsales de ventilación (Rear AirLite Thoracic Pads) entre la espalda y el portaplacas
  for (const padSide of [-1, 1]) {
    const backPadGeo = createOrganicPouchVolume(0.092, 0.280, 0.018, {
      roundnessXZ: 0.62,
      roundnessY: 0.55,
      pillowBulge: 0.15,
      wrinkleAmp: 0.001
    });
    const backPad = new THREE.Mesh(backPadGeo, materials.hypalon);
    backPad.position.set(padSide * 0.066, 0.028, -0.138);
    backPad.rotation.y = padSide * -0.15;
    vestGroup.add(backPad);
  }

  // ====================================================================
  // 3. ELEMENTOS DETRÁS (DEBAJO DE LA MOCHILA): SISTEMA DE CORDÓN ELÁSTICO
  //    DEL CUMMERBUND Y SUB-POUCH LUMBAR / BREACHING ROLL-1 TRAUMA
  // ====================================================================
  const rearLowerRig = new THREE.Group();
  rearLowerRig.position.set(0, -0.118, -0.168);
  vestGroup.add(rearLowerRig);

  // Solapa inferior de retención del Cummerbund con ojales de Hypalon y entrelazado Shock-Cord en zig-zag
  const rearFlapShape = createRoundedRectShape(0.165, 0.086, 0.020);
  const rearFlapGeo = createOrganicExtrude(rearFlapShape, 0.010, 0.0035, 6, 20, 4, (v) => {
    v.z += (v.x * v.x) * 1.25;
  });
  const rearCummerbundFlap = new THREE.Mesh(rearFlapGeo, materials.hypalon);
  rearCummerbundFlap.position.set(0, 0.032, -0.004);
  rearLowerRig.add(rearCummerbundFlap);

  // Cordón elástico Shock-Cord entrelazado en la base de la placa trasera
  const shockLacePts = [
    new THREE.Vector3(-0.052, 0.062, -0.009),
    new THREE.Vector3(0.052, 0.046, -0.011),
    new THREE.Vector3(-0.052, 0.030, -0.011),
    new THREE.Vector3(0.052, 0.014, -0.011),
    new THREE.Vector3(-0.052, -0.002, -0.009)
  ];
  const shockLaceCurve = new THREE.CatmullRomCurve3(shockLacePts);
  const shockLace = new THREE.Mesh(
    new THREE.TubeGeometry(shockLaceCurve, 32, 0.0032, 8, false),
    materials.bootLaces
  );
  rearLowerRig.add(shockLace);

  // Sub-Pouch Táctico Inferior Trasero (Ferro Concepts Roll 1 / Crye Rear Sub-Load Pouch) debajo de la mochila
  const rearSubPouchGeo = createOrganicPouchVolume(0.214, 0.084, 0.062, {
    roundnessXZ: 0.64,
    roundnessY: 0.58,
    teardropSag: 0.14,
    pillowBulge: 0.20,
    wrapRadiusX: -0.38,
    pinchY: [
      { y: 0.0, width: 0.35, depth: 0.05 }
    ],
    wrinkleAmp: 0.0022,
    wrinkleFreq: 20,
    segsW: 32,
    segsH: 24,
    segsD: 18
  });
  const rearSubPouch = new THREE.Mesh(rearSubPouchGeo, materials.corduraVest);
  rearSubPouch.position.set(0, -0.032, -0.016);
  rearLowerRig.add(rearSubPouch);

  // Correas de suspensión de Hypalon redondeadas que unen el Sub-Pouch a la base de la placa trasera
  for (const hSide of [-1, 1]) {
    const hangerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hSide * 0.068, 0.022, 0.004),
      new THREE.Vector3(hSide * 0.068, -0.002, -0.006),
      new THREE.Vector3(hSide * 0.068, -0.022, -0.010)
    ]);
    const hangerStrap = new THREE.Mesh(
      createRoundedStrapGeometry(hangerCurve, 0.026, 0.0055, 10, 16),
      materials.hypalon
    );
    rearLowerRig.add(hangerStrap);

    // Anillas laterales de extracción rápida del rollo de trauma (Teardrop Pull Tabs)
    const tabCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hSide * 0.100, -0.022, -0.008),
      new THREE.Vector3(hSide * 0.122, -0.032, -0.018),
      new THREE.Vector3(hSide * 0.100, -0.044, -0.008)
    ]);
    const pullTab = new THREE.Mesh(
      createRoundedStrapGeometry(tabCurve, 0.016, 0.004, 10, 18),
      materials.webbing
    );
    rearLowerRig.add(pullTab);
  }

  // Cremallera impermeable YKK AquaGuard horizontal y parche identificador en el Sub-Pouch trasero
  const rearSubZipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.088, -0.030, -0.036),
    new THREE.Vector3(-0.044, -0.032, -0.048),
    new THREE.Vector3(0.0, -0.033, -0.051),
    new THREE.Vector3(0.044, -0.032, -0.048),
    new THREE.Vector3(0.088, -0.030, -0.036)
  ]);
  const rearSubZip = new THREE.Mesh(
    createRoundedStrapGeometry(rearSubZipCurve, 0.008, 0.004, 8, 24),
    materials.hypalon
  );
  rearLowerRig.add(rearSubZip);

  const rearSubPatchGeo = createOrganicExtrude(
    createRoundedRectShape(0.084, 0.032, 0.008),
    0.004,
    0.0015,
    4,
    16,
    4,
    (v) => {
      v.z += (v.x * v.x) * 1.4;
    }
  );
  const rearSubPatch = new THREE.Mesh(rearSubPatchGeo, materials.patchMat);
  rearSubPatch.position.set(0, -0.012, -0.048);
  rearLowerRig.add(rearSubPatch);

  // ====================================================================
  // 4. LATERALES: CUMMERBUND ESQUELÉTICO CURVO DE 3 BANDAS + HEBILLAS
  //    FIRSTSPEAR TUBES™ + BOLSILLOS DE PLACA LATERAL 6x6" CONTORNEADOS
  // ====================================================================
  const tubeBuckleShape = createRoundedRectShape(0.022, 0.098, 0.007);
  const tubeBuckleGeo = createOrganicExtrude(tubeBuckleShape, 0.012, 0.0032, 5, 18, 4);

  for (const side of [-1, 1]) {
    // A) Hebilla de liberación rápida FirstSpear Tubes™ en la unión frontal del Cummerbund
    const frontTubeBuckle = new THREE.Mesh(tubeBuckleGeo, materials.darkPolymer);
    frontTubeBuckle.position.set(side * 0.146, -0.042, 0.128);
    frontTubeBuckle.rotation.y = side * 0.52;
    vestGroup.add(frontTubeBuckle);

    // Cilindro de bloqueo deslizante y tirador superior redondeado del FirstSpear Tube
    const tubePin = new THREE.Mesh(new THREE.CapsuleGeometry(0.0048, 0.092, 8, 12), materials.gunmetal);
    tubePin.position.set(side * 0.149, -0.042, 0.132);
    vestGroup.add(tubePin);

    const tubePullCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.148, 0.008, 0.132),
      new THREE.Vector3(side * 0.158, 0.024, 0.142),
      new THREE.Vector3(side * 0.152, 0.032, 0.136)
    ]);
    const tubePull = new THREE.Mesh(
      createRoundedStrapGeometry(tubePullCurve, 0.012, 0.0035, 8, 14),
      materials.webbing
    );
    vestGroup.add(tubePull);

    // B) 3 Bandas esqueléticas curvas de sección capsular redondeada (Crye AirLite Skeletal Cummerbund)
    // Se adaptan a la curvatura elíptica de las costillas desde la placa frontal hasta la ranura trasera
    for (let b = 0; b < 3; b++) {
      const bandY = -0.084 + b * 0.042;
      const ribBulge = b === 1 ? 0.004 : 0.0;

      // Curva 3D envolvente alrededor del flanco del torso (cero barras rectangulares rectas)
      const bandCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.142, bandY, 0.126),
        new THREE.Vector3(side * (0.188 + ribBulge), bandY, 0.082),
        new THREE.Vector3(side * (0.208 + ribBulge), bandY, 0.015),
        new THREE.Vector3(side * (0.204 + ribBulge), bandY, -0.058),
        new THREE.Vector3(side * 0.176, bandY, -0.118),
        new THREE.Vector3(side * 0.122, bandY + 0.002, -0.152)
      ]);

      // Núcleo rígido interno en polímero/Hypalon negro con bordes totalmente redondeados
      const stiffenerCurve = new THREE.CatmullRomCurve3(
        bandCurve.getPoints(24).map((p) => new THREE.Vector3(p.x * 0.985, p.y, p.z * 0.985))
      );
      const bandStiffener = new THREE.Mesh(
        createRoundedStrapGeometry(stiffenerCurve, 0.024, 0.0055, 10, 32),
        materials.hypalon
      );
      vestGroup.add(bandStiffener);

      // Cinta exterior de Cordura con bordes redondeados suaves
      const bandOuter = new THREE.Mesh(
        createRoundedStrapGeometry(bandCurve, 0.028, 0.0075, 12, 36),
        materials.corduraVest
      );
      vestGroup.add(bandOuter);

      // Celdas PALS / MOLLE onduladas cosidas a lo largo de cada banda lateral
      const palsPts: THREE.Vector3[] = [];
      const numSamples = 28;
      for (let s = 0; s <= numSamples; s++) {
        const u = s / numSamples;
        const pt = bandCurve.getPointAt(u);
        const tangent = bandCurve.getTangentAt(u);
        // Normal radial hacia afuera en el plano XZ
        const outward = new THREE.Vector3(-side * tangent.z, 0, side * tangent.x).normalize();
        const cellWave = Math.abs(Math.sin(u * Math.PI * 5.0)) * 0.0038;
        palsPts.push(pt.clone().addScaledVector(outward, 0.0038 + cellWave));
      }
      const palsWaveCurve = new THREE.CatmullRomCurve3(palsPts);
      const palsStrip = new THREE.Mesh(
        createRoundedStrapGeometry(palsWaveCurve, 0.018, 0.0035, 8, 36),
        materials.webbing
      );
      vestGroup.add(palsStrip);

      // Costuras verticales Bartack en cada valle de la banda MOLLE
      for (let c = 1; c <= 4; c++) {
        const u = c / 5;
        const pt = bandCurve.getPointAt(u);
        const stitch = new THREE.Mesh(new THREE.CapsuleGeometry(0.0018, 0.022, 6, 8), materials.stitchThread);
        stitch.position.set(pt.x + side * 0.004, pt.y, pt.z);
        vestGroup.add(stitch);
      }
    }

    // C) Bolsillo de Placa Balística Lateral 6x6" (Crye JPC Side Plate Pouch)
    // Esculpido como un volumen textil orgánico redondeado y curvado conforme a las costillas
    const sidePouchGroup = new THREE.Group();
    sidePouchGroup.position.set(side * 0.212, -0.042, 0.006);
    sidePouchGroup.rotation.y = side * Math.PI * 0.5 - side * 0.08;
    vestGroup.add(sidePouchGroup);

    // Almohadilla interior de trauma (Foam Trauma Liner) pegada a las costillas
    const sideTraumaPadGeo = createOrganicPouchVolume(0.128, 0.132, 0.016, {
      roundnessXZ: 0.64,
      roundnessY: 0.58,
      teardropSag: 0.04,
      pillowBulge: 0.10,
      wrapRadiusX: -0.26,
      wrinkleAmp: 0.0012
    });
    const sideTraumaPad = new THREE.Mesh(sideTraumaPadGeo, materials.hypalon);
    sideTraumaPad.position.set(0, 0, -0.012);
    sidePouchGroup.add(sideTraumaPad);

    // Funda exterior de Cordura 1000D con esquinas suaves de gran radio, caída natural y pliegues de costura
    const sidePlateBagGeo = createOrganicPouchVolume(0.134, 0.138, 0.034, {
      roundnessXZ: 0.62,
      roundnessY: 0.56,
      teardropSag: 0.08,
      pillowBulge: 0.22,
      wrapRadiusX: -0.26,
      pinchY: [
        { y: 0.28, width: 0.26, depth: 0.045 },
        { y: -0.28, width: 0.26, depth: 0.045 }
      ],
      wrinkleAmp: 0.0024,
      wrinkleFreq: 18,
      segsW: 30,
      segsH: 30,
      segsD: 18
    });
    const sidePlateBag = new THREE.Mesh(sidePlateBagGeo, materials.corduraVest);
    sidePouchGroup.add(sidePlateBag);

    // Ribete perimetral redondeado y 2 filas de MOLLE curvadas sobre la cara exterior de la placa lateral
    for (const rowY of [-0.028, 0.026]) {
      const sideMollePts: THREE.Vector3[] = [];
      for (let k = 0; k <= 20; k++) {
        const u = (k / 20) * 2 - 1;
        const sx = u * 0.056;
        const archZ = Math.cos(u * Math.PI * 0.48) * 0.008 + Math.abs(Math.sin(u * Math.PI * 1.5)) * 0.003;
        sideMollePts.push(new THREE.Vector3(sx, rowY, 0.015 + archZ));
      }
      const sideMolleCurve = new THREE.CatmullRomCurve3(sideMollePts);
      const sideMolleWeb = new THREE.Mesh(
        createRoundedStrapGeometry(sideMolleCurve, 0.020, 0.0038, 10, 24),
        materials.webbing
      );
      sidePouchGroup.add(sideMolleWeb);
    }

    // Solapa superior redondeada de cierre con tirador de Hypalon y ojal inferior de drenaje en latón
    const sideFlapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.042, 0.064, -0.006),
      new THREE.Vector3(0.0, 0.070, 0.008),
      new THREE.Vector3(0.042, 0.064, -0.006)
    ]);
    const sideTopTrim = new THREE.Mesh(
      createRoundedStrapGeometry(sideFlapCurve, 0.016, 0.005, 10, 18),
      materials.hypalon
    );
    sidePouchGroup.add(sideTopTrim);

    const sideGrommet = new THREE.Mesh(new THREE.TorusGeometry(0.0055, 0.0018, 10, 18), materials.brass);
    sideGrommet.rotation.x = Math.PI / 2;
    sideGrommet.position.set(0, -0.066, 0.004);
    sidePouchGroup.add(sideGrommet);

    // ====================================================================
    // 5. HOMBRERAS ANATÓMICAS CURVAS (HYPALON YOKE + STRUCTURAL PADS)
    //    (Sustituyen los bloques rectangulares y se alinean con la mochila)
    // ====================================================================
    // Correa estructural de Hypalon negro que nace en el corte Swimmer-Cut frontal,
    // arquea suavemente sobre el trapecio y baja hasta la placa trasera sin aristas
    const hypalonStrapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.098, 0.168, 0.144),
      new THREE.Vector3(side * 0.114, 0.214, 0.092),
      new THREE.Vector3(side * 0.124, 0.226, 0.012),
      new THREE.Vector3(side * 0.116, 0.212, -0.078),
      new THREE.Vector3(side * 0.098, 0.172, -0.148)
    ]);
    const hypalonShoulderStrap = new THREE.Mesh(
      createRoundedStrapGeometry(hypalonStrapCurve, 0.048, 0.008, 14, 36),
      materials.hypalon
    );
    vestGroup.add(hypalonShoulderStrap);

    // Tirador de liberación de emergencia E-Doff en ángulo sobre el hombro frontal
    const eDoffCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.104, 0.184, 0.132),
      new THREE.Vector3(side * 0.124, 0.172, 0.146),
      new THREE.Vector3(side * 0.130, 0.158, 0.152)
    ]);
    const eDoffHandle = new THREE.Mesh(
      createRoundedStrapGeometry(eDoffCurve, 0.018, 0.0055, 10, 16),
      materials.hypalon
    );
    vestGroup.add(eDoffHandle);

    // Manguito acolchado envolvente (Crye Structural Shoulder Pad Sleeve) en Cordura
    // siguiendo exactamente la curva superior del trapecio
    const padSleeveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.110, 0.205, 0.104),
      new THREE.Vector3(side * 0.122, 0.224, 0.048),
      new THREE.Vector3(side * 0.125, 0.228, -0.005),
      new THREE.Vector3(side * 0.118, 0.216, -0.068)
    ]);
    const shoulderPadSleeve = new THREE.Mesh(
      createRoundedStrapGeometry(padSleeveCurve, 0.058, 0.018, 16, 32),
      materials.corduraVest
    );
    vestGroup.add(shoulderPadSleeve);

    // Presillas de guiado de cables/hidratación en Hypalon (One-Wrap Keepers) sobre la hombrera
    for (const kZ of [0.052, -0.024]) {
      const keeperY = kZ > 0 ? 0.225 : 0.224;
      const keeperX = side * 0.123;
      const keeperLoopCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(keeperX - 0.026, keeperY - 0.002, kZ),
        new THREE.Vector3(keeperX, keeperY + 0.011, kZ),
        new THREE.Vector3(keeperX + 0.026, keeperY - 0.002, kZ)
      ]);
      const keeperStrap = new THREE.Mesh(
        createRoundedStrapGeometry(keeperLoopCurve, 0.016, 0.004, 8, 16),
        materials.webbing
      );
      vestGroup.add(keeperStrap);
    }
  }

  // ====================================================================
  // 6. EQUIPAMIENTO FRONTAL DEL PECHO HIPER-DETALLADO
  //    (ADMIN POUCH + MONTURA ATAK JUGGERNAUT + PLACARD AVS 3x PMAG + CAT)
  // ====================================================================

  // A) Bolsillo Superior Admin Integrado + Montura Táctica Plegada Juggernaut Case ATAK EUD
  const adminGroup = new THREE.Group();
  adminGroup.position.set(0, 0.118, 0.168);
  adminGroup.rotation.x = -0.08;
  vestGroup.add(adminGroup);

  // Cuerpo textil orgánico del Admin Pouch con esquinas redondeadas y fuelle
  const adminPouchGeo = createOrganicPouchVolume(0.156, 0.086, 0.024, {
    roundnessXZ: 0.56,
    roundnessY: 0.52,
    teardropSag: 0.06,
    pillowBulge: 0.16,
    wrapRadiusX: 0.42,
    wrinkleAmp: 0.0016,
    segsW: 26,
    segsH: 20,
    segsD: 14
  });
  const adminPouch = new THREE.Mesh(adminPouchGeo, materials.corduraVest);
  adminGroup.add(adminPouch);

  // Cremallera superior YKK AquaGuard del Admin Pouch
  const adminZipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.068, 0.038, 0.008),
    new THREE.Vector3(0.0, 0.041, 0.012),
    new THREE.Vector3(0.068, 0.038, 0.008)
  ]);
  const adminZip = new THREE.Mesh(
    createRoundedStrapGeometry(adminZipCurve, 0.007, 0.0035, 8, 20),
    materials.hypalon
  );
  adminGroup.add(adminZip);

  // Carcasa protectora de smartphone táctico Juggernaut Case IMPCT (plegada contra el pecho)
  const eudFrameShape = createRoundedRectShape(0.138, 0.074, 0.014);
  const eudFrameGeo = createOrganicExtrude(eudFrameShape, 0.012, 0.0035, 6, 20, 4, (v) => {
    v.z -= (v.x * v.x) * 0.85;
  });
  const eudFrame = new THREE.Mesh(eudFrameGeo, materials.fdeAnodized);
  eudFrame.position.set(0, -0.002, 0.016);
  adminGroup.add(eudFrame);

  // Paragolpes perimetral de caucho y pestillo superior de bloqueo Juggernaut
  const eudBumperGeo = createOrganicExtrude(createRoundedRectShape(0.144, 0.078, 0.016), 0.006, 0.0025, 5, 18, 2, (v) => {
    v.z -= (v.x * v.x) * 0.85;
  });
  const eudBumper = new THREE.Mesh(eudBumperGeo, materials.darkPolymer);
  eudBumper.position.set(0, -0.002, 0.014);
  adminGroup.add(eudBumper);

  const eudLatchGeo = createOrganicExtrude(createRoundedRectShape(0.028, 0.014, 0.004), 0.008, 0.002, 4, 12, 2);
  const eudLatch = new THREE.Mesh(eudLatchGeo, materials.darkPolymer);
  eudLatch.position.set(0, 0.038, 0.019);
  adminGroup.add(eudLatch);

  // Bisagra inferior abombada de la montura PALS Armor Mount
  for (const hX of [-0.034, 0.0, 0.034]) {
    const knuckle = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.014, 8, 12), materials.darkPolymer);
    knuckle.rotation.z = Math.PI / 2;
    knuckle.position.set(hX, -0.042, 0.014);
    adminGroup.add(knuckle);
  }

  // Panel frontal de Velcro Loop con esquinas redondeadas + Parche Callsign / Bandera IR
  const chestPatchShape = createRoundedRectShape(0.108, 0.048, 0.009);
  const chestPatchGeo = createOrganicExtrude(chestPatchShape, 0.005, 0.0018, 5, 18, 4, (v) => {
    v.z -= (v.x * v.x) * 0.85;
  });
  const chestPatch = new THREE.Mesh(chestPatchGeo, materials.patchMat);
  chestPatch.position.set(0, -0.002, 0.023);
  adminGroup.add(chestPatch);

  // Marcador IR reflectante e insignia cortada a láser sobre el parche
  const irGlintSquare = new THREE.Mesh(
    createOrganicExtrude(createRoundedRectShape(0.018, 0.018, 0.003), 0.003, 0.001, 4, 12, 2),
    materials.hypalon
  );
  irGlintSquare.position.set(-0.036, -0.002, 0.026);
  adminGroup.add(irGlintSquare);

  const callsignBar = new THREE.Mesh(
    createOrganicExtrude(createRoundedRectShape(0.056, 0.016, 0.003), 0.003, 0.001, 4, 12, 2),
    materials.corduraVest
  );
  callsignBar.position.set(0.012, -0.002, 0.026);
  adminGroup.add(callsignBar);

  // Tijeras de trauma médicas Leatherman Raptor / Paramedic Shears alojadas tras el Admin Pouch
  const shearsGroup = new THREE.Group();
  shearsGroup.position.set(0.058, 0.098, 0.162);
  shearsGroup.rotation.z = -0.32;
  shearsGroup.rotation.x = -0.08;
  vestGroup.add(shearsGroup);

  const shearsRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0038, 12, 24), materials.darkPolymer);
  shearsRing1.position.set(-0.010, 0.012, 0);
  shearsGroup.add(shearsRing1);

  const shearsRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0038, 12, 24), materials.darkPolymer);
  shearsRing2.scale.set(0.85, 1.25, 1.0);
  shearsRing2.position.set(0.014, 0.004, 0.002);
  shearsGroup.add(shearsRing2);

  const shearsPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.008, 12), materials.boltSteel);
  shearsPivot.rotation.x = Math.PI / 2;
  shearsPivot.position.set(0, -0.014, 0.001);
  shearsGroup.add(shearsPivot);

  // B) Placard Frontal Desmontable Crye AVS M4 con 3 Pouches Orgánicos de Carabina 5.56mm
  const placardGroup = new THREE.Group();
  placardGroup.position.set(0, -0.052, 0.172);
  placardGroup.rotation.x = -0.04;
  vestGroup.add(placardGroup);

  // Panel base del Placard curvado sobre la placa frontal + Hebillas superiores verticales QASM
  const placardBaseShape = createRoundedRectShape(0.254, 0.138, 0.018);
  const placardBaseGeo = createOrganicExtrude(placardBaseShape, 0.010, 0.003, 5, 22, 6, (v) => {
    v.z -= (v.x * v.x) * 1.35;
  });
  const placardBase = new THREE.Mesh(placardBaseGeo, materials.corduraVest);
  placardBase.position.set(0, 0, -0.002);
  placardGroup.add(placardBase);

  const qasmShape = createRoundedRectShape(0.026, 0.036, 0.007);
  const qasmGeo = createOrganicExtrude(qasmShape, 0.010, 0.0028, 5, 16, 4);
  for (const qSide of [-1, 1]) {
    const qasmBuckle = new THREE.Mesh(qasmGeo, materials.darkPolymer);
    qasmBuckle.position.set(qSide * 0.104, 0.084, -0.010);
    qasmBuckle.rotation.y = qSide * 0.22;
    placardGroup.add(qasmBuckle);
  }

  // 3x Bolsillos portacargadores esculpidos orgánicamente + Insertos Kydex + PMAG Gen M3 + Retención Bungee 3D
  for (let i = -1; i <= 1; i++) {
    const pouchGroup = new THREE.Group();
    const px = i * 0.082;
    const pz = -(px * px) * 1.35 + 0.022;
    pouchGroup.position.set(px, -0.002, pz);
    pouchGroup.rotation.y = -i * 0.16;
    placardGroup.add(pouchGroup);

    // Funda de Cordura 1000D moldeada con esquinas redondeadas, hinchazón por tensión y cintura elástica
    const magPouchGeo = createOrganicPouchVolume(0.075, 0.132, 0.042, {
      roundnessXZ: 0.54,
      roundnessY: 0.34,
      teardropSag: -0.06,
      pillowBulge: 0.16,
      pinchY: [
        { y: 0.22, width: 0.28, depth: 0.05 },
        { y: -0.28, width: 0.28, depth: 0.05 }
      ],
      wrinkleAmp: 0.0020,
      wrinkleFreq: 20,
      segsW: 24,
      segsH: 26,
      segsD: 16
    });
    const magPouch = new THREE.Mesh(magPouchGeo, materials.corduraVest);
    pouchGroup.add(magPouch);

    // 3 Bandas horizontales PALS / MOLLE curvadas sobre el frente de cada pouch con costuras Bartack
    for (let r = -1; r <= 1; r++) {
      const ry = r * 0.036 - 0.004;
      const molleCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.036, ry, 0.014),
        new THREE.Vector3(-0.018, ry, 0.024),
        new THREE.Vector3(0.0, ry, 0.026),
        new THREE.Vector3(0.018, ry, 0.024),
        new THREE.Vector3(0.036, ry, 0.014)
      ]);
      const pouchMolle = new THREE.Mesh(
        createRoundedStrapGeometry(molleCurve, 0.017, 0.0034, 8, 18),
        materials.webbing
      );
      pouchGroup.add(pouchMolle);

      for (const sX of [-0.024, 0.024]) {
        const bartack = new THREE.Mesh(new THREE.CapsuleGeometry(0.0016, 0.015, 6, 8), materials.stitchThread);
        bartack.position.set(sX, ry, 0.022);
        pouchGroup.add(bartack);
      }
    }

    // Inserto de retención Kydex negro con labios superiores acampanados
    const kydexInsertGeo = createOrganicPouchVolume(0.068, 0.136, 0.033, {
      roundnessXZ: 0.56,
      roundnessY: 0.24,
      teardropSag: -0.10,
      pillowBulge: 0.06,
      wrinkleAmp: 0
    });
    const kydexInsert = new THREE.Mesh(kydexInsertGeo, materials.darkPolymer);
    kydexInsert.position.y = 0.004;
    pouchGroup.add(kydexInsert);

    // Cuerpo del cargador Magpul PMAG 30 AR/M4 Gen M3 con curvatura real y nervaduras horizontales
    const pmagBodyGeo = createOrganicPouchVolume(0.062, 0.084, 0.027, {
      roundnessXZ: 0.46,
      roundnessY: 0.24,
      teardropSag: 0.0,
      pillowBulge: 0.07,
      wrinkleAmp: 0
    });
    const pmPos = pmagBodyGeo.attributes.position;
    for (let vIdx = 0; vIdx < pmPos.count; vIdx++) {
      const py = pmPos.getY(vIdx);
      const rib = Math.sin(py * 240.0) * 0.0009;
      const curveX = Math.pow(Math.max(0, (py + 0.042) / 0.084), 1.7) * 0.0045;
      pmPos.setX(vIdx, pmPos.getX(vIdx) - curveX);
      pmPos.setZ(vIdx, pmPos.getZ(vIdx) + Math.sign(pmPos.getZ(vIdx)) * rib);
    }
    pmagBodyGeo.computeVertexNormals();
    const pmag = new THREE.Mesh(pmagBodyGeo, materials.pmagFDE);
    pmag.position.set(0, 0.074, 0);
    pouchGroup.add(pmag);

    // Placa base acampanada del PMAG (Flared Floorplate) con bordes redondeados + Asa Ranger Plate
    const floorplateGeo = createOrganicPouchVolume(0.068, 0.016, 0.033, {
      roundnessXZ: 0.54,
      roundnessY: 0.48,
      teardropSag: -0.12,
      pillowBulge: 0.08,
      wrinkleAmp: 0
    });
    const floorplate = new THREE.Mesh(floorplateGeo, materials.darkPolymer);
    floorplate.position.set(-0.004, 0.118, 0);
    floorplate.rotation.z = 0.05;
    pouchGroup.add(floorplate);

    // Cordón elástico Shock-Cord en 3D que abraza el cargador + Lengüeta ergonómica S&S Precision Pull Tab
    const bungeeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.024, 0.056, -0.014),
      new THREE.Vector3(-0.020, 0.122, -0.006),
      new THREE.Vector3(-0.004, 0.130, 0.008),
      new THREE.Vector3(0.014, 0.122, -0.006),
      new THREE.Vector3(0.024, 0.056, -0.014)
    ]);
    const bungeeCord = new THREE.Mesh(
      new THREE.TubeGeometry(bungeeCurve, 28, 0.0028, 8, false),
      materials.bootLaces
    );
    pouchGroup.add(bungeeCord);

    const pullTabShape = createRoundedRectShape(0.022, 0.028, 0.007);
    const pullTabGeo = createOrganicExtrude(pullTabShape, 0.007, 0.0022, 4, 14, 2);
    const bungeePullTab = new THREE.Mesh(pullTabGeo, materials.webbing);
    bungeePullTab.position.set(-0.004, 0.128, 0.012);
    bungeePullTab.rotation.x = -0.45;
    pouchGroup.add(bungeePullTab);
  }

  // C) Torniquete de Combate CAT Gen-7 en Hamaca Elástica Inferior (bajo el Placard)
  const catGroup = new THREE.Group();
  catGroup.position.set(0, -0.156, 0.172);
  vestGroup.add(catGroup);

  // Cuerpo de cinta doblada con esquinas redondeadas y cintura comprimida por las bandas elásticas
  const catBodyGeo = createOrganicPouchVolume(0.132, 0.036, 0.036, {
    roundnessXZ: 0.58,
    roundnessY: 0.54,
    pillowBulge: 0.12,
    wrapRadiusX: 0.44,
    wrinkleAmp: 0.0016
  });
  const cbPos = catBodyGeo.attributes.position;
  for (let i = 0; i < cbPos.count; i++) {
    const cx = cbPos.getX(i);
    const pinchL = Math.exp(-Math.pow((cx + 0.036) / 0.012, 2.0)) * 0.14;
    const pinchR = Math.exp(-Math.pow((cx - 0.036) / 0.012, 2.0)) * 0.14;
    cbPos.setY(i, cbPos.getY(i) * (1.0 - pinchL - pinchR));
    cbPos.setZ(i, cbPos.getZ(i) * (1.0 - pinchL - pinchR));
  }
  catBodyGeo.computeVertexNormals();
  const catBody = new THREE.Mesh(catBodyGeo, materials.darkPolymer);
  catGroup.add(catBody);

  // Bandas elásticas de suspensión (Elastic Hammock Loops) abrazando el torniquete
  for (const elX of [-0.036, 0.036]) {
    const elPts: THREE.Vector3[] = [];
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      elPts.push(new THREE.Vector3(elX, 0.004 + Math.sin(a) * 0.021, Math.cos(a) * 0.019));
    }
    const elCurve = new THREE.CatmullRomCurve3(elPts, true);
    const elBand = new THREE.Mesh(
      createRoundedStrapGeometry(elCurve, 0.018, 0.004, 10, 24),
      materials.webbing
    );
    catGroup.add(elBand);
  }

  // Varilla del molinete (Windlass Rod) con puntas redondeadas y anillos de agarre
  const windlassRod = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.102, 8, 16), materials.darkPolymer);
  windlassRod.rotation.z = Math.PI / 2;
  windlassRod.position.set(0, 0, 0.022);
  catGroup.add(windlassRod);

  for (const gx of [-0.040, -0.030, 0.030, 0.040]) {
    const gripRing = new THREE.Mesh(new THREE.TorusGeometry(0.0054, 0.0012, 8, 16), materials.combatRubber);
    gripRing.rotation.y = Math.PI / 2;
    gripRing.position.set(gx, 0, 0.022);
    catGroup.add(gripRing);
  }

  // Lengüeta roja redondeada de tiempo (Red Time-Strap Tip)
  const redTipGeo = createOrganicPouchVolume(0.024, 0.032, 0.036, {
    roundnessXZ: 0.62,
    roundnessY: 0.56,
    pillowBulge: 0.08,
    wrinkleAmp: 0
  });
  const redTip = new THREE.Mesh(redTipGeo, materials.redTab);
  redTip.position.set(0.052, 0, 0.003);
  catGroup.add(redTip);

  // ====================================================================
  // 7. RADIO TÁCTICA AN/PRC-152A HARRIS (CON CHASIS CNC REDONDEADO),
  //    ANTENA WHIP, UNIDAD PTT NEXUS U-94 Y CABLES TRENZADOS
  // ====================================================================
  const radioGroup = new THREE.Group();
  // Montada en el flanco izquierdo (+X) o derecho (-X) con ángulo ergonómico limpio fuera de la culata del fusil
  radioGroup.position.set(-0.156, -0.028, 0.112);
  radioGroup.rotation.y = -0.48;
  vestGroup.add(radioGroup);

  // Pouch lateral de radio en Cordura con esquinas redondeadas y cordón elástico de retención
  const prcPouchGeo = createOrganicPouchVolume(0.074, 0.132, 0.052, {
    roundnessXZ: 0.56,
    roundnessY: 0.44,
    teardropSag: 0.06,
    pillowBulge: 0.14,
    pinchY: [{ y: 0.15, width: 0.30, depth: 0.05 }],
    wrinkleAmp: 0.0020
  });
  const prcPouch = new THREE.Mesh(prcPouchGeo, materials.corduraVest);
  prcPouch.position.y = -0.026;
  radioGroup.add(prcPouch);

  // Cuerpo de aluminio mecanizado de la radio Harris AN/PRC-152A con bordes redondeados y nervios de disipación
  const prcBodyGeo = createOrganicPouchVolume(0.064, 0.172, 0.044, {
    roundnessXZ: 0.48,
    roundnessY: 0.22,
    teardropSag: 0.0,
    pillowBulge: 0.04,
    wrinkleAmp: 0
  });
  const prcBody = new THREE.Mesh(prcBodyGeo, materials.gunmetal);
  radioGroup.add(prcBody);

  // Corona superior de control / Receptor GPS abombado de la PRC-152
  const prcTopCapGeo = createOrganicPouchVolume(0.068, 0.032, 0.048, {
    roundnessXZ: 0.56,
    roundnessY: 0.52,
    pillowBulge: 0.08,
    wrinkleAmp: 0
  });
  const prcTopCap = new THREE.Mesh(prcTopCapGeo, materials.darkPolymer);
  prcTopCap.position.y = 0.084;
  radioGroup.add(prcTopCap);

  // Conector superior TNC/BNC en latón, cuello de cisne flexible (Gooseneck) y Antena Whip Blade
  const antennaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0115, 0.032, 16), materials.brass);
  antennaBase.position.set(-0.016, 0.106, -0.008);
  radioGroup.add(antennaBase);

  const gooseneck = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.042, 8, 14), materials.combatRubber);
  gooseneck.position.set(-0.018, 0.134, -0.012);
  gooseneck.rotation.z = 0.12;
  gooseneck.rotation.x = -0.16;
  radioGroup.add(gooseneck);

  const antennaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.020, 0.152, -0.015),
    new THREE.Vector3(-0.032, 0.275, -0.042),
    new THREE.Vector3(-0.042, 0.395, -0.072)
  ]);
  const antenna = new THREE.Mesh(
    createRoundedStrapGeometry(antennaCurve, 0.013, 0.0038, 10, 24),
    materials.darkPolymer
  );
  radioGroup.add(antenna);

  // Unidad PTT Nexus U-94A/U esculpida con carcasa octogonal redondeada, clip metálico y botón protegido
  const pttGroup = new THREE.Group();
  pttGroup.position.set(-0.088, 0.118, 0.178);
  pttGroup.rotation.x = -0.08;
  pttGroup.rotation.y = -0.22;
  pttGroup.rotation.z = 0.12;
  vestGroup.add(pttGroup);

  const pttHousingGeo = createOrganicExtrude(createRoundedRectShape(0.044, 0.052, 0.014), 0.018, 0.004, 6, 18, 4);
  const pttHousing = new THREE.Mesh(pttHousingGeo, materials.darkPolymer);
  pttGroup.add(pttHousing);

  const pttBezel = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0032, 10, 20), materials.gunmetal);
  pttBezel.position.set(0, 0.004, 0.009);
  pttGroup.add(pttBezel);

  const pttButton = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.008, 16), materials.redTab);
  pttButton.rotation.x = Math.PI / 2;
  pttButton.position.set(0, 0.004, 0.009);
  pttGroup.add(pttButton);

  // Cable físico trenzado desde el puerto lateral de la PRC-152 hasta el PTT y subiendo hacia el casco
  const commCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.148, 0.048, 0.122),
    new THREE.Vector3(-0.132, 0.082, 0.168),
    new THREE.Vector3(-0.092, 0.104, 0.178),
    new THREE.Vector3(-0.088, 0.138, 0.172),
    new THREE.Vector3(-0.108, 0.214, 0.112),
    new THREE.Vector3(-0.092, 0.258, 0.048)
  ]);
  const commCable = new THREE.Mesh(
    new THREE.TubeGeometry(commCableCurve, 36, 0.0044, 10, false),
    materials.darkPolymer
  );
  vestGroup.add(commCable);

  // ====================================================================
  // 8. BARRAS QUÍMICAS CYALUME IR / ÁMBAR CON PRESILLAS Y MOSQUETÓN GRIMLOC
  // ====================================================================
  const chemMatAmber = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.12,
    clearcoat: 1.0
  });

  // Mosquetón táctico ITW Grimloc en polímero FDE enganchado al MOLLE derecho
  const grimlocCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.132, 0.008, 0.168),
    new THREE.Vector3(0.146, 0.012, 0.174),
    new THREE.Vector3(0.152, -0.006, 0.176),
    new THREE.Vector3(0.142, -0.022, 0.172),
    new THREE.Vector3(0.130, -0.016, 0.166)
  ], true);
  const grimloc = new THREE.Mesh(
    createRoundedStrapGeometry(grimlocCurve, 0.007, 0.005, 8, 20),
    materials.pmagFDE
  );
  vestGroup.add(grimloc);

  for (let c = 0; c < 3; c++) {
    const chemGroup = new THREE.Group();
    chemGroup.position.set(0.142 + c * 0.014, -0.056, 0.164 - c * 0.008);
    chemGroup.rotation.z = 0.14 + c * 0.06;
    chemGroup.rotation.y = -0.28;
    vestGroup.add(chemGroup);

    const chemlight = new THREE.Mesh(new THREE.CapsuleGeometry(0.0052, 0.102, 8, 14), chemMatAmber);
    chemGroup.add(chemlight);

    // Capuchón hexagonal superior y gancho de la barra Cyalume
    const chemCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0058, 0.018, 6), materials.darkPolymer);
    chemCap.position.y = 0.048;
    chemGroup.add(chemCap);

    // Presilla elástica que sujeta cada barra química al chaleco
    const chemLoop = new THREE.Mesh(new THREE.TorusGeometry(0.0065, 0.0022, 8, 16), materials.webbing);
    chemLoop.rotation.x = Math.PI / 2;
    chemLoop.position.y = 0.018;
    chemGroup.add(chemLoop);
  }

  // ====================================================================
  // 9. MOCHILA DE ASALTO CRYE PRECISION AVS 1000 / ZIP-ON 2.0 Y ASAS PORTANTES
  // ====================================================================
  buildDetailedAssaultPack(vestGroup, materials);
}
