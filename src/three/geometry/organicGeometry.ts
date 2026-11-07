import * as THREE from 'three';
import { OrganicPouchOptions } from '../types';

/**
 * Esculpido avanzado de prendas tácticas (Crye G3 NYCO Ripstop):
 * - Pliegues primarios de tensión articular, arrugas diagonales de cizalladura en costuras y micro-arrugas
 * - Biselado orgánico de los bordes superior/inferior para eliminar cortes planos de cilindro
 * - Proyección UV métrica uniforme libre de estiramientos o pellizcos polares
 */
export function sculptClothFolds<T extends THREE.BufferGeometry>(
  geometry: T,
  freqX = 6,
  freqY = 14,
  amplitude = 0.008
): T {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const minY = bb.min.y;
  const maxY = bb.max.y;
  const height = Math.max(0.02, maxY - minY);
  const halfH = height * 0.5;
  const midY = (minY + maxY) * 0.5;
  const maxR = Math.max(0.02, (bb.max.x - bb.min.x) * 0.5, (bb.max.z - bb.min.z) * 0.5);

  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const angle = Math.atan2(v.z, v.x);
    const ny = THREE.MathUtils.clamp((v.y - midY) / halfH, -1.0, 1.0);
    const rHoriz = Math.hypot(v.x, v.z);

    // 1. Si el vértice pertenece a una tapa plana superior/inferior de CylinderGeometry,
    // redondear suavemente el borde (Cuff / Shoulder Roll) y hundir el interior para que jamás asome un disco plano
    let endRoll = 1.0;
    const distFromEdgeY = 1.0 - Math.abs(ny);
    if (distFromEdgeY < 0.14) {
      const t = distFromEdgeY / 0.14;
      endRoll = 0.88 + 0.12 * Math.sin(t * Math.PI * 0.5);
    }
    if (rHoriz < maxR * 0.45 && distFromEdgeY < 0.02) {
      // Tapas internas ocultas: retraer ligeramente hacia adentro de la articulación
      v.y -= Math.sign(ny) * Math.min(0.018, height * 0.12) * (1.0 - rHoriz / (maxR * 0.45));
    }

    // 2. Pliegues de compresión textil en acordeón + arrugas diagonales de tiro + crestas asimétricas
    const phase1 = v.y * freqY + Math.sin(angle * 2.0) * 1.35;
    // Perfil de pliegue textil realista: valles más marcados y crestas redondeadas anchas
    const rawWave1 = Math.sin(phase1);
    const fold1 = (rawWave1 - 0.28 * Math.sin(phase1 * 2.0)) * amplitude;

    const diagPhase = angle * freqX + v.y * (freqY * 0.68) * (angle >= 0 ? 1.0 : -1.0);
    const fold2 = Math.cos(diagPhase) * (amplitude * 0.68);

    const microCrease =
      Math.sin(v.y * freqY * 2.4 - angle * 4.0) *
      Math.cos(v.y * freqY * 1.3 + angle * 3.0) *
      (amplitude * 0.36);

    const radialScale = endRoll * (1.0 + fold1 + fold2 + microCrease);
    v.x *= radialScale;
    v.z *= radialScale;
    pos.setXYZ(i, v.x, v.y, v.z);

    // 3. Mapeado UV métrico isótropo (2.45 ciclos/metro = ~40.8cm por repetición, escala idéntica al uniforme Crye G3)
    if (uv) {
      const metricScale = 2.45; // Escala física militar auténtica (formas legibles, nítidas y bien proporcionadas)
      const arcU = ((angle + Math.PI) / (Math.PI * 2.0)) * (2.0 * Math.PI * maxR * metricScale);
      const metricV = (v.y - minY) * metricScale;
      uv.setXY(i, arcU, metricV);
    }
  }
  if (uv) uv.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Genera un Shape 2D con esquinas de radio continuo (C2/C1) para extrusiones biseladas sin aristas vivas
 */
export function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width * 0.5;
  const hh = height * 0.5;
  const r = Math.min(radius, hw * 0.95, hh * 0.95);
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.absarc(hw - r, -hh + r, r, -Math.PI * 0.5, 0, false);
  shape.lineTo(hw, hh - r);
  shape.absarc(hw - r, hh - r, r, 0, Math.PI * 0.5, false);
  shape.lineTo(-hw + r, hh);
  shape.absarc(-hw + r, hh - r, r, Math.PI * 0.5, Math.PI, false);
  shape.lineTo(-hw, -hh + r);
  shape.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/**
 * Crea una geometría extruida y biselada centrada en (0,0,0) con deformador analítico opcional
 */
export function createOrganicExtrude(
  shape: THREE.Shape,
  depth: number,
  bevelRadius = 0.008,
  bevelSegs = 6,
  curveSegs = 24,
  steps = 8,
  deformFn: ((v: THREE.Vector3) => void) | null = null
): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - bevelRadius * 2),
    bevelEnabled: true,
    bevelSegments: bevelSegs,
    steps: steps,
    bevelSize: bevelRadius,
    bevelThickness: bevelRadius,
    curveSegments: curveSegs,
  });
  geo.center();
  if (deformFn) {
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      deformFn(v);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  if (bb && uv && pos && norm) {
    const spanX = Math.max(0.04, bb.max.x - bb.min.x);
    const spanY = Math.max(0.04, bb.max.y - bb.min.y);
    const spanZ = Math.max(0.04, bb.max.z - bb.min.z);
    const scale = 1.0 / Math.max(spanX, spanY, 0.16);
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i) - bb.min.x;
      const py = pos.getY(i) - bb.min.y;
      const pz = pos.getZ(i) - bb.min.z;
      const nx = Math.abs(norm.getX(i));
      const ny = Math.abs(norm.getY(i));
      const nz = Math.abs(norm.getZ(i));
      if (nz >= nx && nz >= ny) {
        uv.setXY(i, px * scale, py * scale);
      } else if (nx >= ny) {
        uv.setXY(i, pz * (1.0 / Math.max(spanZ, 0.16)), py * scale);
      } else {
        uv.setXY(i, px * scale, pz * (1.0 / Math.max(spanZ, 0.16)));
      }
    }
    uv.needsUpdate = true;
  }
  return geo;
}

/**
 * Crea un volumen textil orgánico (Superelipsoide / Almohadilla suave) con hinchazón por presión,
 * caída por gravedad y surcos de compresión
 */
export function createOrganicPouchVolume(
  width: number,
  height: number,
  depth: number,
  options: OrganicPouchOptions = {}
): THREE.BoxGeometry {
  const {
    roundnessXZ = 0.42,
    roundnessY = 0.35,
    teardropSag = 0.14,
    pillowBulge = 0.14,
    backConcavity = 0.0,
    wrapRadiusX = 0.0,
    pinchY = [],
    wrinkleAmp = 0.0022,
    wrinkleFreq = 18,
    segsW = 28,
    segsH = 28,
    segsD = 18,
  } = options;

  const geo = new THREE.BoxGeometry(width, height, depth, segsW, segsH, segsD);
  const pos = geo.attributes.position;
  const hw = width * 0.5;
  const hh = height * 0.5;
  const hd = depth * 0.5;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const nx = THREE.MathUtils.clamp(v.x / hw, -1.0, 1.0);
    const ny = THREE.MathUtils.clamp(v.y / hh, -1.0, 1.0);
    const nz = THREE.MathUtils.clamp(v.z / hd, -1.0, 1.0);

    // 1. Proyección suave a superelipsoide continuo (elimina esquinas de 90 grados sin colapsar polos a 0)
    const sx = Math.sin(nx * Math.PI * 0.5);
    const sy = Math.sin(ny * Math.PI * 0.5);
    const sz = Math.sin(nz * Math.PI * 0.5);

    const cornerR = Math.sqrt(nx * nx + nz * nz);
    const yCap = Math.pow(Math.max(0.08, 1.0 - Math.pow(Math.abs(ny), 2.8)), roundnessY * 0.45);
    const xzRound = Math.pow(
      Math.max(0.12, 1.0 - Math.pow(Math.min(0.98, cornerR * 0.70), 2.8)),
      roundnessXZ * 0.40
    );

    let x = THREE.MathUtils.lerp(v.x, hw * sx, roundnessXZ) * yCap;
    const y = THREE.MathUtils.lerp(v.y, hh * sy, roundnessY);
    let z = THREE.MathUtils.lerp(v.z, hd * sz, roundnessXZ) * yCap * xzRound;

    // 2. Caída de lágrima por gravedad (más volumen en el tercio inferior, más estilizado arriba)
    const gravityFactor =
      1.0 - ny * teardropSag + Math.sin((1.0 - ny) * Math.PI * 0.65) * (teardropSag * 0.40);
    x *= gravityFactor;
    if (z < 0) z *= 1.0 - ny * teardropSag * 1.10;

    // 3. Abombamiento orgánico central por presión del contenido (Pillow Bulge)
    const centerDome = Math.max(0.0, Math.cos(nx * Math.PI * 0.48) * Math.cos(ny * Math.PI * 0.48));
    if (centerDome > 0.0001) {
      const bulge = Math.pow(centerDome, 1.35) * pillowBulge;
      z += (nz >= 0 ? 1 : -1) * hd * bulge;
      x += (nx >= 0 ? 1 : -1) * hw * bulge * 0.38 * Math.abs(nx);
    }

    // 4. Surcos de compresión donde pasan correas o costuras horizontales
    for (const p of pinchY) {
      const distY = Math.abs(ny - p.y);
      if (distY < p.width) {
        const pinch = Math.cos((distY / p.width) * Math.PI * 0.5);
        const pStrength = pinch * pinch * p.depth;
        x *= 1.0 - pStrength;
        if (nz < 0.2) z *= 1.0 - pStrength * 1.20;
      }
    }

    // 5. Concavidad dorsal para acoplarse a placas balísticas o cuerpo
    if (backConcavity !== 0) {
      z += Math.cos(nx * Math.PI * 0.5) * backConcavity;
    }

    // 6. Envoltura cilíndrica alrededor de muslo o cintura (preservando orientación dextrógira de caras)
    if (wrapRadiusX !== 0) {
      const absR = Math.abs(wrapRadiusX);
      const signR = Math.sign(wrapRadiusX);
      const theta = x / absR;
      const r = absR + z * signR;
      x = Math.sin(theta) * r;
      z = (Math.cos(theta) * r - absR) * signR;
    }

    // 7. Pliegues diagonales de tensión textil hacia las costuras
    if (wrinkleAmp > 0) {
      const seamTension =
        Math.sin((nx * 3.2 + ny * 2.4) * wrinkleFreq * 0.35) *
        Math.cos((ny * 2.8 - nz * 2.1) * wrinkleFreq * 0.35);
      const radial = 1.0 + seamTension * wrinkleAmp * (0.4 + 0.6 * Math.abs(nx));
      x *= radial;
      z *= radial;
    }

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Genera una cinta textil/correa de sección capsular redondeada a lo largo de una curva 3D
 */
export function createRoundedStrapGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  width: number,
  thickness: number,
  radialSegs = 12,
  tubularSegs = 36
): THREE.TubeGeometry {
  const geo = new THREE.TubeGeometry(curve, tubularSegs, 1.0, radialSegs, false);
  const pos = geo.attributes.position;
  const frames = curve.computeFrenetFrames(tubularSegs, false);
  const P = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i <= tubularSegs; i++) {
    const u = i / tubularSegs;
    curve.getPointAt(u, P);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j <= radialSegs; j++) {
      const idx = i * (radialSegs + 1) + j;
      if (idx >= pos.count) continue;
      const angle = (j / radialSegs) * Math.PI * 2;
      // Perfil superelíptico de cinta tejida (bordes redondeados suaves, caras ligeramente convexas)
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const rx = Math.sign(ca) * Math.pow(Math.abs(ca), 0.75) * (width * 0.5);
      const ry = Math.sign(sa) * Math.pow(Math.abs(sa), 0.75) * (thickness * 0.5);

      v.copy(P).addScaledVector(N, ry).addScaledVector(B, rx);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Shader GLSL Avanzado para Tejidos Tácticos Balísticos (Cordura 1000D, Cincha MIL-W-4088 y Punto Ignífugo):
 * - Modelo BRDF de micro-filamentos anisotrópicos (Kajiya-Kay / Ward Tangential Lobe) en espacio de pantalla
 * - Oclusión Ambiental de Contacto (Contact AO) y sombras profundas en cavidades PALS/MOLLE y pliegues
 * - Weathering por zonas: polvo/tierra seca en cotas bajas, manchas de roce/sudor con menor rugosidad en chaleco y costuras
 * - Micro-desgaste blanquecino de fibras deshilachadas en aristas expuestas + Rim Light frío en microfibras (Charlie Sheen)
 */
export function enhanceFabricShader<T extends THREE.Material>(
  material: T,
  sheenColorHex = 0x9ca3af,
  sheenIntensity = 0.22
): T {
  const sheenCol = new THREE.Color(sheenColorHex);
  material.customProgramCacheKey = () => 'tactical_fabric_v2';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSheenColor = { value: sheenCol };
    shader.uniforms.uSheenIntensity = { value: sheenIntensity };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      varying vec4 vFabZones;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      float fabActiveV = step(0.23, vWorldPos.y) * step(vWorldPos.y, 1.65);
      float fabSweatV = smoothstep(1.08, 1.48, vWorldPos.y) * smoothstep(0.18, 0.04, abs(vWorldPos.x)) * fabActiveV;
      float fabDustV = smoothstep(0.82, 0.26, vWorldPos.y) * fabActiveV;
      float bDy = (vWorldPos.y - 1.005) * 23.8095;
      float beltContactV = exp(-bDy * bDy) * 0.24 * fabActiveV;
      float innerCreviceV = (1.0 - smoothstep(0.09, 0.16, length(vWorldPos.xz))) * smoothstep(0.95, 1.52, vWorldPos.y) * 0.28 * fabActiveV;
      float kDy = (vWorldPos.y - 0.555) * 13.3333;
      float kneeDirtV = exp(-kDy * kDy) * smoothstep(-0.02, 0.06, vWorldPos.z) * fabActiveV;
      vFabZones = vec4(-fabSweatV * 0.22 + fabDustV * 0.08, beltContactV + innerCreviceV, kneeDirtV, smoothstep(0.84, 0.32, vWorldPos.y) * fabActiveV);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform vec3 uSheenColor;
      uniform float uSheenIntensity;
      varying vec3 vWorldPos;
      varying vec4 vFabZones;

      float hashFab31(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      // Modulación física de rugosidad pre-evaluada en vértices (sudor/grasa en chaleco y polvo seco en cotas bajas)
      roughnessFactor = clamp(roughnessFactor + vFabZones.x, 0.30, 0.98);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      // Perturbación micro-estructural de pliegues, costuras dobles y fibras balísticas previa al cálculo PBR de luces
      vec3 dPdxFab = dFdx(vViewPosition);
      vec3 dPdyFab = dFdy(vViewPosition);
      float microTension = sin(vWorldPos.x * 185.0 + vWorldPos.y * 140.0) * cos(vWorldPos.y * 210.0 - vWorldPos.z * 165.0);
      float stFract = fract(vWorldPos.x * 28.0) - 0.5;
      float doubleStitchWave = sin(vWorldPos.y * 620.0) * exp(-stFract * stFract * 18.0);
      normal = normalize(normal + normalize(dPdxFab + 1e-6) * ((microTension * 0.034) + doubleStitchWave * 0.025) + normalize(dPdyFab + 1e-6) * (microTension * 0.030));`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      // 1. Marco tangencial en espacio de vista para anisotropía de filamentos de nylon (Warp & Weft)
      vec3 viewDir = normalize(vViewPosition);
      float ndotv = saturate(dot(normal, viewDir));
      float omNdotV = 1.0 - ndotv;
      vec3 dPosX = dFdx(vViewPosition);
      vec3 tangentV = normalize(dPosX + 1e-6);
      vec3 bitangentV = normalize(cross(normal, tangentV) + 1e-6);

      float tDotV = dot(tangentV, viewDir);
      float bDotV = dot(bitangentV, viewDir);
      float sinTV2 = max(0.0, 1.0 - tDotV * tDotV);
      float sinBV2 = max(0.0, 1.0 - bDotV * bDotV);
      float sbProd2 = sinTV2 * sinBV2;
      float anisoWeave = sbProd2 * sbProd2 * sbProd2 * omNdotV;

      // 2. Oclusión Ambiental de Contacto (Contact AO) y Sombras de Cavidad entre Chaleco, Pouches, Cinturón y Cuerpo
      float activeGearMask = step(0.23, vWorldPos.y) * step(vWorldPos.y, 1.65);
      float normFwidth = length(fwidth(normal));
      float normalVariance = clamp(normFwidth * 2.15, 0.0, 0.46);
      float underFoldAO = mix(0.62, 1.0, smoothstep(-0.75, 0.48, normal.y));
      float pouchUnderhang = smoothstep(0.0, -0.55, normal.y) * smoothstep(0.92, 1.48, vWorldPos.y) * 0.26 * activeGearMask;
      float contactAO = clamp(1.0 - (vFabZones.y + pouchUnderhang), 0.45, 1.0);
      float microCavityAO = (1.0 - normalVariance * (0.52 + 0.48 * ndotv)) * underFoldAO * contactAO;

      // 3. Weathering por zonas: Polvo/tierra en cotas bajas y rodilleras + Sudor/grasa en zonas de roce del chaleco
      float noiseCoarse = sin(vWorldPos.x * 37.0 + cos(vWorldPos.z * 43.0) * 2.2) * cos(vWorldPos.y * 29.0 - sin(vWorldPos.x * 31.0) * 1.8) * 0.5 + 0.5;
      float noiseFine = hashFab31(floor(vWorldPos * 380.0));
      float dirtMask = clamp((vFabZones.w * (0.35 + 0.65 * noiseCoarse) + vFabZones.z * 0.65) * (0.75 + 0.25 * noiseFine), 0.0, 0.68);
      vec3 dryEarthCol = vec3(0.42, 0.35, 0.26);

      // Sudor y grasa por roce en bordes del portaplacas JPC 2.0, hombreras y costuras
      float vestFrictionZone = smoothstep(1.05, 1.54, vWorldPos.y) * (0.45 + 0.55 * noiseCoarse) * activeGearMask;
      float sweatDarken = 1.0 - clamp(vestFrictionZone * 0.20 + normalVariance * 0.18 * activeGearMask, 0.0, 0.26);

      // 4. Micro-desgaste blanquecino (Frayed Whitish Edge Wear) en aristas expuestas de bolsillos, hombros y chaleco
      float exposedEdgeMask = smoothstep(0.18, 0.46, normFwidth) * (0.55 + 0.45 * noiseFine) * activeGearMask;
      vec3 frayedWhiteCol = vec3(0.82, 0.79, 0.73);

      // 5. Retro-reflexión Oren-Nayar + Dispersión Charlie Sheen + Rim Light frío trasero en microfibras
      float om2 = omNdotV * omNdotV;
      float charlieGrazing = om2 * sqrt(omNdotV);
      float coolRimBacklight = om2 * omNdotV * smoothstep(-0.15, 0.75, -normal.z * 0.65 + normal.y * 0.35);
      float orenNayarWrap = smoothstep(0.0, 0.88, omNdotV) * 0.14;
      float baseLuma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
      float shadowMask = smoothstep(0.015, 0.24, baseLuma);

      gl_FragColor.rgb *= microCavityAO * sweatDarken;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, dryEarthCol * (0.55 + 0.45 * baseLuma), dirtMask * 0.48);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, frayedWhiteCol * (0.45 + 0.55 * baseLuma), exposedEdgeMask * 0.26);

      vec3 fiberTerm = uSheenColor * (charlieGrazing * uSheenIntensity + anisoWeave * (uSheenIntensity * 0.48));
      vec3 coolRimTerm = vec3(0.68, 0.84, 0.96) * coolRimBacklight * 0.18 * activeGearMask;
      vec3 roughDiffTerm = vec3(baseLuma * orenNayarWrap);
      gl_FragColor.rgb += (fiberTerm + roughDiffTerm + coolRimTerm) * shadowMask * (0.36 + 0.64 * gl_FragColor.rgb);
      #include <dithering_fragment>
      `
    );
  };
  return material;
}

/**
 * Shader GLSL Hiperrealista para el Traje de Camuflaje Crye Precision G3 (50/50 NYCO Ripstop):
 * 1. Pliegues dinámicos y arrugas de tensión (Normal / Displacement procedural) detrás de rodillas, interior de codos,
 *    ingle y estrangulamiento de correas de rodilleras y cinturón Ronin.
 * 2. Oclusión Ambiental de Contacto (Contact AO) y sombras profundas de cavidad bajo el chaleco JPC 2.0, pouches,
 *    funda Safariland de muslo y cinturón táctico.
 * 3. Weathering multicapa: gradiente de polvo/barro seco desde tobillos hasta muslos, manchas de tierra y roce en
 *    rodillas/codos, y oscurecimiento húmedo con menor rugosidad (sudor/grasa) en axilas, torso y costuras de roce.
 * 4. Rim Light frío en microfibras NYCO (efecto Sheen/Fresnel de contraluz).
 * 5. Costuras dobles reforzadas y micro-desgaste blanquecino en las aristas más expuestas de bolsillos cargo y hombros.
 * (Optimizado con pre-evaluación de máscaras espaciales suaves en Vertex Shader para máxima fluidez sin pérdida visual).
 */
export function enhanceCamoSuitShader<T extends THREE.Material>(material: T): T {
  material.customProgramCacheKey = () => 'tactical_camo_v2';
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      varying vec4 vCamoZonesA;
      varying vec4 vCamoZonesB;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      // Desplazamiento procedural de vértices para arrugas de tensión dinámica en articulaciones y correas
      vec3 wPosEst = (modelMatrix * vec4(transformed, 1.0)).xyz;
      float kneeBackMask = smoothstep(0.45, 0.54, wPosEst.y) * smoothstep(0.65, 0.55, wPosEst.y) * smoothstep(0.02, -0.03, wPosEst.z);
      float kneeWave = sin(wPosEst.y * 230.0 + abs(wPosEst.x) * 95.0) * cos(wPosEst.x * 140.0);
      float groinMaskV = smoothstep(0.76, 0.88, wPosEst.y) * smoothstep(0.98, 0.89, wPosEst.y) * smoothstep(0.16, 0.03, abs(wPosEst.x));
      float groinWave = sin((abs(wPosEst.x) * 160.0 + wPosEst.y * 140.0)) * 0.0018;
      float bPinchU = (wPosEst.y - 1.005) * 38.4615;
      float beltPinchV = -exp(-bPinchU * bPinchU) * 0.0028;
      float sPinch1 = (wPosEst.y - 0.578) * 55.5555;
      float sPinch2 = (wPosEst.y - 0.528) * 55.5555;
      float strapPinchV = -(exp(-sPinch1 * sPinch1) + exp(-sPinch2 * sPinch2)) * 0.0022;
      transformed += normalize(objectNormal + 1e-6) * (kneeBackMask * kneeWave * 0.0022 + groinMaskV * groinWave + beltPinchV + strapPinchV);`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      float absX = abs(vWorldPos.x);
      float wy = vWorldPos.y;
      float wz = vWorldPos.z;

      // Distancias a codos y máscaras articulares pre-evaluadas por vértice
      float dElbow = min(length(vWorldPos - vec3(-0.355, 1.234, 0.026)), length(vWorldPos - vec3(0.118, 1.389, 0.268)));
      float uElbow = dElbow * 13.3333;
      float elbowGauss = exp(-uElbow * uElbow);

      float uBelt = (wy - 1.005) * 21.5;
      float beltGauss = exp(-uBelt * uBelt);
      float uKnee = (wy - 0.555) * 13.5;
      float kneeGauss = exp(-uKnee * uKnee);

      // 1. Rugosidad por sudor/grasa vs barro
      float sweatTorso = smoothstep(1.06, 1.56, wy) * smoothstep(0.22, 0.06, absX);
      float sweatGroin = smoothstep(0.78, 0.92, wy) * smoothstep(0.98, 0.88, wy) * smoothstep(0.14, 0.02, absX);
      float totalSweatRough = clamp(sweatTorso * 0.65 + beltGauss * 0.75 + sweatGroin * 0.70 + elbowGauss * 0.65, 0.0, 1.0);

      // 2. Oclusión Ambiental de Contacto (Contact AO) y Cavidad
      float vestContactAO = smoothstep(1.08, 1.16, wy) * smoothstep(1.56, 1.44, wy) * smoothstep(0.20, 0.11, absX) * 0.34;
      float uShX = (absX - 0.095) * 22.2222;
      float shoulderStrapAO = smoothstep(1.44, 1.52, wy) * smoothstep(1.62, 1.55, wy) * exp(-uShX * uShX) * 0.30;
      float beltContactAO = beltGauss * 0.38;
      float uHolY = (wy - 0.775) * 10.5263;
      float uHolZ = (wz - 0.015) * 11.7647;
      float holsterContactAO = smoothstep(-0.08, -0.15, vWorldPos.x) * exp(-uHolY * uHolY - uHolZ * uHolZ) * 0.42;
      float uThighS = (wy - 0.785) * 35.0;
      float thighStrapG = step(vWorldPos.x, -0.02) * exp(-uThighS * uThighS);
      float thighStrapAO = thighStrapG * 0.35;
      float kneePadContactAO = kneeGauss * 0.30;
      float uCargo = (wy - 0.745) * 10.5263;
      float cargoBorderAO = exp(-uCargo * uCargo) * smoothstep(0.15, 0.21, absX) * 0.22;

      float gearContactFactor = clamp(
        1.0 - (vestContactAO + shoulderStrapAO + beltContactAO + holsterContactAO + thighStrapAO + kneePadContactAO + cargoBorderAO),
        0.38,
        1.0
      );
      float groinCavityAO = 1.0 - smoothstep(0.75, 0.88, wy) * smoothstep(0.96, 0.86, wy) * smoothstep(0.11, 0.01, absX) * 0.36;
      float uAxY = (wy - 1.42) * 15.3846;
      float uAxX = (absX - 0.19) * 18.1818;
      float axillaCavityAO = 1.0 - exp(-uAxY * uAxY - uAxX * uAxX) * 0.34;

      // 3. Zonas de roce (rodillas y codos) y sudor base
      float kneeScuffZone = kneeGauss * smoothstep(-0.02, 0.06, wz);
      float uCollar = (wy - 1.54) * 15.3846;
      float sweatBase = vestContactAO * 1.4 + shoulderStrapAO * 1.3 + beltContactAO * 1.1 + exp(-uCollar * uCollar) * 0.45;

      vCamoZonesA = vec4(
        totalSweatRough,
        gearContactFactor * groinCavityAO * axillaCavityAO,
        kneeScuffZone + elbowGauss,
        sweatBase
      );

      // 4. Máscaras de pliegues dinámicos (fosa poplítea, fosa cubital, ingle y fruncido de correas)
      float popMask = smoothstep(0.45, 0.53, wy) * smoothstep(0.64, 0.55, wy) * smoothstep(0.03, -0.03, wz);
      float cubitalMask = smoothstep(0.12, 0.03, dElbow);
      float inguinalMask = smoothstep(0.76, 0.86, wy) * smoothstep(0.97, 0.89, wy) * smoothstep(0.16, 0.02, absX);
      float uStrap1 = (wy - 0.578) * 35.714;
      float uStrap2 = (wy - 0.525) * 35.714;
      float cinchMask = beltGauss + exp(-uStrap1 * uStrap1) + exp(-uStrap2 * uStrap2) + thighStrapG;

      vCamoZonesB = vec4(popMask, cubitalMask, inguinalMask, cinchMask);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      varying vec4 vCamoZonesA;
      varying vec4 vCamoZonesB;

      float hashCamo31(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      // Weathering de Rugosidad: brillo húmedo de sudor/grasa en torso/axilas/cintura y mate terroso en piernas
      float mudRoughGrad = smoothstep(0.86, 0.23, vWorldPos.y);
      roughnessFactor = clamp(roughnessFactor - vCamoZonesA.x * 0.26 + mudRoughGrad * 0.09, 0.34, 0.99);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      // 1. Mapa de Normales Procedural de Pliegues Dinámicos y Arrugas de Tensión (Rodillas, Codos, Ingle, Cinturón y Correas)
      vec3 dPdxCamo = dFdx(vViewPosition);
      vec3 dPdyCamo = dFdy(vViewPosition);

      float popWrinkle = sin(vWorldPos.y * 280.0 + sin(vWorldPos.x * 110.0) * 2.4) * cos(vWorldPos.x * 160.0 - vWorldPos.y * 190.0);
      float cubitalWrinkle = sin((vWorldPos.y + vWorldPos.z) * 260.0 + cos(vWorldPos.x * 150.0) * 1.8);
      float inguinalWrinkle = sin((abs(vWorldPos.x) * 195.0 + vWorldPos.y * 175.0)) * cos(vWorldPos.z * 140.0);
      float cinchPleats = sin((vWorldPos.x - vWorldPos.z) * 180.0 + vWorldPos.y * 90.0) * vCamoZonesB.w;
      float clothCrease = sin(vWorldPos.y * 95.0 + sin(vWorldPos.x * 68.0) * 1.6) * cos(vWorldPos.x * 88.0 + vWorldPos.z * 82.0);

      float totalWrinkleField = clothCrease * 0.038 + vCamoZonesB.x * popWrinkle * 0.085 + vCamoZonesB.y * cubitalWrinkle * 0.078 +
                                vCamoZonesB.z * inguinalWrinkle * 0.072 + cinchPleats * 0.068;

      normal = normalize(
        normal +
        normalize(dPdxCamo + 1e-6) * totalWrinkleField +
        normalize(dPdyCamo + 1e-6) * (totalWrinkleField * 0.92)
      );`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      vec3 viewDir = normalize(vViewPosition);
      float ndotv = saturate(dot(normal, viewDir));
      float omNdotV = 1.0 - ndotv;
      float om2 = omNdotV * omNdotV;

      // 1. Anisotropía ortogonal de la trama NYCO 50/50 Ripstop en espacio de vista
      vec3 dPosX = dFdx(vViewPosition);
      vec3 tangentV = normalize(dPosX + 1e-6);
      vec3 bitangentV = normalize(cross(normal, tangentV) + 1e-6);
      float tDotV = dot(tangentV, viewDir);
      float bDotV = dot(bitangentV, viewDir);
      float crossBase = max(0.0, 1.0 - abs(tDotV) * abs(bDotV));
      float crossBase2 = crossBase * crossBase;
      float anisoCross = crossBase2 * crossBase * sqrt(crossBase) * om2;

      // 2. OCLUSIÓN AMBIENTAL DE CONTACTO (CONTACT AO) Y SOMBRAS DE CAVIDAD
      float normFwidth = length(fwidth(normal));
      float normCurvature = clamp(normFwidth * 2.10, 0.0, 0.44);
      float underFoldShade = mix(0.58, 1.0, smoothstep(-0.78, 0.46, normal.y));
      float foldShadow = (1.0 - normCurvature * (0.52 + 0.44 * ndotv)) * underFoldShade * vCamoZonesA.y;

      // 3. WEATHERING MULTICAPA (Polvo/Barro Seco en Piernas, Roce en Rodillas/Codos y Sudor/Grasa en Torso/Costuras):
      float pNoise1 = sin(vWorldPos.x * 31.0 + cos(vWorldPos.z * 37.0) * 2.1) * cos(vWorldPos.y * 27.0 - sin(vWorldPos.x * 23.0) * 1.9) * 0.5 + 0.5;
      float pNoise2 = sin(vWorldPos.x * 113.0 - vWorldPos.y * 89.0) * cos(vWorldPos.z * 107.0 + vWorldPos.y * 73.0) * 0.5 + 0.5;
      float microGrain = hashCamo31(floor(vWorldPos * 420.0));

      float ankleToThighGrad = smoothstep(0.88, 0.24, vWorldPos.y);
      float lowerSplashGrad = smoothstep(0.48, 0.24, vWorldPos.y);
      float dustPattern = ankleToThighGrad * (0.38 + 0.62 * pNoise1) + lowerSplashGrad * (0.35 + 0.65 * pNoise2);
      float totalDirtMask = clamp(dustPattern * 0.62 + vCamoZonesA.z * (0.45 + 0.55 * pNoise2), 0.0, 0.78);

      vec3 dryMudColor = vec3(0.35, 0.28, 0.20);
      vec3 aridDustColor = vec3(0.58, 0.50, 0.39);
      vec3 weatheringPigment = mix(aridDustColor, dryMudColor, clamp(lowerSplashGrad + vCamoZonesA.z * 0.5, 0.0, 1.0));

      float sweatZoneMask = clamp(vCamoZonesA.w + normCurvature * 0.45, 0.0, 0.85) * (0.65 + 0.35 * pNoise1);
      float sweatDarkening = 1.0 - sweatZoneMask * 0.25;

      // 4. DETALLES DE COSTURAS DOBLES Y BORDES DESHILACHADOS (Micro-desgaste blanquecino en aristas expuestas)
      float ridgeMask = smoothstep(0.16, 0.44, normFwidth) * (0.50 + 0.50 * microGrain);
      float uWearCargo = (vWorldPos.y - 0.75) * 9.0909;
      float uWearShoulder = (vWorldPos.y - 1.44) * 8.3333;
      float highWearZones = 0.45 + 0.55 * (exp(-uWearCargo * uWearCargo) + exp(-uWearShoulder * uWearShoulder) + vCamoZonesA.z);
      float frayedEdgeWear = clamp(ridgeMask * highWearZones, 0.0, 0.65);
      vec3 bleachedFiberTint = vec3(0.84, 0.81, 0.75);

      // 5. ILUMINACIÓN RIM LIGHT (Contraluz frío en microfibras NYCO) + Retro-dispersión Oren-Nayar
      float baseLuma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
      float lightMask = smoothstep(0.015, 0.26, baseLuma);
      float cottonFuzz = om2 * sqrt(omNdotV) * 0.12;
      float coolRimFresnel = om2 * omNdotV * smoothstep(-0.20, 0.75, -normal.z * 0.65 + normal.y * 0.35);
      vec3 nycoSheenTint = vec3(0.76, 0.71, 0.60);
      vec3 coolRimColor = vec3(0.66, 0.83, 0.96);

      // Composición final físicamente integrada
      gl_FragColor.rgb *= foldShadow * sweatDarkening;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, weatheringPigment * (0.42 + 0.58 * baseLuma), totalDirtMask * 0.56);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, bleachedFiberTint * (0.40 + 0.60 * baseLuma), frayedEdgeWear * 0.32);
      gl_FragColor.rgb += (nycoSheenTint * (cottonFuzz + anisoCross * 0.06) + coolRimColor * coolRimFresnel * 0.20) *
                          lightMask * (0.40 + 0.60 * gl_FragColor.rgb);
      #include <dithering_fragment>
      `
    );
  };
  return material;
}

/**
 * Shader GLSL de Dispersión Subsuperficial Pre-Integrada (Pre-Integrated SSS) y Especular Epidérmico Dual
 * para Piel Humana y Ojos Hiperrealistas:
 * - Sangrado subdérmico de hemoglobina (rojizo cálido intenso) en los bordes de luz, terminadores de sombra
 *   y siluetas a contraluz (Rim-Lit Subsurface Scattering)
 * - Lóbulo especular lipídico/sebáceo dual en ángulos rasantes (Fresnel Schlick epidérmico)
 * - Auto-oclusión micro-folicular en poros y surcos de Langer
 */
export function enhanceSubsurfaceSkinShader<T extends THREE.Material>(material: T): T {
  material.customProgramCacheKey = () => 'tactical_skin_v2';
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      vec3 viewDir = normalize(vViewPosition);
      float ndotv = saturate(dot(normal, viewDir));
      float omNdotV = 1.0 - ndotv;
      float om2 = omNdotV * omNdotV;

      // 1. Estimación métrica de curvatura dérmica local en espacio de pantalla
      float dNormalLen = length(fwidth(normal));
      float dPosLen = max(0.0004, length(fwidth(vViewPosition)));
      float skinCurvature = clamp((dNormalLen / dPosLen) * 0.0095, 0.0, 1.0);

      // 2. Dispersión Subsuperficial Rojiza (Reddish Subdermal Hemoglobin Bleed) en bordes de luz y contraluz (Rim SSS)
      float luma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
      float terminatorZone = smoothstep(0.02, 0.42, luma) * smoothstep(0.85, 0.18, luma);
      float rimSubsurface = om2 * smoothstep(0.02, 0.48, luma);
      float wrapScatter = rimSubsurface * 0.62 + terminatorZone * (0.65 + 0.45 * skinCurvature);
      vec3 subdermalBlood = vec3(0.92, 0.18, 0.09);

      // 3. Lóbulo especular epidérmico sebáceo (Película lipídica húmeda de sudor en ángulos rasantes)
      float sebumFresnel = om2 * omNdotV * sqrt(omNdotV) * 0.18 * smoothstep(0.04, 0.36, luma);
      float poreOcclusion = 1.0 - clamp(dNormalLen * 0.85, 0.0, 0.18);

      gl_FragColor.rgb *= poreOcclusion;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + subdermalBlood * 0.28, clamp(wrapScatter * 0.78, 0.0, 0.58));
      gl_FragColor.rgb += vec3(0.98, 0.88, 0.82) * sebumFresnel;
      #include <dithering_fragment>
      `
    );
  };
  return material;
}

/**
 * Shader GLSL para Polímeros Tácticos, Kydex, Rodilleras/Coderas Crye AirFlex, Hypalon y Guantes TPR:
 * - Desgaste de bordes guiado por curvatura geométrica (Curvature-Driven Bevel Edge Wear)
 * - Manchas de tierra seca, barro y arañazos de roce en las cúpulas de rodilleras y coderas
 * - Oclusión de suciedad/polvo mate en cavidades y surcos de moldeo por inyección
 */
export function enhanceTacticalPolymerShader<T extends THREE.Material>(
  material: T,
  edgeWearTintHex = 0x94a3b8,
  edgeWearStrength = 0.16
): T {
  const edgeCol = new THREE.Color(edgeWearTintHex);
  material.customProgramCacheKey = () => 'tactical_polymer_v2';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEdgeTint = { value: edgeCol };
    shader.uniforms.uEdgeStrength = { value: edgeWearStrength };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      varying vec4 vPolyZones;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      float activePolyV = step(0.25, vWorldPos.y) * step(vWorldPos.y, 1.64);
      float uKneeP = (vWorldPos.y - 0.555) * 12.8205;
      float kneeGaussP = exp(-uKneeP * uKneeP);
      float dElbowP = min(length(vWorldPos - vec3(-0.355, 1.234, 0.026)), length(vWorldPos - vec3(0.118, 1.389, 0.268)));
      float uElbowP = dElbowP * 12.8205;
      float elbowGaussP = exp(-uElbowP * uElbowP);
      float uHolP = (vWorldPos.y - 0.775) * 10.0;
      float holsterZoneP = smoothstep(-0.08, -0.16, vWorldPos.x) * exp(-uHolP * uHolP) * activePolyV;
      float kneePadZoneP = kneeGaussP * smoothstep(0.0, 0.08, vWorldPos.z) * activePolyV;
      float elbowPadZoneP = elbowGaussP * activePolyV;
      vPolyZones = vec4(
        (kneeGaussP + elbowGaussP) * step(0.25, vWorldPos.y),
        kneePadZoneP * 0.78 + elbowPadZoneP * 0.72 + holsterZoneP * 0.35,
        kneePadZoneP + elbowPadZoneP,
        0.0
      );`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform vec3 uEdgeTint;
      uniform float uEdgeStrength;
      varying vec3 vWorldPos;
      varying vec4 vPolyZones;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      // Mayor rugosidad mate en zonas de impacto de rodilleras y coderas por abrasión contra tierra/roca
      roughnessFactor = clamp(roughnessFactor + vPolyZones.x * 0.12, 0.25, 0.99);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      vec3 viewDir = normalize(vViewPosition);
      float ndotv = saturate(dot(normal, viewDir));
      float omNdotV = 1.0 - ndotv;

      // 1. Curvatura de aristas para detectar biseles expuestos vs ranuras hundidas
      float normalGrad = length(fwidth(normal));
      float bevelMask = smoothstep(0.14, 0.48, normalGrad);
      float creviceAO = 1.0 - clamp(normalGrad * 1.05, 0.0, 0.28) * ndotv;

      // 2. Manchas de tierra, barro seco y arañazos de roce en Rodilleras y Coderas
      float scrapeNoise = sin(vWorldPos.x * 340.0 + vWorldPos.y * 85.0) * cos(vWorldPos.y * 290.0 - vWorldPos.z * 210.0) * 0.5 + 0.5;
      float blotchNoise = sin(vWorldPos.x * 48.0 + cos(vWorldPos.y * 52.0) * 2.0) * 0.5 + 0.5;
      float padDirtMask = clamp(vPolyZones.y * (0.40 + 0.60 * blotchNoise), 0.0, 0.75);
      float padScuffScratch = clamp(vPolyZones.z * smoothstep(0.68, 0.92, scrapeNoise), 0.0, 0.55);

      vec3 dryEarthSmudge = vec3(0.44, 0.37, 0.28);
      vec3 rockScuffCol = vec3(0.66, 0.62, 0.56);

      // 3. Desgaste por roce en aristas vivas (Edge Highlight) + Rim Light frío sutil
      float grazing = omNdotV * omNdotV * sqrt(omNdotV);
      float luma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
      float lightVis = smoothstep(0.015, 0.22, luma);

      gl_FragColor.rgb *= creviceAO;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, dryEarthSmudge * (0.45 + 0.55 * luma), padDirtMask * 0.58);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, rockScuffCol * (0.40 + 0.60 * luma), padScuffScratch * 0.36);
      gl_FragColor.rgb += uEdgeTint * (bevelMask * 0.48 + grazing * 0.52) * uEdgeStrength * lightVis;
      #include <dithering_fragment>
      `
    );
  };
  return material;
}

export interface OpsCoreShellResult {
  shellGeo: THREE.BufferGeometry;
  rimCurve: THREE.CatmullRomCurve3;
}

/**
 * Evalúa un punto y normal sobre la superficie paramétrica anatómica del casco Ops-Core FAST SF.
 */
export function evalOpsCoreSurfacePoint(
  uFrac: number,
  t: number,
  width = 0.226,
  length = 0.264,
  height = 0.160,
  offset = 0.0,
  earCutoutLift = 0.048,
  napeFlareDrop = 0.026
): THREE.Vector3 {
  const halfW = width * 0.5 + offset;
  const halfL = length * 0.5 + offset;
  const topY = height * 0.5 + offset;
  const rimBaseY = -(height * 0.36) - offset;

  const tClamped = THREE.MathUtils.clamp(t, 0.0001, 1.0);
  const tDome = Math.sin(tClamped * Math.PI * 0.5);
  const domeDrop = Math.pow(tClamped, 1.72);

  const phi = uFrac * Math.PI * 2.0;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);

  let rx = halfW * Math.pow(tDome, 0.62);
  let rz = halfL * Math.pow(tDome, 0.62);

  if (cosP > -0.35 && cosP < 0.25) {
    rx *= 1.028;
  }

  if (cosP > 0.68 && tClamped > 0.42) {
    const flatFactor = (cosP - 0.68) / 0.32;
    rz *= 1.0 - 0.068 * flatFactor;
  }

  let chineLift = 0.0;
  if (Math.abs(sinP) < 0.30 && tClamped < 0.78) {
    const ridgeProfile = Math.cos((Math.abs(sinP) / 0.30) * Math.PI * 0.5);
    chineLift = 0.0046 * ridgeProfile * (1.0 - tClamped / 0.78);
  }

  // 2. Altura anatómica del borde (Front Brow Cutout sobre las gafas, Temple Flare, Super High Cut sobre orejas y caída occipital en nuca)
  // Frente (cosP > 0): el borde frontal del Ops-Core FAST SF se eleva por encima del arco superciliar y las gafas Oakley (+0.026m)
  const browWeight = cosP > 0 ? Math.pow(cosP, 1.45) : 0;
  const browLift = (earCutoutLift * 1.68) * browWeight;

  // Oreja derecha en phi ~ PI/2, oreja izquierda en phi ~ 3PI/2 (Arco Super High Cut para ComTac VI)
  const earWeight = Math.pow(Math.abs(sinP), 2.0) * Math.exp(-2.4 * Math.pow(cosP + 0.05, 2));
  const earLift = (earCutoutLift * 1.52) * earWeight;

  // Ligera bajada protectora en la sien (entre la frente y el arco de la oreja, cosP ~ 0.55)
  const templeDip = cosP > 0 ? 0.008 * Math.sin(cosP * Math.PI) * Math.abs(sinP) : 0;

  // Caída protectora occipital en la nuca (cosP < 0)
  const napeWeight = cosP < 0 ? Math.pow(-cosP, 1.55) : 0;
  const napeDrop = (napeFlareDrop * 0.65) * napeWeight;

  // Pestaña balística acampanada hacia afuera en el labio inferior (t > 0.82)
  let lipFlare = 0.0;
  if (tClamped > 0.82) {
    const flareT = (tClamped - 0.82) / 0.18;
    lipFlare = 0.0036 * Math.sin(flareT * Math.PI * 0.5);
  }

  const px = sinP * (rx + lipFlare);
  const pz = cosP * (rz + lipFlare);
  const py =
    topY * (1.0 - domeDrop) +
    (rimBaseY + browLift + earLift - templeDip - napeDrop) * domeDrop +
    chineLift;

  return new THREE.Vector3(px, py, pz);
}

/**
 * Genera un panel 3D con espesor biselado (Velcro Loop, Parche IR, Panel de Malla o Placa de Refuerzo)
 * perfectamente amoldado a la curvatura compuesta de la calota Ops-Core FAST SF.
 */
export function createHelmetSurfacePatchGeometry(
  uStart: number,
  uEnd: number,
  tStart: number,
  tEnd: number,
  radialOffset = 0.0028,
  thickness = 0.0022,
  uSegs = 24,
  tSegs = 16,
  width = 0.226,
  length = 0.264,
  height = 0.160
): THREE.BufferGeometry {
  const numVerts = (uSegs + 1) * (tSegs + 1);
  const positions = new Float32Array(numVerts * 3);
  const normals = new Float32Array(numVerts * 3);
  const uvs = new Float32Array(numVerts * 2);
  const indices: number[] = [];

  let vertIdx = 0;
  for (let it = 0; it <= tSegs; it++) {
    const vt = it / tSegs;
    const t = THREE.MathUtils.lerp(tStart, tEnd, vt);
    // Bisel perimetral suave en los 4 bordes para que el parche/velcro se asiente sin bordes abiertos
    const edgeT = Math.min(vt, 1.0 - vt);
    const bevelT = THREE.MathUtils.smoothstep(edgeT, 0.0, 0.14);

    for (let iu = 0; iu <= uSegs; iu++) {
      const vu = iu / uSegs;
      const u = THREE.MathUtils.lerp(uStart, uEnd, vu);
      const edgeU = Math.min(vu, 1.0 - vu);
      const bevelU = THREE.MathUtils.smoothstep(edgeU, 0.0, 0.14);

      // Redondeo de las 4 esquinas en el bisel
      const cornerBevel = bevelT * bevelU;
      const localOffset = radialOffset + thickness * cornerBevel;

      const p = evalOpsCoreSurfacePoint(u, t, width, length, height, localOffset);
      positions[vertIdx * 3] = p.x;
      positions[vertIdx * 3 + 1] = p.y;
      positions[vertIdx * 3 + 2] = p.z;

      uvs[vertIdx * 2] = vu;
      uvs[vertIdx * 2 + 1] = 1.0 - vt;
      vertIdx++;
    }
  }

  for (let it = 0; it < tSegs; it++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = it * (uSegs + 1) + iu;
      const b = (it + 1) * (uSegs + 1) + iu;
      const c = (it + 1) * (uSegs + 1) + (iu + 1);
      const d = it * (uSegs + 1) + (iu + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Genera la geometría paramétrica anatómica del casco balístico Ops-Core FAST SF Super High Cut.
 * - Perfil balístico anatómico con cresta chine longitudinal central y bisel plano frontal para montura Wilcox
 * - Arcos de corte súper alto (Super High Cut) sobre las orejas para acoplar auriculares tácticos ComTac VI
 * - Caída y pestaña acampanada de protección de la nuca y el hueso occipital
 * - Soporta recorte perimetral (`tMaxFraction`) y escote frontal (`shroudCutout`) para la funda textil Cordura
 */
export function createOpsCoreShellGeometry(
  width = 0.224,
  length = 0.260,
  height = 0.158,
  offset = 0.0,
  earCutoutLift = 0.046,
  napeFlareDrop = 0.026,
  tMaxFraction = 1.0,
  shroudCutout = false
): OpsCoreShellResult {
  const uSegs = 56;
  const vSegs = 36;

  const numVerts = (uSegs + 1) * (vSegs + 1);
  const positions = new Float32Array(numVerts * 3);
  const normals = new Float32Array(numVerts * 3);
  const uvs = new Float32Array(numVerts * 2);
  const indices: number[] = [];

  const rimPoints: THREE.Vector3[] = [];

  let vertIdx = 0;
  for (let iv = 0; iv <= vSegs; iv++) {
    const vNorm = iv / vSegs; // 0 a 1

    for (let iu = 0; iu <= uSegs; iu++) {
      const uFrac = iu / uSegs;
      const phi = uFrac * Math.PI * 2.0;
      const cosP = Math.cos(phi);

      // Si es la funda textil (shroudCutout = true), recortar un arco limpio sobre la montura Wilcox frontal
      let localTMax = tMaxFraction;
      if (shroudCutout && cosP > 0.78) {
        const frontArch = (cosP - 0.78) / 0.22;
        localTMax = tMaxFraction - 0.14 * Math.sin(frontArch * Math.PI * 0.5);
      }

      const t = vNorm * localTMax;
      // Biselar el borde inferior de la funda hacia la calota para que no flote
      let localOffset = offset;
      if (shroudCutout && vNorm > 0.90) {
        const edgeFade = 1.0 - (vNorm - 0.90) / 0.10;
        localOffset = offset * edgeFade;
      }

      const p = evalOpsCoreSurfacePoint(
        uFrac,
        t,
        width,
        length,
        height,
        localOffset,
        earCutoutLift,
        napeFlareDrop
      );

      positions[vertIdx * 3] = p.x;
      positions[vertIdx * 3 + 1] = p.y;
      positions[vertIdx * 3 + 2] = p.z;

      uvs[vertIdx * 2] = uFrac;
      uvs[vertIdx * 2 + 1] = t;

      if (iv === vSegs && iu < uSegs) {
        rimPoints.push(new THREE.Vector3(p.x, p.y, p.z));
      }

      vertIdx++;
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * (uSegs + 1) + iu;
      const b = (iv + 1) * (uSegs + 1) + iu;
      const c = (iv + 1) * (uSegs + 1) + (iu + 1);
      const d = iv * (uSegs + 1) + (iu + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const rimCurve = new THREE.CatmullRomCurve3(rimPoints, true);

  return { shellGeo: geo, rimCurve };
}



