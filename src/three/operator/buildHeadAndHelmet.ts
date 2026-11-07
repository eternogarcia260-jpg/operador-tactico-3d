import * as THREE from 'three';
import { MaterialLibrary, OperatorSkeleton } from '../types';
import {
  sculptClothFolds,
  createRoundedRectShape,
  createOrganicExtrude,
  createOrganicPouchVolume,
  createOpsCoreShellGeometry,
  createHelmetSurfacePatchGeometry
} from '../geometry/organicGeometry';

/**
 * ============================================================================
 * SISTEMA BALÍSTICO TIER-1: CASCO OPS-CORE FAST SF SUPER HIGH CUT,
 * VISOR INFRARROJO PANORÁMICO L3HARRIS GPNVG-18 Y SISTEMA DE ILUMINACIÓN TÁCTICA
 * ACABADO FOTORREALISTA CINEMATOGRÁFICO DE ALTA PRECISIÓN (PBR + UE5 FIDELITY)
 * ============================================================================
 */
export function buildHeadAndHelmet(materials: MaterialLibrary, skeleton: OperatorSkeleton): void {
  // --------------------------------------------------------------------------
  // 1. CUELLO Y CRÁNEO ANATÓMICO CON PASAMONTAÑAS IGNÍFUGO ARC'TERYX FR
  // --------------------------------------------------------------------------
  const neckMesh = new THREE.Mesh(
    sculptClothFolds(new THREE.CylinderGeometry(0.068, 0.079, 0.115, 28, 10), 6, 12, 0.0035),
    materials.balaclava
  );
  neckMesh.position.y = 0.02;
  skeleton.neck.add(neckMesh);

  const headMeshGeo = sculptClothFolds(new THREE.SphereGeometry(0.108, 40, 32), 7, 14, 0.0016);
  headMeshGeo.scale(0.92, 1.01, 1.01);
  const headMesh = new THREE.Mesh(headMeshGeo, materials.balaclava);
  headMesh.position.y = 0.065;
  skeleton.head.add(headMesh);

  // --------------------------------------------------------------------------
  // 2. ROSTRO SUPERIOR, ARCO SUPERCILIAR Y OJOS HÚMEDOS CON MENISCO CORNEAL
  // --------------------------------------------------------------------------
  const faceGroup = new THREE.Group();
  faceGroup.position.set(0, 0.095, 0.062);
  skeleton.head.add(faceGroup);

  const eyeSkinZone = new THREE.Mesh(new THREE.SphereGeometry(0.102, 28, 20), materials.skin);
  eyeSkinZone.scale.set(0.86, 0.34, 0.54);
  faceGroup.add(eyeSkinZone);

  const browRidgeGeo = createOrganicPouchVolume(0.104, 0.016, 0.038, {
    roundnessXZ: 0.65,
    roundnessY: 0.60,
    pillowBulge: 0.10,
    wrinkleAmp: 0
  });
  const browRidge = new THREE.Mesh(browRidgeGeo, materials.skin);
  browRidge.position.set(0, 0.019, 0.030);
  browRidge.rotation.x = 0.16;
  faceGroup.add(browRidge);

  const noseBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.010, 0.024, 10, 14), materials.skin);
  noseBridge.position.set(0, -0.005, 0.044);
  noseBridge.rotation.x = -0.24;
  faceGroup.add(noseBridge);

  skeleton.eyes = [];
  for (const side of [-1, 1]) {
    const eyeUnit = new THREE.Group();
    eyeUnit.position.set(side * 0.030, 0.003, 0.036);
    faceGroup.add(eyeUnit);

    const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.0132, 22, 18), materials.eyeSclera);
    eyeUnit.add(eyeball);

    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.0064, 20), materials.eyeIris);
    iris.position.z = 0.0129;
    eyeUnit.add(iris);

    const pupil = new THREE.Mesh(
      new THREE.CircleGeometry(0.0029, 16),
      new THREE.MeshBasicMaterial({ color: 0x020202 })
    );
    pupil.position.z = 0.0131;
    eyeUnit.add(pupil);

    const eyebrow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0030, 0.025, 6, 10), materials.balaclava);
    eyebrow.position.set(0, 0.013, 0.009);
    eyebrow.rotation.z = Math.PI * 0.5 + side * 0.12;
    eyeUnit.add(eyebrow);

    skeleton.eyes.push(eyeUnit);
  }

  const maskLowerGeo = sculptClothFolds(new THREE.CylinderGeometry(0.095, 0.080, 0.118, 28, 10), 9, 14, 0.0032);
  maskLowerGeo.scale(0.93, 1, 1.06);
  const maskLower = new THREE.Mesh(maskLowerGeo, materials.balaclava);
  maskLower.position.set(0, 0.033, 0.011);
  skeleton.head.add(maskLower);

  // Ribete de costura del contorno ocular del pasamontañas ignífugo
  const maskSeamArch = new THREE.Mesh(
    new THREE.TorusGeometry(0.056, 0.0024, 8, 28, Math.PI),
    materials.stitchThread
  );
  maskSeamArch.position.set(0, 0.086, 0.098);
  maskSeamArch.rotation.x = 0.25;
  maskSeamArch.scale.set(1.35, 0.38, 0.65);
  skeleton.head.add(maskSeamArch);

  // --------------------------------------------------------------------------
  // 3. GAFAS BALÍSTICAS TÁCTICAS OAKLEY SI BALLISTIC M-FRAME ALPHA
  // --------------------------------------------------------------------------
  const glassesGroup = new THREE.Group();
  glassesGroup.position.set(0, 0.097, 0.020);
  skeleton.head.add(glassesGroup);

  // Lente envolvente Plutonite con curvatura tórica balística
  const visorGeo = new THREE.CylinderGeometry(0.105, 0.101, 0.038, 44, 1, true, -Math.PI * 0.34, Math.PI * 0.68);
  const visor = new THREE.Mesh(visorGeo, materials.visorGlass);
  glassesGroup.add(visor);

  // Montura superior en polímero O-Matter negro mate con puertos de ventilación anti-vaho
  const frameTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.107, 0.106, 0.0075, 44, 1, true, -Math.PI * 0.36, Math.PI * 0.72),
    materials.darkPolymer
  );
  frameTop.position.y = 0.019;
  glassesGroup.add(frameTop);

  // Clip central de bloqueo rápido de lente Oakley Alpha
  const centerClip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.011, 0.008), materials.darkPolymer);
  centerClip.position.set(0, 0.018, 0.106);
  glassesGroup.add(centerClip);

  // Puente nasal interior en elastómero Unobtainium (alojado detrás de la lente sin sobresalir)
  const noseBridgePad = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.008), materials.combatRubber);
  noseBridgePad.position.set(0, -0.010, 0.096);
  glassesGroup.add(noseBridgePad);

  // Patillas laterales ultradelgadas compatibles con auriculares ComTac VI
  for (const side of [-1, 1]) {
    const templeArm = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.0065, 0.068), materials.darkPolymer);
    templeArm.position.set(side * 0.096, 0.012, 0.015);
    templeArm.rotation.y = -side * 0.12;
    glassesGroup.add(templeArm);
  }

  // --------------------------------------------------------------------------
  // 4. CONJUNTO MAESTRO DEL CASCO TÁCTICO OPS-CORE FAST SF SUPER HIGH CUT
  // --------------------------------------------------------------------------
  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(0, 0.088, -0.004);
  skeleton.head.add(helmetGroup);

  // A) CALOTA BALÍSTICA DE COMPUESTO DE CARBONO/UHMWPE CON PINTURA CARC FDE SÍLICE
  const { shellGeo, rimCurve } = createOpsCoreShellGeometry(
    0.226,
    0.264,
    0.160,
    0.0,
    0.048,
    0.026,
    1.0,
    false
  );
  const helmetShellMesh = new THREE.Mesh(shellGeo, materials.helmetShell);
  helmetGroup.add(helmetShellMesh);

  // B) FORRO DE IMPACTO INTERIOR OPS-CORE VENTED LUX LINER (EPS negro grafito bajo la calota)
  const { shellGeo: innerLinerGeo } = createOpsCoreShellGeometry(
    0.218,
    0.254,
    0.152,
    -0.0035,
    0.048,
    0.026,
    0.98,
    false
  );
  const innerLinerMesh = new THREE.Mesh(innerLinerGeo, materials.darkPolymer);
  helmetGroup.add(innerLinerMesh);

  // C) RIBETE PERIMETRAL VULCANIZADO EN CAUCHO BALÍSTICO CONTINUO EPDM
  const rimGeo = new THREE.TubeGeometry(rimCurve, 72, 0.0036, 12, true);
  const rimMesh = new THREE.Mesh(rimGeo, materials.helmetRimRubber);
  helmetGroup.add(rimMesh);

  // D) FUNDA TÁCTICA MODULAR CORDURA 500D MULTICAM CON CORTE LÁSER Y ESCOTE FRONTAL
  // Deja expuesta la banda perimetral inferior de la calota balística FDE y el asiento del shroud Wilcox
  const { shellGeo: coverGeo, rimCurve: coverRimCurve } = createOpsCoreShellGeometry(
    0.226,
    0.264,
    0.160,
    0.0022,
    0.048,
    0.026,
    0.88,
    true
  );
  const coverMesh = new THREE.Mesh(coverGeo, materials.helmetCover);
  helmetGroup.add(coverMesh);

  // Ribete textil de acabado (Binding Tape) cosido alrededor del borde de la funda MultiCam
  const coverBindingGeo = new THREE.TubeGeometry(coverRimCurve, 64, 0.0018, 8, true);
  const coverBindingMesh = new THREE.Mesh(coverBindingGeo, materials.webbing);
  helmetGroup.add(coverBindingMesh);

  // E) PANELES DE VELCRO LOOP PILE CONFORMADOS EN 3D SOBRE LA SUPERFICIE DEL CASCO
  // Paneles laterales parietales (Derecho: u = 0.14..0.36, Izquierdo: u = 0.64..0.86)
  const rightVelcroGeo = createHelmetSurfacePatchGeometry(0.14, 0.36, 0.34, 0.78, 0.0024, 0.0022, 22, 14);
  const leftVelcroGeo = createHelmetSurfacePatchGeometry(0.64, 0.86, 0.34, 0.78, 0.0024, 0.0022, 22, 14);
  helmetGroup.add(new THREE.Mesh(rightVelcroGeo, materials.patchMat));
  helmetGroup.add(new THREE.Mesh(leftVelcroGeo, materials.patchMat));

  // Paneles traseros occipitales de Velcro Loop
  const rearRightVelcro = createHelmetSurfacePatchGeometry(0.41, 0.48, 0.42, 0.82, 0.0024, 0.0020, 12, 12);
  const rearLeftVelcro = createHelmetSurfacePatchGeometry(0.52, 0.59, 0.42, 0.82, 0.0024, 0.0020, 12, 12);
  helmetGroup.add(new THREE.Mesh(rearRightVelcro, materials.patchMat));
  helmetGroup.add(new THREE.Mesh(rearLeftVelcro, materials.patchMat));

  // Puente central Mohawk de Velcro Loop desde la corona frontal hasta la nuca
  const crownMohawkLeft = createHelmetSurfacePatchGeometry(0.0, 0.055, 0.08, 0.65, 0.0024, 0.0022, 10, 18);
  const crownMohawkRight = createHelmetSurfacePatchGeometry(0.945, 1.0, 0.08, 0.65, 0.0024, 0.0022, 10, 18);
  const crownMohawkRear = createHelmetSurfacePatchGeometry(0.455, 0.545, 0.08, 0.76, 0.0024, 0.0022, 12, 18);
  helmetGroup.add(new THREE.Mesh(crownMohawkLeft, materials.patchMat));
  helmetGroup.add(new THREE.Mesh(crownMohawkRight, materials.patchMat));
  helmetGroup.add(new THREE.Mesh(crownMohawkRear, materials.patchMat));

  // F) PARCHES TÁCTICOS IR SUBDUED RETRORREFLECTANTES AMOLDADOS AL VELCRO LATERAL
  const rightIrPatchGeo = createHelmetSurfacePatchGeometry(0.18, 0.32, 0.42, 0.70, 0.0046, 0.0020, 18, 12);
  const leftIrPatchGeo = createHelmetSurfacePatchGeometry(0.68, 0.82, 0.42, 0.70, 0.0046, 0.0020, 18, 12);
  helmetGroup.add(new THREE.Mesh(rightIrPatchGeo, materials.irReflectivePatch));
  helmetGroup.add(new THREE.Mesh(leftIrPatchGeo, materials.irReflectivePatch));

  // Celdas de ventilación cortadas por láser en los flancos superiores de la funda
  for (const side of [-1, 1]) {
    for (let vIdx = 0; vIdx < 3; vIdx++) {
      const ventSlot = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, 0.006, 0.018),
        materials.darkPolymer
      );
      ventSlot.position.set(side * (0.072 + vIdx * 0.006), 0.056 - vIdx * 0.006, 0.024 - vIdx * 0.024);
      ventSlot.rotation.z = -side * 0.62;
      helmetGroup.add(ventSlot);
    }
  }

  // --------------------------------------------------------------------------
  // 5. SISTEMA INTERIOR LUX LINER + RUEDA OCC-DIAL BOA + BARBOQUEJO DE 4 PUNTOS
  // --------------------------------------------------------------------------
  const padShape = createRoundedRectShape(0.044, 0.028, 0.007);
  const padGeo = createOrganicExtrude(padShape, 0.012, 0.003, 4, 12, 2);
  for (const [pX, pY, pZ, rY, rZ] of [
    [-0.084, 0.004, 0.018, Math.PI * 0.5, 0.18],
    [0.084, 0.004, 0.018, -Math.PI * 0.5, -0.18],
    [0.0, -0.022, -0.114, Math.PI, 0.0],
    [-0.052, -0.016, -0.096, Math.PI * 0.8, 0.1],
    [0.052, -0.016, -0.096, -Math.PI * 0.8, -0.1],
    [0.0, 0.028, 0.104, 0.0, 0.0]
  ]) {
    const pad = new THREE.Mesh(padGeo, materials.combatRubber);
    pad.position.set(pX, pY, pZ);
    pad.rotation.y = rY;
    pad.rotation.z = rZ;
    helmetGroup.add(pad);
  }

  // Rueda tensora Occ-Dial / BOA Fit System en la nuca occipital
  const occDialGroup = new THREE.Group();
  occDialGroup.position.set(0, -0.046, -0.114);
  occDialGroup.rotation.x = -0.28;
  helmetGroup.add(occDialGroup);

  const occDialHousing = new THREE.Mesh(
    createOrganicPouchVolume(0.054, 0.028, 0.016, { roundnessXZ: 0.55, roundnessY: 0.55, pillowBulge: 0.06 }),
    materials.darkPolymer
  );
  occDialGroup.add(occDialHousing);

  const occDialKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0125, 0.009, 24), materials.gunmetal);
  occDialKnob.rotation.x = Math.PI * 0.5;
  occDialKnob.position.z = -0.010;
  occDialGroup.add(occDialKnob);

  // Estrías moleteadas del dial BOA
  for (let k = 0; k < 12; k++) {
    const ka = (k / 12) * Math.PI * 2;
    const knurl = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.0022, 0.008), materials.darkPolymer);
    knurl.position.set(Math.cos(ka) * 0.012, Math.sin(ka) * 0.012, -0.010);
    knurl.rotation.z = ka;
    occDialGroup.add(knurl);
  }

  // Cinchas de barboquejo Ops-Core Head-Loc de 4 puntos en espiga
  const chinStrapGeo = createOrganicPouchVolume(0.0042, 0.094, 0.013, {
    roundnessXZ: 0.52,
    roundnessY: 0.28,
    pillowBulge: 0.04,
    wrinkleAmp: 0.0006
  });

  for (const side of [-1, 1]) {
    const strapFront = new THREE.Mesh(chinStrapGeo, materials.webbing);
    strapFront.position.set(side * 0.075, -0.038, 0.036);
    strapFront.rotation.z = side * 0.28;
    strapFront.rotation.x = 0.24;
    helmetGroup.add(strapFront);

    const strapRear = new THREE.Mesh(chinStrapGeo, materials.webbing);
    strapRear.position.set(side * 0.071, -0.040, -0.022);
    strapRear.rotation.z = side * 0.22;
    strapRear.rotation.x = -0.24;
    helmetGroup.add(strapRear);

    // Hebilla de bloqueo rápido Cam-Fit
    const camFitBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.016), materials.darkPolymer);
    camFitBuckle.position.set(side * 0.080, -0.032, 0.006);
    camFitBuckle.rotation.z = side * 0.18;
    helmetGroup.add(camFitBuckle);

    const camLever = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, 0.010), materials.pmagFDE);
    camLever.position.set(side * 0.083, -0.032, 0.006);
    helmetGroup.add(camLever);
  }

  // Mentonera ergonómica acolchada en ante/nylon con costuras reforzadas
  const chinCupGeo = createOrganicPouchVolume(0.058, 0.020, 0.026, {
    roundnessXZ: 0.62,
    roundnessY: 0.52,
    pillowBulge: 0.14,
    wrinkleAmp: 0.0008
  });
  const chinCup = new THREE.Mesh(chinCupGeo, materials.bootSuede);
  chinCup.position.set(0, -0.080, 0.050);
  chinCup.rotation.x = 0.40;
  helmetGroup.add(chinCup);

  // --------------------------------------------------------------------------
  // 6. RED ELÁSTICA DE RETENCIÓN SHOCK-CORD BUNGEE EN LA CORONA
  // --------------------------------------------------------------------------
  for (const side of [-1, 1]) {
    const shockNodes = [
      new THREE.Vector3(side * 0.082, 0.046, 0.045),
      new THREE.Vector3(side * 0.032, 0.080, 0.018),
      new THREE.Vector3(-side * 0.028, 0.083, -0.025),
      new THREE.Vector3(side * 0.030, 0.072, -0.075),
      new THREE.Vector3(0.0, 0.056, -0.112)
    ];
    const shockGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(shockNodes),
      32,
      0.0018,
      8,
      false
    );
    helmetGroup.add(new THREE.Mesh(shockGeo, materials.darkPolymer));
  }

  const cordLock = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0048, 0.012, 14), materials.pmagFDE);
  cordLock.position.set(0.0, 0.058, -0.110);
  cordLock.rotation.z = Math.PI * 0.5;
  helmetGroup.add(cordLock);

  // --------------------------------------------------------------------------
  // 7. BALIZA ESTROBOSCÓPICA SUPERIOR IFF: CORE SURVIVAL HEL-STAR 6 GEN III+
  // --------------------------------------------------------------------------
  const helstarGroup = new THREE.Group();
  helstarGroup.position.set(0, 0.081, -0.024);
  helstarGroup.rotation.x = -0.12;
  helmetGroup.add(helstarGroup);

  // Chasis aerodinámico escalonado en polímero FDE con base curvada
  const strobeBaseGeo = createOrganicPouchVolume(0.046, 0.014, 0.082, {
    roundnessXZ: 0.58,
    roundnessY: 0.46,
    pillowBulge: 0.06,
    wrinkleAmp: 0
  });
  const strobeBase = new THREE.Mesh(strobeBaseGeo, materials.pmagFDE);
  helstarGroup.add(strobeBase);

  // Collarín negro mate y tapa frontal del compartimento de batería CR123A
  const strobeCollar = new THREE.Mesh(
    createOrganicPouchVolume(0.042, 0.011, 0.068, { roundnessXZ: 0.55, roundnessY: 0.45, pillowBulge: 0.04 }),
    materials.darkPolymer
  );
  strobeCollar.position.set(0, 0.004, -0.002);
  helstarGroup.add(strobeCollar);

  const batteryCap = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.018, 18), materials.darkPolymer);
  batteryCap.rotation.x = Math.PI * 0.5;
  batteryCap.position.set(0, 0.001, 0.036);
  helstarGroup.add(batteryCap);

  // Guardas laterales y conmutadores deslizantes táctiles (Overt / Covert IR + Modo 1/2/3)
  for (const sX of [-1, 1]) {
    const switchGuard = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.008, 0.036), materials.pmagFDE);
    switchGuard.position.set(sX * 0.021, 0.005, -0.008);
    helstarGroup.add(switchGuard);

    const slideSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.012), materials.darkPolymer);
    slideSwitch.position.set(sX * 0.022, 0.006, -0.004);
    helstarGroup.add(slideSwitch);
  }

  // Interruptor trasero basculante con fiador de seguridad rojo
  const rearDetent = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.007, 0.008), materials.redTab);
  rearDetent.position.set(0, 0.004, -0.039);
  helstarGroup.add(rearDetent);

  // Placa interna PCB con trazas de oro y matriz de diodos LED / IR visibles bajo la cúpula
  const pcbBoard = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.002, 0.044), materials.gunmetal);
  pcbBoard.position.set(0, 0.008, -0.002);
  helstarGroup.add(pcbBoard);

  // Diodos emisores IR 880nm secundarios
  for (const dz of [-0.014, 0.012]) {
    const irChip = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.003, 0.006), materials.opticGlassRuby);
    irChip.position.set(0, 0.010, dz);
    helstarGroup.add(irChip);
  }

  // Cúpula óptica facetada Fresnel en policarbonato ultraclaro
  const strobeDome = new THREE.Mesh(new THREE.CapsuleGeometry(0.0125, 0.038, 14, 24), materials.strobeDomeGlass);
  strobeDome.rotation.x = Math.PI * 0.5;
  strobeDome.scale.set(1.0, 1.0, 0.72);
  strobeDome.position.set(0, 0.010, -0.002);
  helstarGroup.add(strobeDome);

  // Núcleo LED estroboscópico CREE de alta intensidad (protegido contra fusión estática)
  const strobeDiodeMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
  const strobeDiode = new THREE.Mesh(new THREE.SphereGeometry(0.0058, 16, 16), strobeDiodeMat);
  strobeDiode.scale.set(1.1, 0.7, 1.4);
  strobeDiode.position.set(0, 0.012, -0.001);
  helstarGroup.add(strobeDiode);
  skeleton.strobeMesh = strobeDiode;

  const strobeLight = new THREE.PointLight(0x22c55e, 1.8, 1.2);
  strobeLight.position.set(0, 0.026, 0.0);
  helstarGroup.add(strobeLight);
  skeleton.strobeLight = strobeLight;

  // --------------------------------------------------------------------------
  // 8. RIELES DE ACCESORIOS OPS-CORE SKELETON ARC (IZQUIERDO Y DERECHO)
  // --------------------------------------------------------------------------
  for (const side of [-1, 1]) {
    const railGroup = new THREE.Group();
    railGroup.position.set(side * 0.113, 0.022, 0.006);
    railGroup.rotation.z = side * 0.15;
    railGroup.rotation.y = side * 0.05;
    helmetGroup.add(railGroup);

    // Tramo horizontal superior del riel Skeleton ARC (Dovetail / Picatinny)
    const upperTrackGeo = createOrganicPouchVolume(0.012, 0.018, 0.136, {
      roundnessXZ: 0.35,
      roundnessY: 0.35,
      pillowBulge: 0.02,
      wrinkleAmp: 0
    });
    const upperTrack = new THREE.Mesh(upperTrackGeo, materials.pmagFDE);
    upperTrack.position.set(0, 0.008, 0.004);
    railGroup.add(upperTrack);

    // Tramo descendente trasero que bordea el arco de la oreja
    const rearLegGeo = createOrganicPouchVolume(0.011, 0.044, 0.022, {
      roundnessXZ: 0.38,
      roundnessY: 0.38,
      pillowBulge: 0.02,
      wrinkleAmp: 0
    });
    const rearLeg = new THREE.Mesh(rearLegGeo, materials.pmagFDE);
    rearLeg.position.set(-side * 0.002, -0.012, -0.052);
    rearLeg.rotation.x = 0.42;
    railGroup.add(rearLeg);

    // Tirante diagonal esqueletizado delantero
    const frontStrut = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.028, 0.014), materials.pmagFDE);
    frontStrut.position.set(0, -0.004, 0.052);
    frontStrut.rotation.x = -0.52;
    railGroup.add(frontStrut);

    // Ranuras T-slot y dientes Picatinny mecanizados en el carril
    for (let rz = -0.048; rz <= 0.052; rz += 0.014) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.010, 0.005), materials.darkPolymer);
      slot.position.set(side * 0.0055, 0.008, rz);
      railGroup.add(slot);
    }

    // 4 Tornillos Torx T20 de acero pavonado con arandelas de sujeción balística
    for (const [tY, tZ] of [
      [0.008, 0.058],
      [0.008, -0.052],
      [-0.024, -0.060],
      [-0.010, 0.044]
    ]) {
      const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.002, 14), materials.gunmetal);
      washer.rotation.z = Math.PI * 0.5;
      washer.position.set(side * 0.0055, tY, tZ);
      railGroup.add(washer);

      const torxBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.004, 8), materials.boltSteel);
      torxBolt.rotation.z = Math.PI * 0.5;
      torxBolt.position.set(side * 0.0065, tY, tZ);
      railGroup.add(torxBolt);
    }

    // Clip frontal de máscara O2 / hebilla de retención en el extremo anterior del riel
    const o2Latch = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.016, 0.018), materials.darkPolymer);
    o2Latch.position.set(side * 0.002, 0.008, 0.068);
    railGroup.add(o2Latch);

    // Cuerda elástica estabilizadora Wilcox NVG Bungee desde el riel hacia el puente GPNVG-18
    const bungeeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.114, 0.030, 0.058),
      new THREE.Vector3(side * 0.088, 0.032, 0.106),
      new THREE.Vector3(side * 0.044, 0.028, 0.142)
    ]);
    const bungee = new THREE.Mesh(new THREE.TubeGeometry(bungeeCurve, 24, 0.0022, 8, false), materials.darkPolymer);
    helmetGroup.add(bungee);

    const carabinerHook = new THREE.Mesh(new THREE.TorusGeometry(0.0045, 0.0014, 8, 14), materials.gunmetal);
    carabinerHook.position.set(side * 0.044, 0.028, 0.142);
    carabinerHook.rotation.y = side * 0.4;
    helmetGroup.add(carabinerHook);
  }

  // --------------------------------------------------------------------------
  // 9. SISTEMA DE ILUMINACIÓN TÁCTICA DE CABEZA:
  //    A) SUREFIRE M340V VAMPIRE IR/WHITE SCOUT PRO (RIEL DERECHO) CON HAZ VOLUMÉTRICO
  //    B) PRINCETON TEC CHARGE PRO MPLS FLEX-NECK (RIEL IZQUIERDO)
  // --------------------------------------------------------------------------
  // A) SUREFIRE M340V VAMPIRE SCOUT PRO EN RIEL ARC DERECHO (+X)
  const surefireGroup = new THREE.Group();
  surefireGroup.position.set(0.125, 0.036, 0.038);
  surefireGroup.rotation.y = -0.06;
  surefireGroup.rotation.z = -0.12;
  helmetGroup.add(surefireGroup);

  // Montura articulada CNC Picatinny/ARC con tornillo moleteado de bloqueo
  const sfMountClamp = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.028), materials.gunmetal);
  sfMountClamp.position.set(-0.008, -0.004, -0.008);
  surefireGroup.add(sfMountClamp);

  const sfThumbNut = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.006, 16), materials.wilcoxAluminum);
  sfThumbNut.rotation.z = Math.PI * 0.5;
  sfThumbNut.position.set(-0.002, -0.010, -0.008);
  surefireGroup.add(sfThumbNut);

  // Cuerpo cilíndrico principal 6061-T6 anodizado FDE
  const sfBody = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.064, 24), materials.wilcoxAluminum);
  sfBody.rotation.x = Math.PI * 0.5;
  surefireGroup.add(sfBody);

  // Aletas de disipación térmica mecanizadas alrededor del cuello de la linterna
  for (const fz of [0.012, 0.017, 0.022]) {
    const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.0122, 0.0122, 0.0028, 24), materials.fdeAnodized);
    fin.rotation.x = Math.PI * 0.5;
    fin.position.z = fz;
    surefireGroup.add(fin);
  }

  // Tailcap trasero Z68 con corona protectora y botón pulsador de goma
  const sfTailcap = new THREE.Mesh(new THREE.CylinderGeometry(0.0112, 0.0108, 0.022, 24), materials.gunmetal);
  sfTailcap.rotation.x = Math.PI * 0.5;
  sfTailcap.position.z = -0.040;
  surefireGroup.add(sfTailcap);

  const sfClickButton = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.006, 16), materials.combatRubber);
  sfClickButton.rotation.x = Math.PI * 0.5;
  sfClickButton.position.z = -0.052;
  surefireGroup.add(sfClickButton);

  // Cabezal KM1-E Dual-Spectrum White/IR con collarín selector moleteado (WH / OFF / IR)
  const sfSelectorRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0132, 0.0124, 0.012, 24), materials.gunmetal);
  sfSelectorRing.rotation.x = Math.PI * 0.5;
  sfSelectorRing.position.z = 0.032;
  surefireGroup.add(sfSelectorRing);

  for (let sr = 0; sr < 12; sr++) {
    const sa = (sr / 12) * Math.PI * 2;
    const gripLug = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.002, 0.011), materials.wilcoxAluminum);
    gripLug.position.set(Math.cos(sa) * 0.0132, Math.sin(sa) * 0.0132, 0.032);
    gripLug.rotation.z = sa;
    surefireGroup.add(gripLug);
  }

  const sfBezelHead = new THREE.Mesh(new THREE.CylinderGeometry(0.0142, 0.0132, 0.022, 28), materials.wilcoxAluminum);
  sfBezelHead.rotation.x = Math.PI * 0.5;
  sfBezelHead.position.z = 0.048;
  surefireGroup.add(sfBezelHead);

  // Corona almenada frontal (Strike Bezel) en acero pavonado
  const sfBezelCrown = new THREE.Mesh(new THREE.TorusGeometry(0.0134, 0.0016, 10, 28), materials.gunmetal);
  sfBezelCrown.position.z = 0.059;
  surefireGroup.add(sfBezelCrown);

  // Cono reflector parabólico interno TIR (Total Internal Reflection) en aluminio espejado
  const tirReflector = new THREE.Mesh(
    new THREE.ConeGeometry(0.0126, 0.016, 24, 1, true),
    materials.boltSteel
  );
  tirReflector.rotation.x = -Math.PI * 0.5;
  tirReflector.position.z = 0.050;
  surefireGroup.add(tirReflector);

  // Diodo emisor LED CREE de alta potencia + lente colimadora brillante (protegido para encendido dinámico)
  const headLightEmitterMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const headLightEmitter = new THREE.Mesh(new THREE.SphereGeometry(0.0068, 18, 18), headLightEmitterMat);
  headLightEmitter.scale.set(1.0, 1.0, 0.45);
  headLightEmitter.position.z = 0.056;
  surefireGroup.add(headLightEmitter);
  skeleton.headLightEmitter = headLightEmitter;

  // Cristal templado antirreflectante frontal
  const sfGlassLens = new THREE.Mesh(new THREE.CircleGeometry(0.0128, 24), materials.visorGlass);
  sfGlassLens.position.z = 0.0595;
  surefireGroup.add(sfGlassLens);

  // Haz volumétrico cónico físico (God-Ray Beam Shader) proyectado por la linterna táctica de cabeza
  const beamGeo = new THREE.ConeGeometry(0.24, 0.95, 32, 1, true);
  beamGeo.translate(0, -0.475, 0);
  beamGeo.rotateX(-Math.PI * 0.5);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xfff7ed) },
      uIntensity: { value: 1.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vec3 viewDir = normalize(vViewPos);
        float rimFade = pow(abs(dot(vNormal, viewDir)), 1.45);
        float axialFade = smoothstep(0.0, 0.92, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
        float coreHotspot = pow(vUv.y, 2.2) * 0.35;
        float alpha = (rimFade * axialFade * 0.22 + coreHotspot * rimFade * 0.18) * uIntensity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const headLightBeam = new THREE.Mesh(beamGeo, beamMat);
  headLightBeam.position.set(0, 0, 0.060);
  surefireGroup.add(headLightBeam);
  skeleton.headLightBeam = headLightBeam;

  // Focos dinámicos reales (SpotLight + PointLight local de rebote sobre el casco y el visor)
  const headSpotLight = new THREE.SpotLight(0xfff5e6, 5.5, 4.5, Math.PI / 5.5, 0.45, 1.4);
  headSpotLight.position.set(0, 0, 0.062);
  headSpotLight.target.position.set(0, -0.04, 1.2);
  surefireGroup.add(headSpotLight);
  surefireGroup.add(headSpotLight.target);
  skeleton.headLight = headSpotLight;

  const headPointLight = new THREE.PointLight(0xffedd5, 1.25, 0.45);
  headPointLight.position.set(0.01, 0, 0.072);
  surefireGroup.add(headPointLight);
  skeleton.headPointLight = headPointLight;

  // B) LINTERNA DE TAREA PRINCETON TEC CHARGE PRO MPLS EN RIEL ARC IZQUIERDO (-X)
  const mplsGroup = new THREE.Group();
  mplsGroup.position.set(-0.123, 0.032, 0.032);
  mplsGroup.rotation.y = -0.10;
  mplsGroup.rotation.z = 0.14;
  helmetGroup.add(mplsGroup);

  const mplsBody = new THREE.Mesh(
    createOrganicPouchVolume(0.014, 0.022, 0.044, { roundnessXZ: 0.45, roundnessY: 0.42, pillowBulge: 0.04 }),
    materials.pmagFDE
  );
  mplsGroup.add(mplsBody);

  const mplsButton = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 14), materials.combatRubber);
  mplsButton.rotation.z = Math.PI * 0.5;
  mplsButton.position.set(-0.007, 0.002, -0.006);
  mplsGroup.add(mplsButton);

  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.002, 0.020),
    new THREE.Vector3(-0.006, 0.012, 0.042),
    new THREE.Vector3(0.002, 0.016, 0.064)
  ]);
  const lightNeck = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 20, 0.0028, 10, false), materials.gunmetal);
  mplsGroup.add(lightNeck);

  const mplsHead = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0068, 0.016, 16), materials.darkPolymer);
  mplsHead.rotation.x = Math.PI * 0.48;
  mplsHead.position.set(0.002, 0.016, 0.066);
  mplsGroup.add(mplsHead);

  const mplsLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.0048, 14),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  mplsLens.position.set(0.002, 0.017, 0.0745);
  mplsGroup.add(mplsLens);

  // --------------------------------------------------------------------------
  // 10. AURICULARES TÁCTICOS PELTOR COMTAC VI NIB CON BRAZOS GIMBAL Y MIC BOOM
  // --------------------------------------------------------------------------
  for (const side of [-1, 1]) {
    const earCupGroup = new THREE.Group();
    earCupGroup.position.set(side * 0.112, -0.024, -0.002);
    helmetGroup.add(earCupGroup);

    // Bloque adaptador de montaje en riel ARC con bisagra de tensión
    const arcMountBlock = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.024), materials.darkPolymer);
    arcMountBlock.position.set(side * 0.006, 0.044, 0.006);
    earCupGroup.add(arcMountBlock);

    // Doble brazo gimbal de alambre de acero inoxidable elástico (delantero y trasero)
    for (const armZ of [-0.006, 0.012]) {
      const wireArm = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.046, 10), materials.boltSteel);
      wireArm.position.set(side * 0.009, 0.024, armZ);
      wireArm.rotation.z = -side * 0.14;
      wireArm.rotation.x = armZ * 1.8;
      earCupGroup.add(wireArm);
    }

    // Soportes de pivote Yoke sobre la cazoleta
    for (const yokeZ of [-0.020, 0.020]) {
      const yokePost = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 10, 10), materials.darkPolymer);
      yokePost.position.set(side * 0.014, 0.002, yokeZ);
      earCupGroup.add(yokePost);
    }

    // Cazoleta acústica principal esculpida en polímero FDE mate con rebaje inferior para culata
    const cupGeo = new THREE.SphereGeometry(0.043, 32, 24);
    cupGeo.scale(0.50, 1.16, 0.92);
    const cup = new THREE.Mesh(cupGeo, materials.pmagFDE);
    earCupGroup.add(cup);

    // Anillo espaciador acústico negro mate entre la cazoleta y la almohadilla de gel
    const sealRingGeo = new THREE.SphereGeometry(0.0425, 28, 20);
    sealRingGeo.scale(0.42, 1.18, 0.94);
    const sealRing = new THREE.Mesh(sealRingGeo, materials.darkPolymer);
    sealRing.position.x = -side * 0.005;
    earCupGroup.add(sealRing);

    // Almohadilla anatómica de gel de silicona acústica
    const gelGeo = new THREE.SphereGeometry(0.042, 28, 20);
    gelGeo.scale(0.42, 1.20, 0.96);
    const gelPad = new THREE.Mesh(gelGeo, materials.headsetGel);
    gelPad.position.x = -side * 0.010;
    earCupGroup.add(gelPad);

    // Micrófonos ambientales binaurales frontales con capuchas cortaviento
    const micHood = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0062, 0.016, 14), materials.darkPolymer);
    micHood.rotation.x = Math.PI * 0.5;
    micHood.position.set(side * 0.016, 0.010, 0.028);
    earCupGroup.add(micHood);

    const micGrille = new THREE.Mesh(new THREE.CircleGeometry(0.0045, 12), materials.gunmetal);
    micGrille.position.set(side * 0.016, 0.010, 0.0365);
    earCupGroup.add(micGrille);

    // Botones de control de volumen y NIB en relieve
    for (const [bY, bZ] of [[0.010, -0.012], [-0.006, -0.012]]) {
      const volBtn = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.007, 0.009), materials.darkPolymer);
      volBtn.position.set(side * 0.021, bY, bZ);
      earCupGroup.add(volBtn);
    }
  }

  // Micrófono boom articulado con cuello de cisne y filtro cortaviento estriado en el lado izquierdo
  const boomMicCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.114, -0.034, 0.012),
    new THREE.Vector3(-0.090, -0.050, 0.062),
    new THREE.Vector3(-0.044, -0.062, 0.106),
    new THREE.Vector3(-0.016, -0.064, 0.116)
  ]);
  const boomMic = new THREE.Mesh(new THREE.TubeGeometry(boomMicCurve, 28, 0.0026, 10, false), materials.gunmetal);
  helmetGroup.add(boomMic);

  const micWindscreen = new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, 0.020, 12, 16), materials.darkPolymer);
  micWindscreen.rotation.z = Math.PI * 0.5;
  micWindscreen.rotation.y = -0.35;
  micWindscreen.position.set(-0.016, -0.064, 0.116);
  helmetGroup.add(micWindscreen);

  // --------------------------------------------------------------------------
  // 11. CONTRAPESO TRASERO Y BATERÍA L3HARRIS CWBP + TNVC MOHAWK CON CABLE LEMO
  // --------------------------------------------------------------------------
  const battGroup = new THREE.Group();
  battGroup.position.set(0, 0.010, -0.140);
  battGroup.rotation.x = -0.20;
  helmetGroup.add(battGroup);

  // Funda y módulo de batería L3Harris CWBP en polímero FDE / Cordura
  const battPackGeo = createOrganicPouchVolume(0.088, 0.060, 0.034, {
    roundnessXZ: 0.48,
    roundnessY: 0.44,
    teardropSag: 0.06,
    pillowBulge: 0.10,
    wrinkleAmp: 0.0008
  });
  const batteryPack = new THREE.Mesh(battPackGeo, materials.pmagFDE);
  battGroup.add(batteryPack);

  // Tapa superior del compartimento de 4 baterías AA con pestillo metálico
  const battLid = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.012, 0.028), materials.darkPolymer);
  battLid.position.set(0, 0.028, 0);
  battGroup.add(battLid);

  // Selector giratorio de alimentación y baliza trasera IR
  const rotSwitch = new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.009, 16), materials.gunmetal);
  rotSwitch.rotation.x = Math.PI * 0.5;
  rotSwitch.position.set(0.026, 0.014, -0.018);
  battGroup.add(rotSwitch);

  // Conector LEMO / Fischer acodado en aluminio mecanizado
  const fischerPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0058, 0.016, 14), materials.gunmetal);
  fischerPlug.rotation.z = Math.PI * 0.5;
  fischerPlug.position.set(-0.046, 0.012, -0.008);
  battGroup.add(fischerPlug);

  // Cinchas verticales de retención y puente de celdas de plomo de contrapeso
  for (const bX of [-0.024, 0.024]) {
    const battStrap = new THREE.Mesh(
      createOrganicPouchVolume(0.014, 0.064, 0.038, { roundnessXZ: 0.48, roundnessY: 0.42, pillowBulge: 0.04 }),
      materials.webbing
    );
    battStrap.position.set(bX, 0, 0);
    battGroup.add(battStrap);
  }

  // Cable de alimentación blindado Fischer guiado limpiamente por el flanco superior izquierdo hacia el visor
  const nvgCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.050, 0.022, -0.136),
    new THREE.Vector3(-0.112, 0.048, -0.068),
    new THREE.Vector3(-0.114, 0.068, 0.028),
    new THREE.Vector3(-0.072, 0.066, 0.106),
    new THREE.Vector3(-0.028, 0.054, 0.138)
  ]);
  const nvgPowerCable = new THREE.Mesh(
    new THREE.TubeGeometry(nvgCableCurve, 36, 0.0032, 10, false),
    materials.darkPolymer
  );
  helmetGroup.add(nvgPowerCable);

  for (const [cX, cY, cZ] of [
    [-0.108, 0.046, -0.060],
    [-0.110, 0.064, 0.024]
  ]) {
    const cableClip = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.010, 0.014), materials.darkPolymer);
    cableClip.position.set(cX, cY, cZ);
    helmetGroup.add(cableClip);
  }

  // --------------------------------------------------------------------------
  // 12. MONTURA CNC WILCOX L4 THREE-HOLE SHROUD + BRAZO WILCOX L4 G24 +
  //     VISOR INFRARROJO PANORÁMICO DE 4 TUBOS L3HARRIS GPNVG-18 (AN/AVS-10)
  // --------------------------------------------------------------------------
  // A) SHROUD FRONTAL WILCOX L4 DE 3 ORIFICIOS (Asentado sobre la frente del casco)
  const shroudGroup = new THREE.Group();
  shroudGroup.position.set(0, 0.046, 0.122);
  shroudGroup.rotation.x = -0.22;
  helmetGroup.add(shroudGroup);

  // Junta base amortiguadora de caucho EPDM negro mate
  const shroudGasket = new THREE.Mesh(
    createOrganicPouchVolume(0.060, 0.058, 0.008, { roundnessXZ: 0.45, roundnessY: 0.45, pillowBulge: 0.02 }),
    materials.helmetRimRubber
  );
  shroudGroup.add(shroudGasket);

  // Marco exterior mecanizado en aluminio 7075-T6 anodizado FDE
  const shroudFrame = new THREE.Mesh(
    createOrganicPouchVolume(0.056, 0.054, 0.012, { roundnessXZ: 0.42, roundnessY: 0.42, pillowBulge: 0.04 }),
    materials.wilcoxAluminum
  );
  shroudFrame.position.z = 0.004;
  shroudGroup.add(shroudFrame);

  // Receptáculo central de cola de milano (Dovetail Socket) en acero pavonado
  const shroudSocket = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.032, 0.010), materials.gunmetal);
  shroudSocket.position.set(0, 0.0, 0.008);
  shroudGroup.add(shroudSocket);

  // 3 Tornillos Torx T20 avellanados con arandelas de acero inoxidable
  for (const [sX, sY] of [
    [0, 0.019],
    [-0.018, -0.015],
    [0.018, -0.015]
  ]) {
    const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0046, 0.002, 14), materials.gunmetal);
    washer.rotation.x = Math.PI * 0.5;
    washer.position.set(sX, sY, 0.010);
    shroudGroup.add(washer);

    const torx = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.003, 8), materials.boltSteel);
    torx.rotation.x = Math.PI * 0.5;
    torx.position.set(sX, sY, 0.011);
    shroudGroup.add(torx);
  }

  // B) PIVOTE ARTICULADO DEL BRAZO WILCOX L4 G24 Y SISTEMA GPNVG-18
  // Cuando nvgDeployed = true: position (0, 0.046, 0.132), rotation.x = 0.0 -> Tubos alineados frente a los ojos (y = 0.010)
  // Cuando nvgDeployed = false: se pliega hacia arriba y atrás sin tocar la calota del casco
  skeleton.nvgPivot = new THREE.Group();
  skeleton.nvgPivot.position.set(0, 0.046, 0.132);
  skeleton.nvgPivot.rotation.x = 0.0;
  helmetGroup.add(skeleton.nvgPivot);

  // Zapata de bloqueo en el shroud y columna vertical CNC del brazo Wilcox G24
  const g24VerticalStanchion = new THREE.Mesh(
    createOrganicPouchVolume(0.022, 0.036, 0.014, { roundnessXZ: 0.32, roundnessY: 0.32, pillowBulge: 0.02 }),
    materials.wilcoxAluminum
  );
  g24VerticalStanchion.position.set(0, -0.008, 0.006);
  skeleton.nvgPivot.add(g24VerticalStanchion);

  // Ventana central de aligeramiento CNC en la columna vertical
  const cncSlot = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.018, 0.015), materials.gunmetal);
  cncSlot.position.set(0, -0.008, 0.006);
  skeleton.nvgPivot.add(cncSlot);

  // Palanca lateral Breakaway y rueda moleteada de ajuste vertical
  const breakawayLever = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.014, 0.010), materials.brass);
  breakawayLever.position.set(-0.013, -0.002, 0.006);
  skeleton.nvgPivot.add(breakawayLever);

  const vertThumbWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 16), materials.gunmetal);
  vertThumbWheel.position.set(0, 0.011, 0.008);
  skeleton.nvgPivot.add(vertThumbWheel);

  // Eje de bisagra horizontal G24 con pomo de ajuste de inclinación en latón y botón de liberación
  const hingeAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.032, 16), materials.gunmetal);
  hingeAxle.rotation.z = Math.PI * 0.5;
  hingeAxle.position.set(0, -0.022, 0.012);
  skeleton.nvgPivot.add(hingeAxle);

  const tiltKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.008, 16), materials.brass);
  tiltKnob.rotation.z = Math.PI * 0.5;
  tiltKnob.position.set(0.018, -0.022, 0.012);
  skeleton.nvgPivot.add(tiltKnob);

  const releaseButton = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0048, 0.006, 14), materials.wilcoxAluminum);
  releaseButton.rotation.z = Math.PI * 0.5;
  releaseButton.position.set(-0.017, -0.022, 0.012);
  skeleton.nvgPivot.add(releaseButton);

  // Carril horizontal de desplazamiento anteroposterior (Fore/Aft Travel Carriage)
  const foreAftRail = new THREE.Mesh(
    createOrganicPouchVolume(0.024, 0.011, 0.038, { roundnessXZ: 0.35, roundnessY: 0.35, pillowBulge: 0.02 }),
    materials.wilcoxAluminum
  );
  foreAftRail.position.set(0, -0.020, 0.028);
  skeleton.nvgPivot.add(foreAftRail);

  const railLockCam = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.014), materials.gunmetal);
  railLockCam.position.set(0.014, -0.020, 0.030);
  skeleton.nvgPivot.add(railLockCam);

  // C) PUENTE PANORÁMICO CENTRAL L3HARRIS GPNVG-18 (AN/AVS-10)
  const nvgBridgeGeo = createOrganicPouchVolume(0.132, 0.016, 0.030, {
    roundnessXZ: 0.42,
    roundnessY: 0.40,
    pillowBulge: 0.04,
    wrinkleAmp: 0
  });
  const nvgBridge = new THREE.Mesh(nvgBridgeGeo, materials.wilcoxAluminum);
  nvgBridge.position.set(0, -0.022, 0.038);
  skeleton.nvgPivot.add(nvgBridge);

  // Doble barra guía de acero inoxidable para ajuste interpupilar (IPD) y ruedas moleteadas
  for (const barZ of [0.030, 0.044]) {
    const ipdRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.124, 12), materials.boltSteel);
    ipdRod.rotation.z = Math.PI * 0.5;
    ipdRod.position.set(0, -0.026, barZ);
    skeleton.nvgPivot.add(ipdRod);
  }

  for (const ipdSide of [-1, 1]) {
    // Ruedas moleteadas de ajuste fino IPD en los extremos del puente
    const ipdThumbWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.0056, 0.0056, 0.007, 18), materials.brass);
    ipdThumbWheel.rotation.z = Math.PI * 0.5;
    ipdThumbWheel.position.set(ipdSide * 0.066, -0.022, 0.038);
    skeleton.nvgPivot.add(ipdThumbWheel);

    // Soportes colgantes gemelos (Dual-Pod Hangers) que unen cada par de tubos al puente
    const podHanger = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.012, 0.022), materials.fdeAnodized);
    podHanger.position.set(ipdSide * 0.034, -0.030, 0.038);
    skeleton.nvgPivot.add(podHanger);
  }

  // Conector LEMO de 4 pines en el puente central (recibe el cable de la batería trasera)
  const bridgeLemoPort = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0046, 0.012, 14), materials.gunmetal);
  bridgeLemoPort.rotation.x = -0.55;
  bridgeLemoPort.position.set(-0.024, -0.014, 0.044);
  skeleton.nvgPivot.add(bridgeLemoPort);

  // Interruptor rotativo de encendido / ganancia / IR en el frente izquierdo del puente
  const powerRotaryKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0058, 0.009, 16), materials.darkPolymer);
  powerRotaryKnob.rotation.x = Math.PI * 0.5;
  powerRotaryKnob.position.set(-0.012, -0.020, 0.054);
  skeleton.nvgPivot.add(powerRotaryKnob);

  // Diodo iluminador infrarrojo frontal integrado en el centro del puente GPNVG-18
  const irBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0048, 0.005, 16), materials.gunmetal);
  irBezel.rotation.x = Math.PI * 0.5;
  irBezel.position.set(0.0, -0.022, 0.053);
  skeleton.nvgPivot.add(irBezel);

  const nvgIrEmitterMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const nvgIrEmitter = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 12, 12), nvgIrEmitterMat);
  nvgIrEmitter.position.set(0.0, -0.022, 0.055);
  skeleton.nvgPivot.add(nvgIrEmitter);
  skeleton.nvgIrEmitterMesh = nvgIrEmitter;

  // D) 4 TUBOS INTENSIFICADORES DE IMAGEN GEN3 PANORÁMICOS (FOV DE 97°)
  // Dimensiones reales a escala: diámetro 27.6mm (r = 0.0138m), longitud 66mm
  const tubeConfigs = [
    { x: -0.050, z: 0.032, yaw: 0.27 },   // Tubo panorámico exterior izquierdo (+15.5°)
    { x: -0.018, z: 0.038, yaw: 0.02 },   // Tubo binocular central izquierdo
    { x: 0.018,  z: 0.038, yaw: -0.02 },  // Tubo binocular central derecho
    { x: 0.050,  z: 0.032, yaw: -0.27 }   // Tubo panorámico exterior derecho (-15.5°)
  ];

  // Grupo y material para el resplandor de fósforo ocular verde/esmeralda sobre los ojos
  const ocularGlowMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.72
  });
  const ocularGlowGeos: THREE.BufferGeometry[] = [];

  tubeConfigs.forEach(({ x, z, yaw }) => {
    const podGroup = new THREE.Group();
    // Nivel exacto de los ojos en estado desplegado: y = 0.046 - 0.036 = +0.010m en helmetGroup
    podGroup.position.set(x, -0.036, z);
    podGroup.rotation.y = yaw;
    skeleton.nvgPivot.add(podGroup);

    // 1. Sección central del tubo intensificador de 18mm en aluminio anodizado FDE
    const mainTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0134, 0.0138, 0.042, 32),
      materials.fdeAnodized
    );
    mainTube.rotation.x = Math.PI * 0.5;
    podGroup.add(mainTube);

    // 2. Campana frontal del objetivo (escalonada a mayor diámetro para alojar el menisco óptico)
    const objectiveBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0148, 0.0138, 0.020, 32),
      materials.wilcoxAluminum
    );
    objectiveBell.rotation.x = Math.PI * 0.5;
    objectiveBell.position.z = 0.022;
    podGroup.add(objectiveBell);

    // 3. Carcasa colimadora ocular trasera
    const ocularHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0132, 0.0128, 0.016, 28),
      materials.fdeAnodized
    );
    ocularHousing.rotation.x = Math.PI * 0.5;
    ocularHousing.position.z = -0.022;
    podGroup.add(ocularHousing);

    // 4. Anillos estructurales y válvula de purga de nitrógeno seco
    for (const rz of [-0.011, 0.008]) {
      const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.0139, 0.0011, 10, 28), materials.darkPolymer);
      collarRing.position.z = rz;
      podGroup.add(collarRing);
    }

    const purgeValve = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.003, 10), materials.gunmetal);
    purgeValve.position.set(0, 0.0136, -0.002);
    podGroup.add(purgeValve);

    // 5. Anillo de enfoque objetivo delantero con moleteado táctil de 16 estrías radiales
    const focusRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0153, 0.0153, 0.011, 32),
      materials.darkPolymer
    );
    focusRing.rotation.x = Math.PI * 0.5;
    focusRing.position.z = 0.024;
    podGroup.add(focusRing);

    for (let k = 0; k < 14; k++) {
      const ka = (k / 14) * Math.PI * 2;
      const knurlRib = new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.0014, 0.009), materials.gunmetal);
      knurlRib.position.set(Math.cos(ka) * 0.0154, Math.sin(ka) * 0.0154, 0.024);
      knurlRib.rotation.z = ka;
      podGroup.add(knurlRib);
    }

    // 6. Bisel frontal roscado antirreflejos con 4 muescas de llave óptica (Spanner Notches)
    const frontHood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0149, 0.0149, 0.006, 32, 1, true),
      materials.gunmetal
    );
    frontHood.rotation.x = Math.PI * 0.5;
    frontHood.position.z = 0.032;
    podGroup.add(frontHood);

    const lensBezel = new THREE.Mesh(new THREE.TorusGeometry(0.0142, 0.0014, 10, 32), materials.gunmetal);
    lensBezel.position.z = 0.034;
    podGroup.add(lensBezel);

    // 7. LENTE OBJETIVO CONVEXA MULTICAPA DICROICA (Menisco esférico curvo que captura reflejos especulares reales)
    const convexLensGeo = new THREE.SphereGeometry(0.0185, 28, 20, 0, Math.PI * 2, 0, 0.82);
    convexLensGeo.rotateX(Math.PI * 0.5);
    convexLensGeo.scale(1.0, 1.0, 0.42);
    const lensFront = new THREE.Mesh(convexLensGeo, materials.nvgLens);
    lensFront.position.z = 0.027;
    podGroup.add(lensFront);

    // 8. Anillo de ajuste de dioptrías trasero y copa ocular anatómica en caucho flexible
    const diopterRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0138, 0.0138, 0.008, 28),
      materials.darkPolymer
    );
    diopterRing.rotation.x = Math.PI * 0.5;
    diopterRing.position.z = -0.028;
    podGroup.add(diopterRing);

    const eyeCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0146, 0.0132, 0.010, 28),
      materials.combatRubber
    );
    eyeCup.rotation.x = Math.PI * 0.5;
    eyeCup.position.z = -0.035;
    podGroup.add(eyeCup);

    const eyeCupLip = new THREE.Mesh(new THREE.TorusGeometry(0.0142, 0.0016, 10, 28), materials.combatRubber);
    eyeCupLip.position.z = -0.040;
    podGroup.add(eyeCupLip);

    // Lente ocular trasera convexa
    const lensBack = new THREE.Mesh(new THREE.CircleGeometry(0.0124, 24), materials.nvgLens);
    lensBack.rotation.y = Math.PI;
    lensBack.position.z = -0.039;
    podGroup.add(lensBack);

    // Disco emisor de fósforo verde/esmeralda en el ocular trasero
    const glowDisc = new THREE.CircleGeometry(0.0108, 20);
    glowDisc.rotateY(Math.PI);
    glowDisc.rotateY(yaw);
    glowDisc.translate(
      x - Math.sin(yaw) * 0.0395,
      -0.036,
      z - Math.cos(yaw) * 0.0395
    );
    ocularGlowGeos.push(glowDisc);
  });

  // Puentes rígidos inter-tubo que fusionan los pares izquierdo y derecho del GPNVG-18
  for (const pairSide of [-1, 1]) {
    const dualPodWeb = new THREE.Mesh(
      createOrganicPouchVolume(0.024, 0.016, 0.034, { roundnessXZ: 0.4, roundnessY: 0.4, pillowBulge: 0.05 }),
      materials.fdeAnodized
    );
    dualPodWeb.position.set(pairSide * 0.034, -0.036, 0.034);
    dualPodWeb.rotation.y = -pairSide * 0.12;
    skeleton.nvgPivot.add(dualPodWeb);
  }

  // Malla unificada de luminiscencia ocular de fósforo (protegida para control dinámico)
  const mergedOcularPos: number[] = [];
  const mergedOcularNorm: number[] = [];
  const mergedOcularUv: number[] = [];
  for (const g of ocularGlowGeos) {
    const nonIdx = g.index ? g.toNonIndexed() : g;
    const p = nonIdx.attributes.position;
    const n = nonIdx.attributes.normal;
    const u = nonIdx.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      mergedOcularPos.push(p.getX(i), p.getY(i), p.getZ(i));
      mergedOcularNorm.push(n.getX(i), n.getY(i), n.getZ(i));
      mergedOcularUv.push(u.getX(i), u.getY(i));
    }
    g.dispose();
  }
  const ocularMergedGeo = new THREE.BufferGeometry();
  ocularMergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(mergedOcularPos, 3));
  ocularMergedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(mergedOcularNorm, 3));
  ocularMergedGeo.setAttribute('uv', new THREE.Float32BufferAttribute(mergedOcularUv, 2));
  const nvgOcularMesh = new THREE.Mesh(ocularMergedGeo, ocularGlowMat);
  skeleton.nvgPivot.add(nvgOcularMesh);
  skeleton.nvgOcularMesh = nvgOcularMesh;

  // Luz puntual de fósforo verde-esmeralda que baña las gafas balísticas y los ojos cuando el GPNVG-18 está activo
  const nvgPhosphorLight = new THREE.PointLight(0x10b981, 0.85, 0.28);
  nvgPhosphorLight.position.set(0, -0.036, -0.015);
  skeleton.nvgPivot.add(nvgPhosphorLight);
  skeleton.nvgLight = nvgPhosphorLight;
}
