import * as THREE from 'three';
import { MaterialLibrary, OperatorSkeleton } from '../types';
import {
  sculptClothFolds,
  createRoundedRectShape,
  createOrganicExtrude,
  createOrganicPouchVolume,
  createRoundedStrapGeometry
} from '../geometry/organicGeometry';
import { buildDetailedTacticalBelt } from './buildDetailedTacticalBelt';
import { buildDetailedCombatBoot } from './buildDetailedCombatBoot';

export function buildLowerBody(materials: MaterialLibrary, skeleton: OperatorSkeleton): void {
  // Pelvis / Tiro del pantalón Crye G3 esculpido con ensanche anatómico de caderas (trocánteres),
  // bifurcación en perneras para alojar los muslos, arco de tiro en entrepierna y bragueta frontal reforzada
  const rawPelvisGeo = new THREE.CylinderGeometry(0.190, 0.208, 0.235, 48, 28);
  const pPos = rawPelvisGeo.attributes.position;
  for (let i = 0; i < pPos.count; i++) {
    const px = pPos.getX(i);
    const py = pPos.getY(i);
    const pz = pPos.getZ(i);
    const ny = py / 0.1175; // -1 (raíces de muslo/entrepierna) a +1 (cintura)
    const nx = px / 0.200;

    // 1. Ensanche anatómico de caderas en crestas ilíacas y trocánteres mayores (|nx| > 0.35)
    // Se expande X para contener holgadamente el perímetro de ambos muslos (evita bordes salientes)
    const hipOutseam = Math.pow(Math.abs(nx), 1.5) * (1.0 - ny * 0.42) * 0.038;
    const hipFlareX = px + Math.sign(px) * hipOutseam;

    // 2. Bifurcación anatómica de perneras (Leg Root Sockets):
    // En el centro (|px| < 0.065), el tiro sube en silla de montar (+Y) hasta +0.042m formando el arco de entrepierna.
    // Bajo los ejes de los muslos (|px| entre 0.08 y 0.18), la tela desciende (-Y) hasta -0.026m abrazando la entrada de los muslos.
    const legCenterDist = Math.abs(Math.abs(px) - 0.118);
    const legCuffDrop = ny < -0.15 ? Math.exp(-Math.pow(legCenterDist / 0.055, 2.0)) * Math.pow((-ny - 0.15) / 0.85, 1.4) * 0.026 : 0.0;
    const crotchArchLift = ny < -0.10 && Math.abs(px) < 0.075
      ? Math.cos((Math.abs(px) / 0.075) * Math.PI * 0.5) * Math.pow((-ny - 0.10) / 0.90, 1.3) * 0.042
      : 0.0;

    // 3. Glúteos anatómicos traseros (pz < 0): surco interglúteo en X=0, volumen convexo y pliegue subglúteo
    const gluteSwell = pz < 0 && ny < 0.45
      ? Math.sin(Math.min(1.0, Math.abs(nx) * 1.6) * Math.PI) * Math.cos(ny * Math.PI * 0.45) * 0.017
      : 0.0;
    const subGluteCrease = pz < -0.02 && ny < -0.35 && ny > -0.78
      ? -Math.exp(-Math.pow((ny + 0.56) / 0.12, 2.0)) * 0.0052
      : 0.0;

    // 4. Pliegues diagonales profundos de tensión en la ingle (Groin / Inguinal Tension Creases) y bragueta reforzada
    const groinDiagonal1 = Math.sin((Math.abs(nx) * 5.6 + (ny + 0.45) * 4.4) * Math.PI);
    const groinDiagonal2 = Math.cos((Math.abs(nx) * 9.2 - (ny + 0.30) * 6.8) * Math.PI);
    const groinCrease =
      pz > 0 && ny < 0.48
        ? (groinDiagonal1 * 0.0052 + groinDiagonal2 * 0.0024) * (1.0 - Math.abs(ny) * 0.42)
        : 0.0;
    const flyWelt = pz > 0.05 && Math.abs(px) < 0.020 && ny > -0.65 && ny < 0.70 ? 0.0042 : 0.0;

    // 5. Compresión física del cinturón Ronin Senshi (situado en py ~ 0.070 en espacio local de pelvis)
    const beltDist = Math.abs(py - 0.068);
    const beltPinch = beltDist < 0.034
      ? -Math.pow(Math.cos((beltDist / 0.034) * Math.PI * 0.5), 2.0) * 0.0075
      : 0.0;
    const beltGather = beltDist >= 0.034 && beltDist < 0.058
      ? Math.sin(((beltDist - 0.034) / 0.024) * Math.PI) * (0.0032 + 0.0020 * Math.cos(Math.atan2(px, pz) * 14.0))
      : 0.0;

    // 6. Ajuste de profundidad anteroposterior (Z) y cintura ceñida
    const zScale = 0.84 + gluteSwell * 0.5;
    const radialBeltMod = 1.0 + (beltPinch + beltGather) * 3.2;

    pPos.setXYZ(
      i,
      hipFlareX * radialBeltMod,
      py + crotchArchLift - legCuffDrop,
      (pz * zScale + groinCrease + flyWelt - gluteSwell + subGluteCrease) * radialBeltMod
    );
  }
  const pelvisGeo = sculptClothFolds(rawPelvisGeo, 9, 22, 0.0068);
  const pelvis = new THREE.Mesh(pelvisGeo, materials.camoFabric);
  pelvis.position.y = -0.018;
  skeleton.hips.add(pelvis);

  // Inserción de refuerzo Diamond Crotch Gusset en la entrepierna para unir limpiamente ambas piernas
  const gussetShape = createRoundedRectShape(0.096, 0.082, 0.024);
  const gussetGeo = createOrganicExtrude(gussetShape, 0.016, 0.004, 4, 16, 4);
  gussetGeo.rotateX(Math.PI * 0.48);
  const crotchGusset = new THREE.Mesh(gussetGeo, materials.camoFabric);
  crotchGusset.position.set(0, -0.082, 0.006);
  skeleton.hips.add(crotchGusset);

  // Bolsillos diagonales de cadera Crye G3 (Hip Slash Pockets) con reborde de costura reforzada
  for (const side of [-1, 1]) {
    const hipPocketShape = createRoundedRectShape(0.086, 0.018, 0.006);
    const hipPocketGeo = createOrganicExtrude(hipPocketShape, 0.008, 0.002, 4, 14, 4);
    hipPocketGeo.rotateZ(side * -0.42);
    hipPocketGeo.rotateY(side * 0.65);
    const hipPocket = new THREE.Mesh(hipPocketGeo, materials.camoFabric);
    hipPocket.position.set(side * 0.178, 0.012, 0.082);
    skeleton.hips.add(hipPocket);
  }

  // ====================================================================
  // CINTURÓN DE COMBATE RONIN TACTICS SENSHI (SISTEMA DOBLE HIPER-DETALLADO)
  // ====================================================================
  buildDetailedTacticalBelt(skeleton.hips, materials);

  // Generador de cada pierna con postura táctica natural separada a la anchura de los hombros
  const createLeg = (side: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.118, -0.05, side === 1 ? 0.022 : -0.022);
    legGroup.rotation.z = side * 0.065;
    legGroup.rotation.y = side * 0.12;
    legGroup.rotation.x = side === 1 ? -0.025 : 0.025;
    skeleton.hips.add(legGroup);

    // Muslo esculpido con pliegues dinámicos de tensión en ingle, caída asimétrica del tejido,
    // compresión de correas de pistolera/rodillera y arrugas romboidales detrás de la rodilla
    const rawThighGeo = new THREE.CylinderGeometry(0.103, 0.084, 0.425, 48, 34);
    const tPos = rawThighGeo.attributes.position;
    const tv = new THREE.Vector3();
    for (let i = 0; i < tPos.count; i++) {
      tv.fromBufferAttribute(tPos, i);
      const ny = tv.y / 0.2125; // -1 (rodilla) a +1 (cadera/pelvis)
      const ang = Math.atan2(tv.z, tv.x);

      // Engaste anatómico en la pelvis (hip socket tuck)
      let hipInset = 1.0;
      if (ny > 0.35) {
        const factor = (ny - 0.35) / 0.65;
        hipInset = 1.0 - Math.pow(factor, 1.8) * 0.22;
        if (ny > 0.85) {
          const capFactor = (ny - 0.85) / 0.15;
          tv.y -= capFactor * capFactor * 0.014;
        }
      }

      // 1. Silueta anatómica no-cilíndrica: barrido de cuádriceps (vasto lateral/medial) e isquiotibiales
      const quadSweep = Math.max(0, Math.sin(ang)) * Math.cos(ny * Math.PI * 0.45) * 0.0125;
      const hamstringSweep = Math.max(0, -Math.sin(ang)) * Math.sin((ny + 0.8) * Math.PI * 0.55) * 0.0085;
      const lateralSweep = Math.max(0, tv.x * side * 8.5) * Math.cos(ny * Math.PI * 0.4) * 0.0065;
      const innerThighTaper = Math.max(0, -tv.x * side * 7.5) * (0.5 - 0.5 * ny) * -0.0045;

      // 2. Costuras dobles laterales e internas en relieve (Double-Welt Flat-Felled Outseam & Inseam)
      const outseamDist = Math.abs(ang - (side === 1 ? 0 : Math.PI));
      const inseamDist = Math.abs(ang - (side === 1 ? Math.PI : 0));
      const outseamWelt = (Math.exp(-Math.pow((outseamDist - 0.035) / 0.032, 2.0)) +
                           Math.exp(-Math.pow((outseamDist + 0.035) / 0.032, 2.0))) * 0.0024;
      const inseamWelt = (Math.exp(-Math.pow((inseamDist - 0.035) / 0.035, 2.0)) +
                          Math.exp(-Math.pow((inseamDist + 0.035) / 0.035, 2.0))) * 0.0020;

      // 3. Pliegues diagonales de tensión en la ingle (parte interna superior del muslo)
      const groinPull = ny > 0.05 && (-tv.x * side > -0.02) && tv.z > -0.02
        ? Math.sin((ny * 6.5 + ang * 3.0 * side) * Math.PI) * 0.0042 * ((ny - 0.05) / 0.95)
        : 0.0;

      // 4. Pliegues de acordeón frontales sobre la rodillera y pliegues romboidales profundos DETRÁS de la rodilla (Fosa Poplítea)
      const frontKneeGather = ny < -0.45 && tv.z >= -0.01
        ? Math.sin(((ny + 1.0) / 0.55) * Math.PI * 4.5) * 0.0038
        : 0.0;
      const backKneeDiamond = ny < -0.32 && tv.z < 0.01
        ? (Math.sin(((ny + 1.0) / 0.68) * Math.PI * 6.0 + Math.cos(ang * 4.0) * 1.3) * 0.0058 +
           Math.cos(((ny + 1.0) / 0.68) * Math.PI * 10.0 - Math.sin(ang * 6.0) * 1.5) * 0.0028) *
          Math.pow(Math.max(0, -Math.sin(ang)), 0.75)
        : 0.0;

      // 5. Estrangulamiento textil por la correa superior de la rodillera Crye AirFlex (ny ~ -0.78)
      const kneeStrapDist = Math.abs(ny - (-0.78));
      const kneeStrapPinch = kneeStrapDist < 0.14
        ? -Math.pow(Math.cos((kneeStrapDist / 0.14) * Math.PI * 0.5), 2.0) * (tv.z < 0 ? 0.042 : 0.018)
        : 0.0;
      const kneeStrapBulge = kneeStrapDist >= 0.14 && kneeStrapDist < 0.24
        ? Math.sin(((kneeStrapDist - 0.14) / 0.10) * Math.PI) * 0.014
        : 0.0;

      // 6. Tensión diagonal hacia las esquinas del bolsillo cargo lateral
      const cargoTension = Math.abs(ny) < 0.52 && (tv.x * side > 0.02)
        ? Math.sin((ny * 7.2 + tv.z * 48.0) * Math.PI) * 0.0022
        : 0.0;

      let rMod = (1.0 + quadSweep + hamstringSweep + lateralSweep + innerThighTaper +
                  outseamWelt + inseamWelt + groinPull + frontKneeGather +
                  backKneeDiamond + kneeStrapPinch + kneeStrapBulge + cargoTension) * hipInset;

      // Surco físico profundo de compresión textil donde la correa de la pistolera Safariland ciñe el muslo derecho (-X)
      if (side === -1) {
        const strapDist = Math.abs(tv.y - 0.045);
        if (strapDist < 0.032) {
          const pinch = Math.cos((strapDist / 0.032) * Math.PI * 0.5);
          rMod -= pinch * pinch * 0.068;
        } else if (strapDist < 0.058) {
          // Abombamiento y arrugas radiales de la tela justo encima y debajo de la correa tensada
          const wrinkle = 1.0 + 0.35 * Math.sin(ang * 12.0);
          rMod += Math.sin(((strapDist - 0.032) / 0.026) * Math.PI) * 0.021 * wrinkle;
        }
      }
      tv.x *= rMod;
      tv.z *= rMod;
      tPos.setXYZ(i, tv.x, tv.y, tv.z);
    }
    const thighGeo = sculptClothFolds(rawThighGeo, 10, 22, 0.0074);
    const thigh = new THREE.Mesh(thighGeo, materials.camoFabric);
    thigh.position.y = -0.20;
    legGroup.add(thigh);

    // ====================================================================
    // BOLSILLO CARGO CRYE G3 DE FUELLE ENVOLVENTE (ANATOMICAL THIGH-WRAP)
    // ====================================================================
    const cargoGroup = new THREE.Group();
    cargoGroup.position.set(0, -0.205, 0.004);
    legGroup.add(cargoGroup);

    // Cuerpo del bolsillo modelado con sección de fuelle plisado, caída por gravedad y curvado conforme al radio del muslo
    const cargoBodyGeo = new THREE.BoxGeometry(0.142, 0.180, 0.030, 28, 30, 14);
    const cPos = cargoBodyGeo.attributes.position;
    const cv = new THREE.Vector3();
    for (let i = 0; i < cPos.count; i++) {
      cv.fromBufferAttribute(cPos, i);
      const nx = THREE.MathUtils.clamp(cv.x / 0.071, -1.0, 1.0); // -1 a 1 a lo largo del ancho anteroposterior
      const ny = THREE.MathUtils.clamp(cv.y / 0.090, -1.0, 1.0); // -1 (fondo) a 1 (boca superior)
      const nz = THREE.MathUtils.clamp(cv.z / 0.015, -1.0, 1.0); // -1 (pegado al muslo) a 1 (cara exterior)

      // Redondeo superelíptico continuo de bordes y esquinas (sin colapsar polos)
      const edgeRound = Math.pow(Math.max(0.08, 1.0 - Math.pow(Math.abs(nx), 2.6)), 0.38) *
                        Math.pow(Math.max(0.08, 1.0 - Math.pow(Math.abs(ny), 2.6)), 0.35);

      // Fuelle central expandido (Bellows Pleat) + caída de peso sutil en el tercio inferior (Teardrop Belly)
      const gravityBelly = (1.0 - ny * 0.16) * Math.cos(nx * Math.PI * 0.46) * Math.cos((ny + 0.15) * Math.PI * 0.44);
      const bellowsPleat = Math.cos(nx * Math.PI * 1.5) * 0.0022 * (1.0 - Math.abs(ny) * 0.5);

      let localThick = (cv.z + 0.015) * edgeRound;
      if (nz > -0.6) {
        localThick += Math.max(0, gravityBelly) * 0.0085 + bellowsPleat;
      }
      // Costura vertical central hundida (Crye G3 expansion pleat)
      const centerPleat = Math.exp(-Math.pow(nx / 0.11, 2.0)) * 0.0042 * (1.0 - Math.pow(ny, 2.0));
      localThick -= centerPleat * Math.max(0, nz);

      // Pliegues diagonales de tensión desde las esquinas inferiores
      const diagFold = Math.sin((nx * 4.5 + ny * 3.8 * side)) * 0.0014 * (1.0 - Math.abs(nx) * 0.5);
      localThick += diagFold;

      // Proyección cilíndrica conforme a la superficie lateral del muslo
      const thighRadiusAtY = 0.089 + ny * 0.0082;
      const arcAngle = (cv.x / thighRadiusAtY) * 0.86; // Abraza ~78 grados del muslo
      const radialDist = thighRadiusAtY - 0.005 + localThick;

      const wx = side * Math.cos(arcAngle) * radialDist;
      const wz = Math.sin(arcAngle) * radialDist;
      const wy = cv.y - Math.cos(arcAngle) * 0.003;

      cPos.setXYZ(i, wx, wy, wz);
    }
    const cUv = cargoBodyGeo.attributes.uv;
    if (cUv) {
      for (let i = 0; i < cPos.count; i++) {
        const ang = Math.atan2(cPos.getZ(i), cPos.getX(i));
        cUv.setXY(i, ang * 0.095 * 2.45, cPos.getY(i) * 2.45);
      }
      cUv.needsUpdate = true;
    }
    cargoBodyGeo.computeVertexNormals();
    const cargoPocket = new THREE.Mesh(cargoBodyGeo, materials.camoFabric);
    cargoGroup.add(cargoPocket);

    // Solapa superior asimétrica contorneada (Crye G3 Slanted Contoured Flap) con bordes biselados y esquina de tiro levantada
    const cargoFlapGeo = new THREE.BoxGeometry(0.148, 0.046, 0.014, 26, 12, 8);
    const fPos = cargoFlapGeo.attributes.position;
    const fv = new THREE.Vector3();
    for (let i = 0; i < fPos.count; i++) {
      fv.fromBufferAttribute(fPos, i);
      const nx = THREE.MathUtils.clamp(fv.x / 0.074, -1.0, 1.0);
      const ny = THREE.MathUtils.clamp(fv.y / 0.023, -1.0, 1.0);

      // Esquinas inferiores redondeadas y perfil en gota suave
      const cornerSoft = Math.pow(Math.max(0.08, 1.0 - Math.pow(Math.abs(nx), 2.4)), 0.38) *
                         Math.pow(Math.max(0.08, 1.0 - Math.pow(Math.abs(ny), 2.4)), 0.35);
      // Inclinación táctica ergonómica (más alta adelante, más baja atrás)
      const slantY = fv.y * (0.85 + 0.15 * cornerSoft) + nx * 0.007 + 0.086;
      // Curvatura envolvente sobre la boca superior del bolsillo
      const overLip = Math.sin((ny + 1.0) * Math.PI * 0.5) * 0.005;
      // Esquina anterior (+Z) ligeramente levantada para el tirador de cinta
      const frontFlare = Math.max(0, nx - 0.35) * (1.0 - ny) * 0.007;

      const thighRadiusAtFlap = 0.095;
      const arcAngle = (fv.x / thighRadiusAtFlap) * 0.88;
      const radialDist = thighRadiusAtFlap + 0.011 + (fv.z * cornerSoft) + overLip + frontFlare;

      fPos.setXYZ(
        i,
        side * Math.cos(arcAngle) * radialDist,
        slantY,
        Math.sin(arcAngle) * radialDist
      );
    }
    const fUv = cargoFlapGeo.attributes.uv;
    if (fUv) {
      for (let i = 0; i < fPos.count; i++) {
        const ang = Math.atan2(fPos.getZ(i), fPos.getX(i));
        fUv.setXY(i, ang * 0.105 * 2.45, fPos.getY(i) * 2.45);
      }
      fUv.needsUpdate = true;
    }
    cargoFlapGeo.computeVertexNormals();
    const cargoFlap = new THREE.Mesh(cargoFlapGeo, materials.camoFabric);
    cargoGroup.add(cargoFlap);

    // Costuras dobles reforzadas (Twin-Needle Reinforced Double-Stitching) en bordes de bolsillo cargo y solapa
    for (const stitchOffset of [-0.0022, 0.0022]) {
      const flapSeamPts: THREE.Vector3[] = [];
      for (let s = 0; s <= 12; s++) {
        const u = -1.0 + (s / 12) * 2.0;
        const arc = (u * 0.070 / 0.095) * 0.88;
        const r = 0.111;
        const y = -0.015 + u * 0.007 + 0.086 + stitchOffset;
        flapSeamPts.push(new THREE.Vector3(side * Math.cos(arc) * r, y, Math.sin(arc) * r));
      }
      const flapSeamCurve = new THREE.CatmullRomCurve3(flapSeamPts);
      const flapSeam = new THREE.Mesh(
        new THREE.TubeGeometry(flapSeamCurve, 20, 0.0011, 6, false),
        materials.stitchThread
      );
      cargoGroup.add(flapSeam);

      // Costura vertical doble a lo largo del fuelle central del bolsillo cargo
      const pleatPts: THREE.Vector3[] = [
        new THREE.Vector3(side * 0.105, -0.082, stitchOffset * 1.4),
        new THREE.Vector3(side * 0.110, -0.010, stitchOffset * 1.4),
        new THREE.Vector3(side * 0.107, 0.064, stitchOffset * 1.4)
      ];
      const pleatSeam = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pleatPts), 14, 0.0010, 6, false),
        materials.stitchThread
      );
      cargoGroup.add(pleatSeam);
    }

    // Tirador de apertura rápida (Webbing Pull Tab) saliendo en curva bajo la esquina frontal de la solapa
    const flapTabCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.090, 0.073, 0.046),
      new THREE.Vector3(side * 0.098, 0.065, 0.053),
      new THREE.Vector3(side * 0.095, 0.055, 0.056)
    ]);
    const flapPullTab = new THREE.Mesh(
      createRoundedStrapGeometry(flapTabCurve, 0.015, 0.0036, 10, 16),
      materials.webbing
    );
    cargoGroup.add(flapPullTab);

    // En el muslo derecho (-X): Plataforma True North Concepts MHA + Funda Safariland 6354DO Termomoldeada + Glock 19 Custom
    if (side === -1) {
      const holsterRig = new THREE.Group();
      holsterRig.position.set(-0.114, -0.155, 0.015);
      legGroup.add(holsterRig);

      // 1. Adaptador rígido True North Concepts MHA en aluminio DDC con silueta curva contorneada y bordes CNC biselados
      const mhaShape = new THREE.Shape();
      mhaShape.moveTo(-0.026, -0.095);
      mhaShape.quadraticCurveTo(-0.038, -0.045, -0.034, 0.025);
      mhaShape.quadraticCurveTo(-0.030, 0.088, -0.018, 0.096);
      mhaShape.quadraticCurveTo(0.0, 0.102, 0.018, 0.096);
      mhaShape.quadraticCurveTo(0.030, 0.088, 0.034, 0.025);
      mhaShape.quadraticCurveTo(0.038, -0.045, 0.026, -0.095);
      mhaShape.quadraticCurveTo(0.0, -0.102, -0.026, -0.095);

      // Ventanas de aligeramiento oblongas (Stadium Slots) perforadas realmente en el Shape 2D
      for (let slot = -1; slot <= 1; slot++) {
        const hole = new THREE.Path();
        const sy = slot * 0.042;
        const sw = 0.008, sh = 0.012;
        hole.moveTo(-sw, sy - sh);
        hole.absarc(0, sy - sh, sw, Math.PI, Math.PI * 2, false);
        hole.lineTo(sw, sy + sh);
        hole.absarc(0, sy + sh, sw, 0, Math.PI, false);
        hole.closePath();
        mhaShape.holes.push(hole);
      }

      const mhaGeo = createOrganicExtrude(mhaShape, 0.009, 0.0025, 5, 24, 6, (v) => {
        // Rotar para orientar en el plano YZ y curvar cóncavamente hacia el muslo
        const oldX = v.x;
        const oldZ = v.z;
        const bendX = Math.cos(oldX * 14.0) * 0.006 - Math.sin(v.y * 8.0) * 0.004;
        v.x = oldZ + bendX;
        v.z = oldX;
      });
      const mhaPlate = new THREE.Mesh(mhaGeo, materials.geisseleDDC);
      mhaPlate.position.set(0.016, 0.082, 0);
      mhaPlate.rotation.z = -0.08;
      holsterRig.add(mhaPlate);

      // 2. Horquilla de liberación rápida Safariland QLS 19/22 con brazos redondeados en V y tornillería Allen abombada
      const qlsShape = createRoundedRectShape(0.062, 0.086, 0.018);
      const qlsGeo = createOrganicExtrude(qlsShape, 0.013, 0.0035, 5, 20, 4, (v) => {
        const ox = v.x;
        v.x = v.z + Math.cos(ox * 16.0) * 0.003;
        v.z = ox * (1.0 - v.y * 1.8);
      });
      const qlsFork = new THREE.Mesh(qlsGeo, materials.darkPolymer);
      qlsFork.position.set(0.008, 0.025, 0);
      holsterRig.add(qlsFork);

      for (const [bx, by, bz] of [[0.011, 0.056, 0], [0.010, 0.012, -0.018], [0.010, 0.012, 0.018]]) {
        const boltCap = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 14, 10), materials.boltSteel);
        boltCap.scale.set(0.55, 1.0, 1.0);
        boltCap.position.set(bx, by, bz);
        holsterRig.add(boltCap);
      }

      // 3. Correa elástica de muslo contorneada (Anatomical Thigh Strap) + Hebilla curva ITW Nexus Fastex
      const strapPoints: THREE.Vector3[] = [];
      const numStrapPts = 32;
      for (let i = 0; i <= numStrapPts; i++) {
        const a = (i / numStrapPts) * Math.PI * 2;
        const rx = 0.095 + (Math.cos(a) < 0 ? 0.012 : 0.0);
        const rz = 0.091 + Math.sin(a * 2) * 0.003;
        strapPoints.push(new THREE.Vector3(0.106 + Math.cos(a) * rx, Math.sin(a) * 0.003, Math.sin(a) * rz));
      }
      const thighStrapCurve = new THREE.CatmullRomCurve3(strapPoints, true);
      const strapGeo = createRoundedStrapGeometry(thighStrapCurve, 0.036, 0.0065, 12, 48);
      const strap = new THREE.Mesh(strapGeo, materials.webbing);
      holsterRig.add(strap);

      // Hebilla curva ITW Nexus con orejetas laterales redondeadas
      const buckleShape = createRoundedRectShape(0.034, 0.044, 0.009);
      const buckleGeo = createOrganicExtrude(buckleShape, 0.014, 0.0035, 5, 18, 4, (v) => {
        const ox = v.x;
        v.x = v.z + Math.cos(ox * 18.0) * 0.003;
        v.z = ox;
      });
      const legBuckle = new THREE.Mesh(buckleGeo, materials.darkPolymer);
      legBuckle.position.set(0.009, 0, 0.045);
      legBuckle.rotation.y = 0.38;
      holsterRig.add(legBuckle);

      // 4. Cuerpo termomoldeado al vacío de la funda Safariland 6354DO ALS (Vacuum-Formed Kydex Shell)
      // En lugar de una caja, se esculpe un perfil asimétrico tipo "lágrima" que abraza la corredera, el guardamonte y la linterna X300U
      const holsterGroup = new THREE.Group();
      holsterGroup.position.set(-0.004, 0.002, 0.004);
      holsterGroup.rotation.x = 0.16;
      holsterRig.add(holsterGroup);

      const kydexShellGeo = new THREE.CylinderGeometry(0.032, 0.026, 0.174, 36, 28);
      const kPos = kydexShellGeo.attributes.position;
      const kv = new THREE.Vector3();
      for (let i = 0; i < kPos.count; i++) {
        kv.fromBufferAttribute(kPos, i);
        const ny = kv.y / 0.087; // -1 (punta inferior) a +1 (boca superior)
        const ang = Math.atan2(kv.z, kv.x);

        // Estrechar lateralmente (X) y alargar anteroposteriormente (Z) con perfil de gota Kydex
        let x = kv.x * (0.86 + 0.14 * Math.sin((ny + 1.0) * Math.PI * 0.5));
        let z = kv.z * (1.48 + 0.22 * Math.cos(ny * Math.PI * 0.45));

        // Canal cilíndrico frontal (+Z) para la linterna táctica SureFire X300U-B
        const lightPod = Math.exp(-Math.pow((ang - Math.PI * 0.5) / 0.55, 2.0));
        z += lightPod * 0.018 * (0.75 + 0.25 * Math.cos(ny * Math.PI * 0.5));
        x *= (1.0 - lightPod * 0.12);

        // Alojamiento del guardamonte y lomo de la corredera (-Z)
        const triggerGuardBump = Math.exp(-Math.pow((ang + Math.PI * 0.5) / 0.65, 2.0)) *
                                 Math.max(0, Math.sin((ny + 0.2) * Math.PI));
        z -= triggerGuardBump * 0.012;

        // Nervio lateral de costura Kydex (remaches en el borde posterior)
        const seamFlange = Math.exp(-Math.pow((ang + Math.PI * 0.5) / 0.28, 2.0));
        z -= seamFlange * 0.007;

        // Boca superior acampanada y recorte oblicuo para el visor RMR y extracción rápida
        let y = kv.y;
        if (ny > 0.35) {
          const flare = Math.pow((ny - 0.35) / 0.65, 1.6);
          x *= (1.0 + flare * 0.14);
          z *= (1.0 + flare * 0.10);
          // Corte oblicuo en la boca de la funda
          y -= Math.max(0, -Math.sin(ang)) * flare * 0.022;
        }
        // Tapón inferior redondeado (Muzzle Plug)
        if (ny < -0.75) {
          const bottomRound = Math.cos(((ny + 0.75) / 0.25) * Math.PI * 0.5);
          x *= (0.65 + 0.35 * bottomRound);
          z *= (0.65 + 0.35 * bottomRound);
        }

        kPos.setXYZ(i, x, y, z);
      }
      kydexShellGeo.computeVertexNormals();
      const holsterBody = new THREE.Mesh(kydexShellGeo, materials.corduraVest);
      holsterGroup.add(holsterBody);

      // Arco protector de polímero ALS (Automatic Locking System Hood) y palanca de pulgar ergonómica
      const alsCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.026, 0.052, -0.024),
        new THREE.Vector3(-0.028, 0.088, -0.006),
        new THREE.Vector3(0.0, 0.098, 0.008),
        new THREE.Vector3(0.028, 0.088, -0.006),
        new THREE.Vector3(0.026, 0.052, -0.024)
      ]);
      const alsHood = new THREE.Mesh(
        createRoundedStrapGeometry(alsCurve, 0.026, 0.008, 12, 28),
        materials.darkPolymer
      );
      holsterGroup.add(alsHood);

      // Palanca de desbloqueo de pulgar ALS (Thumb Release Lever)
      const thumbLeverGeo = createOrganicExtrude(createRoundedRectShape(0.014, 0.028, 0.006), 0.010, 0.003, 5, 16, 4);
      const thumbLever = new THREE.Mesh(thumbLeverGeo, materials.darkPolymer);
      thumbLever.position.set(0.026, 0.078, -0.022);
      thumbLever.rotation.x = -0.25;
      holsterGroup.add(thumbLever);

      // 5. Pistola Glock 19 Custom Esculpida (Empuñadura ergonómica con beavertail, magwell acampanado, corredera biselada y RMR)
      const gripGeo = new THREE.CylinderGeometry(0.017, 0.018, 0.098, 28, 18);
      const gPos = gripGeo.attributes.position;
      const gv = new THREE.Vector3();
      for (let i = 0; i < gPos.count; i++) {
        gv.fromBufferAttribute(gPos, i);
        const ny = gv.y / 0.049;
        // Sección transversal ovalada con rebajes de pulgar y curva de lomo (Beavertail + Finger Grooves)
        const gx = gv.x * (0.92 - 0.10 * Math.exp(-Math.pow(ny - 0.25, 2.0) * 6.0));
        let gz = gv.z * 1.48;
        // Curva ergonómica trasera (Backstrap arch) y surcos frontales para los dedos
        if (gv.z < 0) {
          gz -= Math.sin((ny + 0.8) * Math.PI) * 0.0045;
          if (ny > 0.4) gz -= Math.pow(ny - 0.4, 2.0) * 0.018; // Beavertail
        } else {
          gz += Math.sin(ny * Math.PI * 3.0) * 0.0018;
        }
        gPos.setXYZ(i, gx, gv.y, gz);
      }
      gripGeo.computeVertexNormals();
      const pistolGrip = new THREE.Mesh(gripGeo, materials.stippledPolymer);
      pistolGrip.position.set(0, 0.096, -0.026);
      pistolGrip.rotation.x = -0.52;
      holsterGroup.add(pistolGrip);

      // Magwell acampanado de competición (Taran Tactical / Agency Arms Flared Magwell)
      const magwellGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.016, 28, 8);
      magwellGeo.scale(0.86, 1.0, 1.42);
      const magPos = magwellGeo.attributes.position;
      for (let i = 0; i < magPos.count; i++) {
        const my = magPos.getY(i);
        const flare = 1.0 + Math.pow((my + 0.008) / 0.016, 2.0) * 0.16;
        magPos.setX(i, magPos.getX(i) * flare);
        magPos.setZ(i, magPos.getZ(i) * flare);
      }
      magwellGeo.computeVertexNormals();
      const pistolMagwell = new THREE.Mesh(magwellGeo, materials.geisseleDDC);
      pistolMagwell.position.set(0, 0.138, -0.050);
      pistolMagwell.rotation.x = -0.52;
      holsterGroup.add(pistolMagwell);

      // Basepad extendido curvo del cargador insertado en la pistola
      const insertedBasepadGeo = createOrganicPouchVolume(0.030, 0.018, 0.044, {
        roundnessXZ: 0.55,
        roundnessY: 0.48,
        teardropSag: -0.10,
        pillowBulge: 0.08,
        wrinkleAmp: 0
      });
      const insertedBasepad = new THREE.Mesh(insertedBasepadGeo, materials.darkPolymer);
      insertedBasepad.position.set(0, 0.148, -0.056);
      insertedBasepad.rotation.x = -0.52;
      holsterGroup.add(insertedBasepad);

      // Corredera fresada Glock 19 con chaflanes superiores redondeados (Bullnose Chamfered Slide)
      const slideShape = new THREE.Shape();
      slideShape.moveTo(-0.014, -0.018);
      slideShape.lineTo(0.014, -0.018);
      slideShape.quadraticCurveTo(0.016, 0.0, 0.012, 0.014);
      slideShape.quadraticCurveTo(0.0, 0.018, -0.012, 0.014);
      slideShape.quadraticCurveTo(-0.016, 0.0, -0.014, -0.018);
      const slideGeo = createOrganicExtrude(slideShape, 0.072, 0.0035, 6, 20, 6);
      const pistolSlide = new THREE.Mesh(slideGeo, materials.gunmetal);
      pistolSlide.position.set(0, 0.080, 0.010);
      holsterGroup.add(pistolSlide);

      // Visor Trijicon RMR Type 2 con orejas protectoras en domo cóncavo ("Owl Ears" Housing)
      const rmrShape = new THREE.Shape();
      rmrShape.moveTo(-0.014, -0.010);
      rmrShape.lineTo(0.014, -0.010);
      rmrShape.quadraticCurveTo(0.015, 0.008, 0.009, 0.012);
      rmrShape.quadraticCurveTo(0.0, 0.007, -0.009, 0.012);
      rmrShape.quadraticCurveTo(-0.015, 0.008, -0.014, -0.010);
      const rmrGeo = createOrganicExtrude(rmrShape, 0.034, 0.003, 5, 20, 4);
      const rmrSight = new THREE.Mesh(rmrGeo, materials.fdeAnodized);
      rmrSight.position.set(0, 0.102, 0.004);
      holsterGroup.add(rmrSight);
    }

    // Rodillera Táctica Integrada (Crye Precision AirFlex Impact) con nervaduras ventiladas y correas traseras de ajuste
    const kneeGroup = new THREE.Group();
    kneeGroup.position.set(0, -0.40, 0.016);
    legGroup.add(kneeGroup);

    const kneePadBase = new THREE.Mesh(new THREE.SphereGeometry(0.076, 24, 18), materials.corduraVest);
    kneePadBase.scale.set(0.95, 1.15, 0.65);
    kneePadBase.position.z = 0.035;
    kneeGroup.add(kneePadBase);

    const kneeCapHard = new THREE.Mesh(new THREE.SphereGeometry(0.063, 20, 16), materials.combatRubber);
    kneeCapHard.scale.set(0.92, 0.96, 0.56);
    kneeCapHard.position.z = 0.059;
    kneeGroup.add(kneeCapHard);

    // Nervaduras horizontales de impacto en la rodillera
    for (let r = -1; r <= 1; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.010, 0.018), materials.darkPolymer);
      rib.position.set(0, r * 0.022, 0.084);
      kneeGroup.add(rib);
    }

    // Correas de retención traseras de la rodillera (Crye AirFlex Retention Straps) que ciñen la fosa poplítea
    for (const strapY of [0.024, -0.024]) {
      const kStrapPts: THREE.Vector3[] = [];
      for (let s = 0; s <= 18; s++) {
        const a = -Math.PI * 0.12 - (s / 18) * Math.PI * 0.76; // Abraza la parte trasera de la rodilla
        const rx = 0.076;
        const rz = 0.078;
        kStrapPts.push(new THREE.Vector3(Math.cos(a) * rx, strapY, -0.016 + Math.sin(a) * rz));
      }
      const kStrap = new THREE.Mesh(
        createRoundedStrapGeometry(new THREE.CatmullRomCurve3(kStrapPts), 0.018, 0.0042, 8, 22),
        materials.webbing
      );
      kneeGroup.add(kStrap);
    }

    // Pantorrilla esculpida con pliegues poplíteos detrás de la rodilla, estrangulamiento de correa inferior,
    // costuras dobles laterales y pliegues de acordeón en el tobillo
    const rawCalfGeo = new THREE.CylinderGeometry(0.078, 0.052, 0.266, 44, 30);
    const cfPos = rawCalfGeo.attributes.position;
    for (let i = 0; i < cfPos.count; i++) {
      const cx = cfPos.getX(i);
      const cy = cfPos.getY(i);
      const cz = cfPos.getZ(i);
      const ny = cy / 0.133; // -1 (tobillo) a +1 (rodilla)
      const ang = Math.atan2(cz, cx);

      // Volumen del músculo gastrocnemio (gemelo posterior) y cresta tibial anterior asimétrica
      const gastrocBulge = Math.max(0, -Math.sin(ang)) * Math.max(0, Math.sin((ny + 0.25) * Math.PI * 0.75)) * 0.0105;
      const shinProfile = Math.max(0, Math.sin(ang)) * (1.0 - Math.abs(ny) * 0.4) * 0.0035;
      const ankleTaper = ny < -0.50 ? 1.0 - Math.pow((-ny - 0.50) / 0.50, 1.55) * 0.12 : 1.0;

      // Pliegues de compresión detrás de la rodilla en el tercio superior de la pantorrilla (ny > 0.38, cz < 0)
      const upperPoplitealFold = ny > 0.38 && cz < 0.01
        ? (Math.sin(((ny - 0.38) / 0.62) * Math.PI * 5.0 + Math.cos(ang * 4.0)) * 0.0046) *
          Math.pow(Math.max(0, -Math.sin(ang)), 0.7)
        : 0.0;

      // Surco de compresión de la correa inferior de la rodillera (ny ~ 0.68)
      const lowStrapDist = Math.abs(ny - 0.68);
      const lowStrapPinch = lowStrapDist < 0.15
        ? -Math.pow(Math.cos((lowStrapDist / 0.15) * Math.PI * 0.5), 2.0) * (cz < 0 ? 0.0038 : 0.0014)
        : 0.0;

      // Pliegues de caída y abullonado textil sobre el borde superior de la bota (Blousing Folds)
      const blousingFold = ny < -0.28
        ? Math.sin(((ny + 1.0) / 0.72) * Math.PI * 4.2) * 0.0038 + Math.cos(ang * 7.0 + side) * 0.0022 * ((-ny - 0.28) / 0.72)
        : 0.0;

      // Costura lateral doble en relieve
      const outseamDist = Math.abs(ang - (side === 1 ? 0 : Math.PI));
      const outseamWelt = (Math.exp(-Math.pow((outseamDist - 0.035) / 0.035, 2.0)) +
                           Math.exp(-Math.pow((outseamDist + 0.035) / 0.035, 2.0))) * 0.0022;

      const rLen = Math.hypot(cx, cz);
      const extraR = blousingFold + outseamWelt + upperPoplitealFold + lowStrapPinch + shinProfile;
      cfPos.setX(i, (cx + (rLen > 1e-5 ? (cx / rLen) * extraR : 0)) * ankleTaper);
      cfPos.setZ(i, (cz - gastrocBulge + (rLen > 1e-5 ? (cz / rLen) * extraR : 0)) * ankleTaper);
    }
    const calfGeo = sculptClothFolds(rawCalfGeo, 9, 24, 0.0064);
    const calf = new THREE.Mesh(calfGeo, materials.camoFabric);
    calf.position.set(0, -0.528, -0.004);
    legGroup.add(calf);

    // Dobladillo inferior del pantalón Crye G3 ceñido en lo alto del tobillo (Blousing Cuff) dejando toda la bota visible
    const trouserCuffGeo = sculptClothFolds(new THREE.TorusGeometry(0.049, 0.0095, 16, 32), 7, 14, 0.0026);
    trouserCuffGeo.rotateX(Math.PI / 2);
    const trouserCuff = new THREE.Mesh(trouserCuffGeo, materials.camoFabric);
    trouserCuff.position.set(0, -0.662, -0.004);
    legGroup.add(trouserCuff);

    // Lengüeta lateral de ajuste con Velcro del tobillo Crye G3 (Ankle Cinch Tab)
    const ankleTabCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.048, -0.658, -0.022),
      new THREE.Vector3(side * 0.057, -0.658, 0.002),
      new THREE.Vector3(side * 0.046, -0.658, 0.026)
    ]);
    const ankleCinchTab = new THREE.Mesh(
      createRoundedStrapGeometry(ankleTabCurve, 0.018, 0.004, 8, 16),
      materials.camoFabric
    );
    legGroup.add(ankleCinchTab);

    // ====================================================================
    // BOTA TÁCTICA SALOMON QUEST 4D GTX FORCES 2 EN (HIPER-DETALLADA Y 100% VISIBLE)
    // ====================================================================
    const bootGroup = buildDetailedCombatBoot(side, materials);
    bootGroup.position.set(0, -0.804, 0.006);
    bootGroup.scale.set(1.06, 1.12, 1.06);
    // Compensar el ángulo de abducción e inclinación de la pierna para que la suela apoye plana en el suelo
    bootGroup.rotation.z = side * -0.065;
    bootGroup.rotation.x = side === 1 ? 0.025 : -0.025;
    legGroup.add(bootGroup);
  };

  createLeg(-1);
  createLeg(1);
}
