import * as THREE from 'three';
import { MaterialLibrary } from '../types';
import {
  createOrganicExtrude,
  createRoundedRectShape,
} from '../geometry/organicGeometry';

/**
 * Genera una correa/panel textil o de TPU conformado a una superficie 3D sin torsión de Frenet.
 * El vector outwardHint define la normal hacia afuera de la superficie de la bota (espesor),
 * garantizando que el ancho (binormal) quede 100% apoyado sobre el empeine o la caña.
 */
function createConformalStrapGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  outwardHint:
    | THREE.Vector3
    | ((u: number, p: THREE.Vector3, tangent: THREE.Vector3) => THREE.Vector3),
  width: number,
  thickness: number,
  radialSegs = 12,
  tubularSegs = 32,
  taperEnds = true
): THREE.TubeGeometry {
  const geo = new THREE.TubeGeometry(curve, tubularSegs, 1.0, radialSegs, false);
  const pos = geo.attributes.position;
  const P = new THREE.Vector3();
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i <= tubularSegs; i++) {
    const u = i / tubularSegs;
    curve.getPointAt(u, P);
    curve.getTangentAt(u, T).normalize();

    const rawHint =
      typeof outwardHint === 'function' ? outwardHint(u, P, T) : outwardHint;
    N.copy(rawHint).addScaledVector(T, -rawHint.dot(T));
    if (N.lengthSq() < 1e-6) {
      N.set(0, 1, 0).addScaledVector(T, -T.y);
    }
    N.normalize();
    B.crossVectors(T, N).normalize();
    N.crossVectors(B, T).normalize();

    const endTaper = taperEnds
      ? u < 0.08
        ? 0.55 + 0.45 * (u / 0.08)
        : u > 0.92
          ? 0.55 + 0.45 * ((1.0 - u) / 0.08)
          : 1.0
      : 1.0;

    for (let j = 0; j <= radialSegs; j++) {
      const idx = i * (radialSegs + 1) + j;
      if (idx >= pos.count) continue;
      const angle = (j / radialSegs) * Math.PI * 2;
      const ca = -Math.cos(angle);
      const sa = Math.sin(angle);
      const rx = Math.sign(ca) * Math.pow(Math.abs(ca), 0.72) * (width * 0.5) * endTaper;
      const ry = Math.sign(sa) * Math.pow(Math.abs(sa), 0.75) * (thickness * 0.5) * endTaper;
      const wrapDrop = -Math.pow(rx / Math.max(0.001, width * 0.5), 2) * (thickness * 0.25);

      v.copy(P)
        .addScaledVector(N, ry + wrapDrop)
        .addScaledVector(B, rx);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Perfil anatómico asimétrico de horma táctica (Salomon Quest 4D GTX Forces 2 EN).
 * u ∈ [0, 1] recorre longitudinalmente desde el talón (zMin = -0.096) hasta la puntera (zMax = +0.212).
 */
function sampleBootLast(u: number): {
  z: number;
  wMedial: number;
  wLateral: number;
  soleY: number;
  archBridgeY: number;
  dorsalY: number;
} {
  const zMin = -0.096;
  const zMax = 0.212;
  const t = THREE.MathUtils.clamp(u, 0, 1);
  const z = THREE.MathUtils.lerp(zMin, zMax, t);

  // Tapering elíptico suave en talón (u->0) y puntera (u->1)
  const heelCap = t < 0.16 ? Math.sin((t / 0.16) * (Math.PI * 0.5)) : 1.0;
  const toeCap = t > 0.72 ? Math.cos(((t - 0.72) / 0.28) * (Math.PI * 0.5)) : 1.0;
  const endCap = Math.pow(Math.max(0.004, heelCap * toeCap), 0.66);

  // Arco plantar medial (se recoge en el mediopié u ≈ 0.39 y se abre en el metatarso u ≈ 0.68)
  const archIndent = Math.exp(-Math.pow((t - 0.39) / 0.13, 2)) * 0.010;
  const ballBulgeMedial = Math.exp(-Math.pow((t - 0.68) / 0.16, 2)) * 0.0095;
  const wMedial = (0.044 - archIndent + ballBulgeMedial) * endCap;

  // Flanco lateral exterior
  const lateralWaist = Math.exp(-Math.pow((t - 0.36) / 0.14, 2)) * 0.0035;
  const ballBulgeLateral = Math.exp(-Math.pow((t - 0.63) / 0.17, 2)) * 0.0088;
  const wLateral = (0.045 - lateralWaist + ballBulgeLateral) * endCap;

  // Toe spring (elevación progresiva de la puntera a partir del metatarso u > 0.58)
  const toeSpring = t > 0.58 ? Math.pow((t - 0.58) / 0.42, 1.85) * 0.0115 : 0.0;
  // Bisel de entrada en el talón posterior (Heel Strike Bevel)
  const heelBevel = t < 0.08 ? Math.pow((0.08 - t) / 0.08, 1.7) * 0.004 : 0.0;
  const soleY = toeSpring + heelBevel;

  // Puente del arco plantar (elevado bajo el mediopié u ∈ [0.28, 0.50])
  const archBridgeY = Math.exp(-Math.pow((t - 0.39) / 0.095, 2)) * 0.007;

  // Perfil dorsal anatómico: cúpula suave en la puntera + subida continua del empeine hacia el cuello
  const frontTipFactor = t > 0.82 ? Math.sin(((1.0 - t) / 0.18) * (Math.PI * 0.5)) : 1.0;
  const toeBoxHeight = 0.035 * Math.pow(Math.max(0.08, frontTipFactor), 0.52);
  const instepSlope =
    t < 0.74
      ? Math.sin(Math.min(1.0, (0.74 - t) / 0.54) * (Math.PI * 0.5)) * 0.052
      : 0.0;
  const rearHeelTaper = t < 0.12 ? Math.sin((t / 0.12) * (Math.PI * 0.5)) : 1.0;
  const dorsalY = -0.019 + soleY + (toeBoxHeight + instepSlope) * Math.pow(rearHeelTaper, 0.32);

  return { z, wMedial, wLateral, soleY, archBridgeY, dorsalY };
}

/**
 * Evalúa exactamente un punto (x, y, z) sobre la superficie del empeine/cuerpo de la bota
 * con planta plana montada sobre la entresuela (el ecuador de ancho máximo ny=0 apoya en la entresuela).
 */
function evaluateBootUpperPoint(
  side: number,
  u: number,
  nx: number,
  ny: number,
  radialOffset = 0.0,
  withFlexRipples = false
): THREE.Vector3 {
  const s = sampleBootLast(u);
  const isRightSide = nx >= 0;
  const halfW = isRightSide
    ? side === 1
      ? s.wLateral
      : s.wMedial
    : side === 1
      ? s.wMedial
      : s.wLateral;

  const domeHeight = Math.max(0, ny);
  const dorsalNarrowing = 1.0 - 0.16 * Math.pow(domeHeight, 1.55);

  // Pliegue suave de flexión exclusivamente en la cima dorsal del empeine (ny > 0.68)
  const flexRipple =
    withFlexRipples && ny > 0.68 && u > 0.56 && u < 0.76
      ? Math.sin((u - 0.56) * 32.0) *
        Math.exp(-Math.pow((u - 0.66) / 0.07, 2)) *
        Math.pow((ny - 0.68) / 0.32, 1.8) *
        0.0009
      : 0.0;

  const baseSoleY = -0.023 + s.soleY;
  const midsoleLipY = -0.0175 + s.soleY;
  const topY = s.dorsalY + radialOffset * 0.95 + flexRipple;

  const x = nx * (halfW + radialOffset) * dorsalNarrowing;
  const y =
    ny >= 0
      ? THREE.MathUtils.lerp(midsoleLipY, topY, Math.pow(ny, 0.78))
      : THREE.MathUtils.lerp(midsoleLipY, baseSoleY, Math.pow(-ny, 0.75));

  return new THREE.Vector3(x, y, s.z);
}

/**
 * Evalúa el semiancho exterior real de la caña (shaftGeo) en cualquier altura y y coordenada z
 * para que las bandas SensiFit™ y refuerzos envuelvan la caña sin hundirse en ella.
 */
function getShaftHalfWidthAt(side: number, flank: number, y: number, z: number): number {
  const v = THREE.MathUtils.clamp((y - -0.002) / (0.122 - -0.002), 0.0, 1.0);
  const zCenterShaft = -0.012 + v * 0.006;
  const dz = z - zCenterShaft;
  const rz = dz >= 0 ? 0.062 * (1.0 - 0.20 * v) : 0.072 * (1.0 - 0.22 * Math.pow(v, 0.75));
  const cosA = THREE.MathUtils.clamp(dz / Math.max(0.01, rz), -0.98, 0.98);
  const sinMag = Math.sqrt(Math.max(0.02, 1.0 - cosA * cosA));
  const ankleWaist = 1.0 - 0.075 * Math.sin(v * Math.PI) + 0.04 * Math.pow(v, 1.6);
  const rx = 0.0465 * ankleWaist * (1.0 + (flank * side > 0 ? 0.025 : -0.015));
  return sinMag * rx;
}

/**
 * Construye el contorno 2D en planta de la horma.
 * NOTA CRÍTICA: como luego aplicamos rotateX(-PI/2), la coordenada Y del Shape se transforma en Z_3D = -Y_shape.
 * Por tanto, asignamos Y_shape = zCenter - s.z para que el talón (s.z < zCenter) quede en Z_3D < 0 y la puntera en Z_3D > 0.
 */
function createAnatomicalFootShape(
  side: number,
  scaleOffset = 0.0,
  uStart = 0.0,
  uEnd = 1.0,
  samples = 34
): THREE.Shape {
  const pts: THREE.Vector2[] = [];
  const zCenter = 0.058;

  // Recorrido antihorario en plano (X, Y_shape) con Y_shape = zCenter - s.z
  for (let i = samples; i >= 0; i--) {
    const u = THREE.MathUtils.lerp(uStart, uEnd, i / samples);
    const s = sampleBootLast(u);
    const wRight = (side === 1 ? s.wLateral : s.wMedial) + scaleOffset;
    pts.push(new THREE.Vector2(Math.max(0.002, wRight), zCenter - s.z));
  }

  for (let i = 0; i <= samples; i++) {
    const u = THREE.MathUtils.lerp(uStart, uEnd, i / samples);
    const s = sampleBootLast(u);
    const wLeft = (side === 1 ? s.wMedial : s.wLateral) + scaleOffset;
    pts.push(new THREE.Vector2(-Math.max(0.002, wLeft), zCenter - s.z));
  }

  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, pts[i].y);
  }
  shape.closePath();
  return shape;
}

/**
 * Construye una Bota de Operaciones Especiales Salomon Quest 4D GTX Forces 2 EN fotorrealista.
 */
export function buildDetailedCombatBoot(side: number, materials: MaterialLibrary): THREE.Group {
  const boot = new THREE.Group();
  const zCenter = 0.058;

  // ============================================================================
  // 1. SUELA EXTERIOR CONTAGRIP® ANATÓMICA + TACOS BISELADOS INTEGRADOS
  // ============================================================================
  const outsoleShape = createAnatomicalFootShape(side, 0.0022, 0.0, 1.0, 34);
  const outsoleGeo = createOrganicExtrude(
    outsoleShape,
    0.012,
    0.003,
    5,
    24,
    6,
    (v) => {
      // Y_shape = zCenter - zWorld  =>  zWorld = zCenter - v.y
      const zWorld = zCenter - v.y;
      const u = (zWorld - -0.096) / (0.212 - -0.096);
      const s = sampleBootLast(u);
      const frontBumperRise =
        u > 0.89 && v.z > 0 ? Math.pow((u - 0.89) / 0.11, 1.8) * 0.014 : 0.0;
      v.z += s.soleY + s.archBridgeY * (v.z < 0 ? 1.15 : 0.65) + frontBumperRise;
    }
  );
  outsoleGeo.rotateX(-Math.PI * 0.5);
  const outsoleMesh = new THREE.Mesh(outsoleGeo, materials.combatRubber);
  outsoleMesh.position.set(0, -0.042, zCenter);
  boot.add(outsoleMesh);

  // Placa central rígida del puente de torsión (4D Torsion Shank Bridge) bajo el arco
  const shankShape = createAnatomicalFootShape(side, -0.005, 0.27, 0.50, 14);
  const shankGeo = createOrganicExtrude(shankShape, 0.007, 0.002, 4, 16, 2, (v) => {
    const zWorld = zCenter - v.y;
    const u = (zWorld - -0.096) / (0.212 - -0.096);
    const s = sampleBootLast(u);
    v.z += s.soleY + s.archBridgeY * 0.7;
  });
  shankGeo.rotateX(-Math.PI * 0.5);
  const shankMesh = new THREE.Mesh(shankGeo, materials.bootChassis);
  shankMesh.position.set(0, -0.040, zCenter);
  boot.add(shankMesh);

  // Tacos perimetrales trapezoidales Contagrip® integrados en la suela
  const perimLugGeo = createOrganicExtrude(
    createRoundedRectShape(0.015, 0.016, 0.0022),
    0.010,
    0.0016,
    3,
    10,
    2
  );
  perimLugGeo.rotateX(Math.PI * 0.5);

  const chevronLugGeo = createOrganicExtrude(
    createRoundedRectShape(0.022, 0.011, 0.002),
    0.009,
    0.0015,
    3,
    10,
    2
  );
  chevronLugGeo.rotateX(Math.PI * 0.5);

  const lugZones = [
    0.06, 0.125, 0.19, 0.255, // 4 pares de tacos de frenado en talón
    0.53, 0.60, 0.67, 0.74, 0.81, 0.88, // 6 pares de tacos de propulsión en antepié
  ];

  for (const u of lugZones) {
    const s = sampleBootLast(u);
    const sNext = sampleBootLast(Math.min(1, u + 0.03));
    const dz = sNext.z - s.z;
    const pitchAngle = -Math.atan2(sNext.soleY - s.soleY, dz);

    for (const flank of [-1, 1]) {
      const isLateral = flank === side;
      const halfW = isLateral ? s.wLateral : s.wMedial;
      const halfWNext = isLateral ? sNext.wLateral : sNext.wMedial;
      const tangentYaw = Math.atan2((halfWNext - halfW) * flank, dz);

      const lug = new THREE.Mesh(perimLugGeo, materials.combatRubber);
      lug.position.set(flank * (halfW - 0.005), -0.0452 + s.soleY, s.z);
      lug.rotation.set(pitchAngle, tangentYaw, flank * -0.04);
      boot.add(lug);
    }

    const isHeel = u < 0.35;
    for (const chSide of [-1, 1]) {
      const chev = new THREE.Mesh(chevronLugGeo, materials.combatRubber);
      const xOff = chSide * (isHeel ? 0.014 : 0.016);
      chev.position.set(xOff, -0.0458 + s.soleY, s.z);
      chev.rotation.set(pitchAngle, chSide * (isHeel ? -0.38 : 0.42), 0);
      boot.add(chev);
    }
  }

  // Tacos frontales de escalada integrados en el parachoques delantero (Toe Climbing Zone)
  const toeLugGeo = createOrganicExtrude(
    createRoundedRectShape(0.013, 0.014, 0.0022),
    0.0075,
    0.0016,
    3,
    10,
    2
  );
  for (let t = -2; t <= 2; t++) {
    const angle = t * 0.22;
    const sTip = sampleBootLast(0.968 - Math.abs(t) * 0.022);
    const radiusX = (sTip.wLateral + sTip.wMedial) * 0.5 + 0.001;
    const toeLug = new THREE.Mesh(toeLugGeo, materials.combatRubber);
    toeLug.position.set(
      Math.sin(angle) * radiusX * 0.88,
      -0.032 + sTip.soleY,
      sTip.z + Math.cos(angle) * 0.004
    );
    toeLug.rotation.set(0.48, angle, 0);
    boot.add(toeLug);
  }

  // ============================================================================
  // 2. ENTRESUELA EVA ENERGYCELL™ Y CHASIS 4D ADVANCED CHASSIS™ CONFORMADO
  // ============================================================================
  const midsoleShape = createAnatomicalFootShape(side, 0.0005, 0.0, 0.985, 34);
  const midsoleGeo = createOrganicExtrude(
    midsoleShape,
    0.019,
    0.0042,
    6,
    24,
    6,
    (v) => {
      const zWorld = zCenter - v.y;
      const u = (zWorld - -0.096) / (0.212 - -0.096);
      const s = sampleBootLast(u);
      const heelCradle = u < 0.34 && v.z > 0 ? Math.pow((0.34 - u) / 0.34, 1.5) * 0.0065 : 0.0;
      const foreTaper = u > 0.65 && v.z > 0 ? -((u - 0.65) / 0.35) * 0.005 : 0.0;
      const groove = Math.sin(v.z * 420.0 + u * 18.0) * 0.00045;
      v.x += Math.sign(v.x) * groove;
      v.z += s.soleY + heelCradle + foreTaper;
    }
  );
  midsoleGeo.rotateX(-Math.PI * 0.5);
  const midsoleMesh = new THREE.Mesh(midsoleGeo, materials.bootMidsole);
  midsoleMesh.position.set(0, -0.0285, zCenter);
  boot.add(midsoleMesh);

  // Chasis 4D de TPU moldeado: aletas curvas apoyadas exactamente contra el flanco de la entresuela
  for (const flank of [-1, 1]) {
    const isLateral = flank === side;
    const chassisPts: THREE.Vector3[] = [];
    const uSamples = [0.06, 0.16, 0.28, 0.40, 0.52, 0.64, 0.74];
    for (let i = 0; i < uSamples.length; i++) {
      const u = uSamples[i];
      const s = sampleBootLast(u);
      const halfW = (isLateral ? s.wLateral : s.wMedial) + 0.0012;
      const waveY =
        -0.022 +
        s.soleY +
        (u < 0.28 ? 0.006 : 0.0) +
        Math.sin(((u - 0.06) / 0.68) * Math.PI * 2.0) * 0.0038;
      chassisPts.push(new THREE.Vector3(flank * halfW, waveY, s.z));
    }
    const chassisCurve = new THREE.CatmullRomCurve3(chassisPts);
    const chassisWingGeo = createConformalStrapGeometry(
      chassisCurve,
      new THREE.Vector3(flank, 0.12, 0).normalize(),
      0.011,
      0.0042,
      10,
      28,
      true
    );
    boot.add(new THREE.Mesh(chassisWingGeo, materials.bootChassis));

    const sHeelRear = sampleBootLast(0.08);
    const sHeelMid = sampleBootLast(0.20);
    const sHeelFront = sampleBootLast(0.32);
    const wRear = (isLateral ? sHeelRear.wLateral : sHeelRear.wMedial) + 0.0012;
    const wMid = (isLateral ? sHeelMid.wLateral : sHeelMid.wMedial) + 0.0016;
    const wFront = (isLateral ? sHeelFront.wLateral : sHeelFront.wMedial) + 0.0012;

    const heelStrutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(flank * (wRear * 0.92), 0.004, sHeelRear.z + 0.003),
      new THREE.Vector3(flank * wMid, -0.007, sHeelMid.z),
      new THREE.Vector3(flank * wFront, -0.019, sHeelFront.z),
    ]);
    const heelStrutGeo = createConformalStrapGeometry(
      heelStrutCurve,
      new THREE.Vector3(flank, 0.15, -0.15).normalize(),
      0.010,
      0.0042,
      10,
      16,
      true
    );
    boot.add(new THREE.Mesh(heelStrutGeo, materials.bootChassis));
  }

  // ============================================================================
  // 3. CUERPO SUPERIOR ANATÓMICO CERRADO (CORDURA® + SILLA DE EMPEINE EN ANTE)
  // ============================================================================
  const vampGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 44, 30, false);
  vampGeo.rotateX(Math.PI * 0.5);
  const vampPos = vampGeo.attributes.position;
  const vTmp = new THREE.Vector3();

  for (let i = 0; i < vampPos.count; i++) {
    vTmp.fromBufferAttribute(vampPos, i);
    const r = Math.hypot(vTmp.x, vTmp.y);
    const nx = r > 1e-5 ? vTmp.x / r : 0.0;
    const ny = r > 1e-5 ? vTmp.y / r : 0.0;

    const rawT = THREE.MathUtils.clamp(vTmp.z + 0.5, 0.0, 1.0);
    const capRound = (1.0 - Math.sqrt(Math.max(0.0, 1.0 - r * r))) * 0.025;
    const u =
      rawT > 0.98
        ? 0.985 - (1.0 - r) * 0.012
        : rawT < 0.02
          ? 0.012 + (1.0 - r) * 0.012
          : THREE.MathUtils.lerp(0.012, 0.985, rawT) - Math.sign(rawT - 0.5) * capRound * 0.15;

    const surfPt = evaluateBootUpperPoint(side, u, nx, ny, 0.0, true);
    const s = sampleBootLast(u);
    const midY = -0.0175 + s.soleY;

    const x = surfPt.x * r;
    const y = THREE.MathUtils.lerp(midY, surfPt.y, r);
    vampPos.setXYZ(i, x, y, surfPt.z);
  }
  vampGeo.computeVertexNormals();
  const vampMesh = new THREE.Mesh(vampGeo, materials.bootMesh);
  boot.add(vampMesh);

  // 3B. Empeine delantero de ante Nubuck (Forefoot Suede Vamp Saddle, u ∈ [0.54, 0.80])
  const suedeVampGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 40, 18, false);
  suedeVampGeo.rotateX(Math.PI * 0.5);
  const svPos = suedeVampGeo.attributes.position;
  for (let i = 0; i < svPos.count; i++) {
    vTmp.fromBufferAttribute(svPos, i);
    const rawT = THREE.MathUtils.clamp(vTmp.z + 0.5, 0.0, 1.0);
    const r = Math.hypot(vTmp.x, vTmp.y);
    const nx = r > 1e-5 ? vTmp.x / r : 0.0;
    const ny = r > 1e-5 ? vTmp.y / r : 0.0;

    const uBack = 0.55 - 0.03 * (1.0 - Math.max(0, ny));
    const uFront = 0.78;
    const u = THREE.MathUtils.lerp(uBack, uFront, rawT);

    const edgeFade =
      rawT < 0.10
        ? Math.sin((rawT / 0.10) * (Math.PI * 0.5))
        : rawT > 0.90
          ? Math.sin(((1.0 - rawT) / 0.10) * (Math.PI * 0.5))
          : 1.0;
    const suedeOffset = 0.0014 * edgeFade;

    const surfPt = evaluateBootUpperPoint(side, u, nx, ny, suedeOffset, true);
    const s = sampleBootLast(u);
    const midY = -0.0175 + s.soleY;

    svPos.setXYZ(i, surfPt.x * r, THREE.MathUtils.lerp(midY, surfPt.y, r), surfPt.z);
  }
  suedeVampGeo.computeVertexNormals();
  boot.add(new THREE.Mesh(suedeVampGeo, materials.bootSuede));

  // 3C. Caña táctica de 8 pulgadas (Shaft) integrada de forma continua con el retropié
  const shaftGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 40, 24, false);
  const shaftPos = shaftGeo.attributes.position;
  for (let i = 0; i < shaftPos.count; i++) {
    vTmp.fromBufferAttribute(shaftPos, i);
    const v = THREE.MathUtils.clamp(vTmp.y + 0.5, 0.0, 1.0);
    const r = Math.hypot(vTmp.x, vTmp.z);
    const sinA = r > 1e-5 ? vTmp.x / r : 0.0;
    const cosA = r > 1e-5 ? vTmp.z / r : 0.0;
    const angle = Math.atan2(sinA, cosA);

    const ankleWaist = 1.0 - 0.075 * Math.sin(v * Math.PI) + 0.04 * Math.pow(v, 1.6);
    const wrinkle =
      Math.sin(v * 18.0 + Math.cos(angle * 3.0)) * 0.0008 +
      Math.cos(angle * 6.0 + v * 10.0) * 0.0004;

    const rx = (0.0465 * ankleWaist + wrinkle) * (1.0 + (sinA * side > 0 ? 0.025 : -0.015));
    const rzFront = 0.062 * (1.0 - 0.20 * v) + wrinkle;
    const rzRear = 0.072 * (1.0 - 0.22 * Math.pow(v, 0.75)) + wrinkle;

    const x = sinA * rx * r;
    const achillesDip =
      cosA < -0.2 && v > 0.7
        ? Math.pow((-cosA - 0.2) / 0.8, 1.5) * (v - 0.7) * 0.022
        : 0.0;
    const y = THREE.MathUtils.lerp(-0.002, 0.122, v) - achillesDip;
    const zCenterShaft = -0.012 + v * 0.006;
    const z = zCenterShaft + (cosA >= 0 ? cosA * rzFront : cosA * rzRear) * r;

    shaftPos.setXYZ(i, x, y, z);
  }
  shaftGeo.computeVertexNormals();
  const shaftMesh = new THREE.Mesh(shaftGeo, materials.bootMesh);
  boot.add(shaftMesh);

  // ============================================================================
  // 4. PUNTERA Y CONTRAFUERTE DE CAUCHO VULCANIZADO CONFORMADOS A LA HORMA
  // ============================================================================
  const toeCapGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 40, 18, false);
  toeCapGeo.rotateX(Math.PI * 0.5);
  const toePos = toeCapGeo.attributes.position;
  for (let i = 0; i < toePos.count; i++) {
    vTmp.fromBufferAttribute(toePos, i);
    const rawT = THREE.MathUtils.clamp(vTmp.z + 0.5, 0.0, 1.0);
    const r = Math.hypot(vTmp.x, vTmp.y);
    const nx = r > 1e-5 ? vTmp.x / r : 0.0;
    const ny = r > 1e-5 ? vTmp.y / r : 0.0;

    const uStart = 0.735 + 0.038 * Math.pow(Math.max(0, ny), 1.3);
    const tCap =
      rawT > 0.98
        ? 0.985 + 0.013 * Math.sqrt(Math.max(0, 1.0 - (1.0 - r) * 0.4))
        : rawT * 0.985;
    const u = THREE.MathUtils.lerp(uStart, 0.996, tCap);

    const lipTaper = tCap < 0.12 ? Math.sin((tCap / 0.12) * (Math.PI * 0.5)) : 1.0;
    const frontRib =
      u > 0.89 && ny > -0.15
        ? Math.cos(nx * 24.0) * Math.pow((u - 0.89) / 0.11, 1.5) * 0.0008
        : 0.0;
    const rubberOffset = 0.0024 * lipTaper + frontRib;

    const surfPt = evaluateBootUpperPoint(side, u, nx, ny, rubberOffset, false);
    const s = sampleBootLast(u);
    const midY = -0.0175 + s.soleY;

    const x = surfPt.x * r;
    const y = THREE.MathUtils.lerp(midY, surfPt.y, r);
    const z = surfPt.z + (u > 0.92 ? rubberOffset * 0.65 * r : 0);

    toePos.setXYZ(i, x, y, z);
  }
  toeCapGeo.computeVertexNormals();
  const toeCapMesh = new THREE.Mesh(toeCapGeo, materials.combatRubber);
  boot.add(toeCapMesh);

  // 4B. Contrafuerte trasero del talón termomoldeado (Molded Rubber Heel Counter)
  const heelCupGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 38, 16, false);
  heelCupGeo.rotateX(Math.PI * 0.5);
  const heelPos = heelCupGeo.attributes.position;
  for (let i = 0; i < heelPos.count; i++) {
    vTmp.fromBufferAttribute(heelPos, i);
    const rawT = THREE.MathUtils.clamp(vTmp.z + 0.5, 0.0, 1.0);
    const r = Math.hypot(vTmp.x, vTmp.y);
    const nx = r > 1e-5 ? vTmp.x / r : 0.0;
    const ny = r > 1e-5 ? vTmp.y / r : 0.0;

    const uEnd = 0.28 - 0.045 * Math.max(0, ny);
    const u = THREE.MathUtils.lerp(0.006, uEnd, rawT);
    const s = sampleBootLast(u);

    const isRightSide = nx >= 0;
    const halfW = isRightSide
      ? side === 1
        ? s.wLateral
        : s.wMedial
      : side === 1
        ? s.wMedial
        : s.wLateral;

    const edgeTaper = rawT > 0.82 ? Math.cos(((rawT - 0.82) / 0.18) * (Math.PI * 0.5)) : 1.0;
    const rubberOffset = 0.0024 * edgeTaper;

    const cupTopY = THREE.MathUtils.lerp(0.042, 0.012, Math.pow(rawT, 0.85));
    const baseSoleY = -0.022 + s.soleY;
    const midY = -0.0175 + s.soleY;
    const wallX = nx * (halfW + rubberOffset) * (ny > 0 ? 1.0 - 0.08 * ny : 1.0);
    const wallY =
      ny >= 0
        ? THREE.MathUtils.lerp(midY, cupTopY, Math.pow(ny, 0.74))
        : THREE.MathUtils.lerp(midY, baseSoleY, Math.pow(-ny, 0.72));

    const x = wallX * r;
    const y = THREE.MathUtils.lerp(midY, wallY, r);
    const z = s.z - (u < 0.06 ? rubberOffset * 0.65 * r : 0);

    heelPos.setXYZ(i, x, y, z);
  }
  heelCupGeo.computeVertexNormals();
  const heelCupMesh = new THREE.Mesh(heelCupGeo, materials.combatRubber);
  boot.add(heelCupMesh);

  // Estrías horizontales de descalce en el talón (Heel Kick-Off Ridges)
  for (let r = 0; r < 3; r++) {
    const yRib = -0.009 + r * 0.009;
    const sRear = sampleBootLast(0.022 + r * 0.010);
    const wRear = (sRear.wLateral + sRear.wMedial) * 0.44;
    const ribCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-wRear * 0.68, yRib, sRear.z + 0.007),
      new THREE.Vector3(-wRear * 0.35, yRib, sRear.z - 0.001),
      new THREE.Vector3(0, yRib, sRear.z - 0.0032),
      new THREE.Vector3(wRear * 0.35, yRib, sRear.z - 0.001),
      new THREE.Vector3(wRear * 0.68, yRib, sRear.z + 0.007),
    ]);
    const ribGeo = createConformalStrapGeometry(
      ribCurve,
      new THREE.Vector3(0, 0, -1),
      0.004,
      0.0028,
      8,
      16,
      true
    );
    boot.add(new THREE.Mesh(ribGeo, materials.bootChassis));
  }

  // ============================================================================
  // 5. SISTEMA DE SUJECIÓN SENSIFIT™ EN ANTE CON RELIEVE 3D Y PESPUNTES
  // ============================================================================
  // Función auxiliar que devuelve el punto sobre la envolvente externa (máximo entre empeine y caña)
  const evaluateOuterEnvelopePoint = (
    flank: number,
    u: number,
    ny: number,
    extraOutward: number
  ): THREE.Vector3 => {
    const nx = flank * Math.sqrt(Math.max(0.04, 1.0 - ny * ny));
    const pVamp = evaluateBootUpperPoint(side, u, nx, ny, extraOutward, false);
    const shaftW = getShaftHalfWidthAt(side, flank, pVamp.y, pVamp.z) + extraOutward;
    if (Math.abs(pVamp.x) < shaftW && pVamp.z < 0.055) {
      pVamp.x = flank * shaftW;
    }
    return pVamp;
  };

  for (const flank of [-1, 1]) {
    const flankNormal = new THREE.Vector3(flank, 0.22, 0.08).normalize();

    // 5A. Guardabarros lateral de ante (Mudguard / Quarter Rand Overlay)
    const randPts: THREE.Vector3[] = [];
    const randStitchPts: THREE.Vector3[] = [];
    for (const u of [0.24, 0.35, 0.46, 0.57, 0.67, 0.745]) {
      randPts.push(evaluateOuterEnvelopePoint(flank, u, 0.14, 0.0024));
      randStitchPts.push(evaluateOuterEnvelopePoint(flank, u, 0.25, 0.0034));
    }
    const randCurve = new THREE.CatmullRomCurve3(randPts);
    const randGeo = createConformalStrapGeometry(
      randCurve,
      flankNormal,
      0.015,
      0.0036,
      10,
      24,
      true
    );
    boot.add(new THREE.Mesh(randGeo, materials.bootSuede));

    const randStitchGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(randStitchPts),
      20,
      0.00072,
      6,
      false
    );
    boot.add(new THREE.Mesh(randStitchGeo, materials.stitchThread));

    // 5B. Ala delantera SensiFit™ en ante Nubuck sobre la envolvente exterior
    const frontSamples = [
      { u: 0.56, ny: 0.08 },
      { u: 0.55, ny: 0.36 },
      { u: 0.53, ny: 0.64 },
      { u: 0.51, ny: 0.88 },
    ];
    const frontWingPts = frontSamples.map(({ u, ny }) =>
      evaluateOuterEnvelopePoint(flank, u, ny, 0.0032)
    );
    const frontWingCurve = new THREE.CatmullRomCurve3(frontWingPts);
    const frontWingGeo = createConformalStrapGeometry(
      frontWingCurve,
      (_u, p) => new THREE.Vector3(flank * 0.86, 0.46, p.z > 0.07 ? 0.22 : 0.10).normalize(),
      0.019,
      0.0042,
      10,
      22,
      true
    );
    boot.add(new THREE.Mesh(frontWingGeo, materials.bootSuede));

    for (const uDelta of [-0.025, 0.025]) {
      const stitchPts = frontSamples.map(({ u, ny }) =>
        evaluateOuterEnvelopePoint(flank, u + uDelta, ny, 0.0040)
      );
      const stitchGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(stitchPts),
        18,
        0.00068,
        6,
        false
      );
      boot.add(new THREE.Mesh(stitchGeo, materials.stitchThread));
    }

    // 5C. Ala trasera de bloqueo de talón y tobillo (Heel-Lock SensiFit™ Strap)
    const rearSamples = [
      { u: 0.31, ny: 0.10 },
      { u: 0.34, ny: 0.42 },
      { u: 0.38, ny: 0.72 },
      { u: 0.43, ny: 0.90 },
    ];
    const rearWingPts = rearSamples.map(({ u, ny }) =>
      evaluateOuterEnvelopePoint(flank, u, ny, 0.0032)
    );
    rearWingPts.push(new THREE.Vector3(flank * 0.029, 0.086, 0.046));

    const rearWingCurve = new THREE.CatmullRomCurve3(rearWingPts);
    const rearWingGeo = createConformalStrapGeometry(
      rearWingCurve,
      new THREE.Vector3(flank * 0.90, 0.32, 0.18).normalize(),
      0.020,
      0.0042,
      10,
      24,
      true
    );
    boot.add(new THREE.Mesh(rearWingGeo, materials.bootSuede));

    for (const uDelta of [-0.025, 0.025]) {
      const rStitchPts = rearSamples.map(({ u, ny }) =>
        evaluateOuterEnvelopePoint(flank, u + uDelta, ny, 0.0040)
      );
      rStitchPts.push(new THREE.Vector3(flank * 0.030, 0.086, 0.046 + uDelta * 0.25));
      const rStitchGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(rStitchPts),
        18,
        0.00068,
        6,
        false
      );
      boot.add(new THREE.Mesh(rStitchGeo, materials.stitchThread));
    }

    // Banda superior de refuerzo en ante alrededor de la caña superior
    const ankleCollarStrap = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.090, -0.068),
      new THREE.Vector3(flank * 0.034, 0.091, -0.046),
      new THREE.Vector3(flank * 0.046, 0.094, -0.006),
      new THREE.Vector3(flank * 0.028, 0.100, 0.038),
    ]);
    const collarStrapGeo = createConformalStrapGeometry(
      ankleCollarStrap,
      (_u, p) => new THREE.Vector3(p.x, 0.06, p.z + 0.010).normalize(),
      0.016,
      0.0034,
      10,
      20,
      true
    );
    boot.add(new THREE.Mesh(collarStrapGeo, materials.bootSuede));

    // 5D. Protector maleolar anatómico integrado al ras de la caña
    const isLateral = flank === side;
    const malleolusY = isLateral ? 0.056 : 0.064;
    const malleolusZ = isLateral ? -0.016 : -0.008;
    const anklePad = new THREE.Mesh(new THREE.SphereGeometry(0.0165, 18, 14), materials.bootChassis);
    anklePad.scale.set(0.24, 1.15, 1.02);
    anklePad.position.set(flank * 0.045, malleolusY, malleolusZ);
    anklePad.rotation.y = flank * -0.14;
    boot.add(anklePad);
  }

  // Columna vertical posterior de ante en el tendón de Aquiles + Tirador textil (Achilles Spine & Pull Loop)
  const achillesSpineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.034, -0.088),
    new THREE.Vector3(0, 0.068, -0.074),
    new THREE.Vector3(0, 0.112, -0.065),
  ]);
  const achillesSpineGeo = createConformalStrapGeometry(
    achillesSpineCurve,
    new THREE.Vector3(0, 0.15, -1).normalize(),
    0.019,
    0.0038,
    10,
    16,
    true
  );
  boot.add(new THREE.Mesh(achillesSpineGeo, materials.bootSuede));

  // Tirador trasero en cinta tejida (Webbing Heel Pull Loop)
  const pullLoopCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.104, -0.066),
    new THREE.Vector3(0, 0.115, -0.080),
    new THREE.Vector3(0, 0.127, -0.077),
    new THREE.Vector3(0, 0.116, -0.064),
  ]);
  const pullLoopGeo = createConformalStrapGeometry(
    pullLoopCurve,
    new THREE.Vector3(0, 0.2, -1).normalize(),
    0.011,
    0.0026,
    8,
    18,
    false
  );
  boot.add(new THREE.Mesh(pullLoopGeo, materials.webbing));

  // Etiqueta tejida de bajo perfil GORE-TEX® en el flanco exterior (+side) junto a la solapa de ojetes
  const gtxTabGeo = createOrganicExtrude(
    createRoundedRectShape(0.011, 0.0048, 0.001),
    0.002,
    0.0004,
    3,
    8,
    1
  );
  const gtxTab = new THREE.Mesh(gtxTabGeo, materials.patchMat);
  gtxTab.position.set(side * 0.034, 0.065, 0.050);
  gtxTab.rotation.set(-0.42, side * 0.35, 0);
  boot.add(gtxTab);

  const gtxAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.0075, 0.0015, 0.0022),
    materials.fdeAnodized
  );
  gtxAccent.position.set(side * 0.0345, 0.065, 0.0504);
  gtxAccent.rotation.copy(gtxTab.rotation);
  boot.add(gtxAccent);

  // ============================================================================
  // 6. COLLARÍN ESCOTADO ERGONÓMICO, LENGÜETA FUELLE Y CORDONES PARACORD 3D
  // ============================================================================
  const collarPts: THREE.Vector3[] = [];
  const collarSamples = 28;
  for (let i = 0; i <= collarSamples; i++) {
    const theta = -Math.PI * 0.18 + (i / collarSamples) * (Math.PI * 1.36);
    const angleFromBack = theta - Math.PI * 0.5;
    const x = Math.sin(angleFromBack) * 0.046;
    const z = -0.006 - Math.cos(angleFromBack) * 0.054;
    const achillesScoop = Math.exp(-Math.pow(angleFromBack / 0.55, 2)) * 0.011;
    const y = 0.123 - achillesScoop;
    collarPts.push(new THREE.Vector3(x, y, z));
  }
  const collarCurve = new THREE.CatmullRomCurve3(collarPts);
  const collarRimGeo = createConformalStrapGeometry(
    collarCurve,
    (_u, p) => new THREE.Vector3(p.x, 0.35, p.z + 0.006).normalize(),
    0.015,
    0.011,
    12,
    32,
    true
  );
  boot.add(new THREE.Mesh(collarRimGeo, materials.bootChassis));

  const innerLinerPts = collarPts.map(
    (p) => new THREE.Vector3(p.x * 0.88, p.y + 0.002, p.z * 0.90)
  );
  const innerLinerGeo = createConformalStrapGeometry(
    new THREE.CatmullRomCurve3(innerLinerPts),
    (_u, p) => new THREE.Vector3(p.x, 0.45, p.z + 0.006).normalize(),
    0.011,
    0.0085,
    10,
    28,
    true
  );
  boot.add(new THREE.Mesh(innerLinerGeo, materials.bootMesh));

  // 6B. Lengüeta fuelle acolchada (Gusseted Baffled Tongue) + Bolsillo Lace Garage
  const tongueCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.024, 0.116),
    new THREE.Vector3(0, 0.050, 0.084),
    new THREE.Vector3(0, 0.084, 0.056),
    new THREE.Vector3(0, 0.120, 0.042),
  ]);
  const tongueGeo = createConformalStrapGeometry(
    tongueCurve,
    new THREE.Vector3(0, 0.55, 0.83).normalize(),
    0.040,
    0.010,
    12,
    24,
    false
  );
  boot.add(new THREE.Mesh(tongueGeo, materials.bootMesh));

  for (let b = 0; b < 4; b++) {
    const tb = 0.18 + b * 0.18;
    const pMid = tongueCurve.getPointAt(tb);
    const baffleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.016, pMid.y - 0.0015, pMid.z + 0.0015),
      new THREE.Vector3(0, pMid.y + 0.001, pMid.z + 0.0055),
      new THREE.Vector3(0.016, pMid.y - 0.0015, pMid.z + 0.0015),
    ]);
    const baffleGeo = createConformalStrapGeometry(
      baffleCurve,
      new THREE.Vector3(0, 0.55, 0.83).normalize(),
      0.010,
      0.004,
      8,
      12,
      true
    );
    boot.add(new THREE.Mesh(baffleGeo, materials.bootMesh));
  }

  const garageShape = createRoundedRectShape(0.036, 0.026, 0.005);
  const garageGeo = createOrganicExtrude(garageShape, 0.0065, 0.0018, 4, 12, 2, (v) => {
    v.z -= Math.pow(v.x / 0.018, 2) * 0.003;
  });
  const laceGarage = new THREE.Mesh(garageGeo, materials.bootSuede);
  laceGarage.position.set(0, 0.110, 0.047);
  laceGarage.rotation.x = -0.28;
  boot.add(laceGarage);

  const tonguePatch = new THREE.Mesh(
    createOrganicExtrude(createRoundedRectShape(0.022, 0.012, 0.002), 0.0022, 0.0005, 3, 8, 1),
    materials.patchMat
  );
  tonguePatch.position.set(0, 0.111, 0.051);
  tonguePatch.rotation.x = -0.28;
  boot.add(tonguePatch);

  // 6C. Solapas curvas de los ojetes (Conformal Suede Eyestay Facings)
  const eyeletCoords: Array<{ y: number; z: number; x: number; pitch: number }> = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const pTongue = tongueCurve.getPointAt(0.05 + t * 0.82);
    const xHalf = 0.023 - Math.sin(t * Math.PI) * 0.002;
    const pitch = -0.66 + t * 0.42;
    eyeletCoords.push({
      y: pTongue.y + 0.002,
      z: pTongue.z + 0.003,
      x: xHalf,
      pitch,
    });
  }

  for (const s of [-1, 1]) {
    const eyestayPts = eyeletCoords.map(
      (c) => new THREE.Vector3(s * (c.x + 0.0035), c.y - 0.001, c.z - 0.0015)
    );
    const eyestayCurve = new THREE.CatmullRomCurve3(eyestayPts);
    const eyestayGeo = createConformalStrapGeometry(
      eyestayCurve,
      new THREE.Vector3(s * 0.42, 0.52, 0.74).normalize(),
      0.015,
      0.0045,
      10,
      24,
      true
    );
    boot.add(new THREE.Mesh(eyestayGeo, materials.bootSuede));

    const eyeStitchPts = eyeletCoords.map(
      (c) => new THREE.Vector3(s * (c.x + 0.009), c.y - 0.0015, c.z - 0.003)
    );
    const eyeStitchGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(eyeStitchPts),
      20,
      0.00068,
      6,
      false
    );
    boot.add(new THREE.Mesh(eyeStitchGeo, materials.stitchThread));
  }

  // 6D. 7 Pares de Pasadores Metálicos Cerrados Antienredos (Closed Tactical Speed-Hooks & Eyelets)
  const hookBaseGeo = createOrganicExtrude(
    createRoundedRectShape(0.008, 0.009, 0.0022),
    0.0042,
    0.001,
    3,
    8,
    1
  );
  const hookRingGeo = new THREE.TorusGeometry(0.0034, 0.0012, 8, 14);
  const rivetGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.005, 10);

  for (let i = 0; i < eyeletCoords.length; i++) {
    const c = eyeletCoords[i];
    for (const s of [-1, 1]) {
      const hookGroup = new THREE.Group();
      hookGroup.position.set(s * c.x, c.y, c.z);
      hookGroup.rotation.set(c.pitch, s * 0.18, s * -0.12);

      const baseMesh = new THREE.Mesh(hookBaseGeo, materials.gunmetal);
      hookGroup.add(baseMesh);

      const ringMesh = new THREE.Mesh(hookRingGeo, materials.gunmetal);
      ringMesh.position.set(s * -0.0024, 0.001, 0.0024);
      ringMesh.rotation.y = Math.PI * 0.35 * s;
      hookGroup.add(ringMesh);

      const rivetMesh = new THREE.Mesh(rivetGeo, materials.boltSteel);
      rivetMesh.rotation.x = Math.PI * 0.5;
      rivetMesh.position.set(s * 0.002, -0.001, 0.0005);
      hookGroup.add(rivetMesh);

      boot.add(hookGroup);
    }
  }

  // 6E. Sistema de Cordones Paracord 550 tejidos en curvas 3D
  const firstEye = eyeletCoords[0];
  const bottomBarCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-firstEye.x + 0.002, firstEye.y, firstEye.z + 0.003),
    new THREE.Vector3(0, firstEye.y + 0.0022, firstEye.z + 0.006),
    new THREE.Vector3(firstEye.x - 0.002, firstEye.y, firstEye.z + 0.003),
  ]);
  boot.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(bottomBarCurve, 14, 0.0027, 8, false),
      materials.bootLaces
    )
  );

  for (let i = 0; i < 6; i++) {
    const curr = eyeletCoords[i];
    const next = eyeletCoords[i + 1];

    for (const dir of [-1, 1]) {
      const pStart = new THREE.Vector3(dir * (curr.x - 0.002), curr.y, curr.z + 0.003);
      const pEnd = new THREE.Vector3(-dir * (next.x - 0.002), next.y, next.z + 0.003);

      const overUnder = dir > 0 ? 0.0025 : 0.0002;
      const pMid1 = new THREE.Vector3()
        .lerpVectors(pStart, pEnd, 0.33)
        .add(new THREE.Vector3(0, 0.0016, 0.0036 + overUnder * 0.5));
      const pMid2 = new THREE.Vector3()
        .lerpVectors(pStart, pEnd, 0.67)
        .add(new THREE.Vector3(0, 0.0016, 0.0036 + overUnder));

      const laceCurve = new THREE.CatmullRomCurve3([pStart, pMid1, pMid2, pEnd]);
      const laceGeo = new THREE.TubeGeometry(laceCurve, 16, 0.0026, 8, false);
      boot.add(new THREE.Mesh(laceGeo, materials.bootLaces));
    }
  }

  const topEye = eyeletCoords[6];
  const topLockCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-topEye.x + 0.002, topEye.y, topEye.z + 0.003),
    new THREE.Vector3(0, topEye.y + 0.0015, topEye.z + 0.0065),
    new THREE.Vector3(topEye.x - 0.002, topEye.y, topEye.z + 0.003),
  ]);
  boot.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(topLockCurve, 12, 0.0027, 8, false),
      materials.bootLaces
    )
  );

  const knotCore = new THREE.Mesh(new THREE.SphereGeometry(0.0044, 12, 10), materials.bootLaces);
  knotCore.scale.set(1.25, 0.95, 0.85);
  knotCore.position.set(0, topEye.y + 0.002, topEye.z + 0.0072);
  boot.add(knotCore);

  for (const loopSide of [-1, 1]) {
    const loopCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, topEye.y + 0.002, topEye.z + 0.0072),
        new THREE.Vector3(loopSide * 0.010, topEye.y + 0.0055, topEye.z + 0.008),
        new THREE.Vector3(loopSide * 0.013, topEye.y + 0.001, topEye.z + 0.005),
        new THREE.Vector3(loopSide * 0.005, topEye.y - 0.001, topEye.z + 0.006),
      ],
      true
    );
    const loopGeo = new THREE.TubeGeometry(loopCurve, 18, 0.0023, 8, true);
    boot.add(new THREE.Mesh(loopGeo, materials.bootLaces));
  }

  return boot;
}
