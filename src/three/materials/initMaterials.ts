import * as THREE from 'three';
import { MaterialLibrary, camoPalettes } from '../types';
import { ProceduralPBRGenerator } from '../textures/ProceduralPBRGenerator';
import {
  enhanceFabricShader,
  enhanceCamoSuitShader,
  enhanceSubsurfaceSkinShader,
  enhanceTacticalPolymerShader
} from '../geometry/organicGeometry';

export function initMaterials(): MaterialLibrary {
  const fabricNormal = ProceduralPBRGenerator.createFabricNormalMap(14, false);
  const corduraNormal = ProceduralPBRGenerator.createFabricNormalMap(28, true);
  const stippleNormal = ProceduralPBRGenerator.createStippleNormalMap();
  const metalMaps = ProceduralPBRGenerator.createMetalPBRMaps();
  const camoTex = ProceduralPBRGenerator.createCamoTexture(camoPalettes[0]);
  const reticleTex = ProceduralPBRGenerator.createEOTechReticleTexture();

  // Mapas procedurales de ruido microscópico y suites PBR avanzadas en Canvas
  const metalNoiseRough = ProceduralPBRGenerator.createMetalNoiseRoughnessMap();
  const cordura1000D = ProceduralPBRGenerator.createCordura1000DTextures();
  const ribbedThermal = ProceduralPBRGenerator.createTacticalRibbedThermalTextures();
  const weatheredPolymer = ProceduralPBRGenerator.createWeatheredPolymerTextures();
  const bootTex = ProceduralPBRGenerator.createTacticalBootPBRTextures();
  const skinEyeTex = ProceduralPBRGenerator.createHyperrealisticSkinAndEyeTextures();

  // 1. TRAJE DE CAMUFLAJE CRYE PRECISION G3 (50/50 NYCO RIPSTOP ULTRA-MATE + MAPA DE NORMALES TANGENCIAL 1K):
  // Se anula el reflejo dieléctrico plástico y se inyecta anisotropía ortogonal de urdimbre/trama + Oren-Nayar Rough Diffuse
  const camoFabric = enhanceCamoSuitShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: camoTex.map,
      normalMap: camoTex.normalMap,
      normalScale: new THREE.Vector2(0.95, 0.95),
      bumpMap: camoTex.bumpMap,
      bumpScale: 0.0048,
      roughnessMap: camoTex.roughnessMap,
      roughness: 0.91,
      metalness: 0.0,
      ior: 1.15,
      specularIntensity: 0.04,
      specularColor: new THREE.Color(0x3a362c),
      sheen: 0.28,
      sheenRoughness: 0.78,
      sheenColor: new THREE.Color(0xb8c4d0)
    })
  );

  // Cordura 1000D para Mochila, Chaleco JPC 2.0 y Bolsillos con trama 2x2 Basketweave en Albedo + Normal Tangencial Analítico + Roughness
  const corduraVest = enhanceFabricShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: cordura1000D.map,
      normalMap: cordura1000D.normalMap,
      normalScale: new THREE.Vector2(1.22, 1.22),
      bumpMap: cordura1000D.bumpMap,
      bumpScale: 0.0048,
      roughnessMap: cordura1000D.roughnessMap,
      roughness: 0.89,
      metalness: 0.0,
      ior: 1.18,
      specularIntensity: 0.05,
      sheen: 0.42,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color(0xd2c9b6)
    }),
    0xd2c9b6,
    0.22
  );

  // Cinchas MIL-W-4088 en espiga (Herringbone Chevron Twill Webbing) y cinturón táctico Ronin Senshi
  const webbing = enhanceFabricShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: cordura1000D.webbingMap,
      normalMap: cordura1000D.webbingNormalMap,
      normalScale: new THREE.Vector2(1.12, 1.12),
      roughnessMap: cordura1000D.roughnessMap,
      roughness: 0.88,
      metalness: 0.0,
      ior: 1.18,
      specularIntensity: 0.05,
      sheen: 0.32,
      sheenRoughness: 0.76,
      sheenColor: new THREE.Color(0xb5ab96)
    }),
    0xb5ab96,
    0.17
  );

  // Camiseta ignífuga Drifire/Crye G3 del torso y pasamontañas: punto jersey acanalado con Mapa de Normales Tangencial de bucles en V
  const balaclava = enhanceFabricShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: ribbedThermal.map,
      normalMap: ribbedThermal.normalMap,
      normalScale: new THREE.Vector2(1.08, 1.08),
      bumpMap: ribbedThermal.bumpMap,
      bumpScale: 0.0038,
      roughnessMap: ribbedThermal.roughnessMap,
      roughness: 0.93,
      metalness: 0.0,
      ior: 1.14,
      specularIntensity: 0.03,
      sheen: 0.32,
      sheenRoughness: 0.86,
      sheenColor: new THREE.Color(0x525b6e)
    }),
    0x525b6e,
    0.18
  );

  const bootSuede = enhanceFabricShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: bootTex.suedeMap,
      normalMap: fabricNormal,
      normalScale: new THREE.Vector2(0.88, 0.88),
      roughnessMap: bootTex.suedeRough,
      roughness: 0.88,
      metalness: 0.01,
      sheen: 0.52,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color(0xc9b89e)
    }),
    0xc9b89e,
    0.20
  );

  const bootMesh = enhanceFabricShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: bootTex.meshMap,
      normalMap: corduraNormal,
      normalScale: new THREE.Vector2(1.04, 1.04),
      roughnessMap: cordura1000D.roughnessMap,
      roughness: 0.86,
      metalness: 0.02,
      sheen: 0.30,
      sheenRoughness: 0.68,
      sheenColor: new THREE.Color(0x9a8f7e)
    }),
    0x9a8f7e,
    0.15
  );

  const bootLaces = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: bootTex.laceMap,
    normalMap: corduraNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: cordura1000D.roughnessMap,
    roughness: 0.86,
    metalness: 0.02,
    sheen: 0.26,
    sheenRoughness: 0.78,
    sheenColor: new THREE.Color(0x9a8b78)
  });

  // 2. ARMA Y METALES: MeshPhysicalMaterial con metalness: 0.9, roughness: 0.35, clearcoat: 0.2 y mapa de ruido fino en roughnessMap
  const gunmetal = new THREE.MeshPhysicalMaterial({
    color: 0x1e2126,
    metalness: 0.9,
    roughness: 0.35,
    clearcoat: 0.2,
    clearcoatRoughness: 0.28,
    roughnessMap: metalNoiseRough,
    normalMap: metalMaps.normalMap,
    normalScale: new THREE.Vector2(0.28, 0.28)
  });

  const geisseleDDC = new THREE.MeshPhysicalMaterial({
    color: 0x8c7355,
    metalness: 0.9,
    roughness: 0.35,
    clearcoat: 0.2,
    clearcoatRoughness: 0.26,
    roughnessMap: metalNoiseRough,
    normalMap: metalMaps.normalMap,
    normalScale: new THREE.Vector2(0.28, 0.28)
  });

  const fdeAnodized = new THREE.MeshPhysicalMaterial({
    color: 0x78654e,
    metalness: 0.9,
    roughness: 0.35,
    clearcoat: 0.2,
    clearcoatRoughness: 0.30,
    roughnessMap: metalNoiseRough,
    normalMap: metalMaps.normalMap,
    normalScale: new THREE.Vector2(0.25, 0.25)
  });

  const suppressorMetal = new THREE.MeshPhysicalMaterial({
    color: 0x5c4d3c,
    metalness: 0.9,
    roughness: 0.35,
    clearcoat: 0.2,
    clearcoatRoughness: 0.32,
    roughnessMap: metalNoiseRough,
    normalMap: metalMaps.normalMap,
    normalScale: new THREE.Vector2(0.3, 0.3)
  });

  const boltSteel = new THREE.MeshPhysicalMaterial({
    color: 0x9ca3af,
    metalness: 0.94,
    roughness: 0.35,
    clearcoat: 0.2,
    clearcoatRoughness: 0.24,
    roughnessMap: metalNoiseRough,
    normalMap: metalMaps.normalMap,
    normalScale: new THREE.Vector2(0.22, 0.22)
  });

  const brass = new THREE.MeshPhysicalMaterial({
    color: 0xd97706,
    metalness: 0.94,
    roughness: 0.35,
    clearcoat: 0.2,
    roughnessMap: metalNoiseRough
  });

  const copperFMJ = new THREE.MeshPhysicalMaterial({
    color: 0xb45309,
    metalness: 0.92,
    roughness: 0.35,
    clearcoat: 0.2,
    roughnessMap: metalNoiseRough
  });

  // 3. POLÍMEROS, CASCO, RODILLERAS, BOTAS Y SUELAS CON MICRO-DESGASTE, ARAÑAZOS Y POLVO
  const darkPolymer = enhanceTacticalPolymerShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: weatheredPolymer.polymerMap,
      metalness: 0.02,
      roughness: 0.80,
      roughnessMap: weatheredPolymer.roughnessMap,
      normalMap: weatheredPolymer.normalMap,
      normalScale: new THREE.Vector2(0.58, 0.58),
      bumpMap: weatheredPolymer.bumpMap,
      bumpScale: 0.006,
      ior: 1.38,
      specularIntensity: 0.14
    }),
    0x64748b,
    0.15
  );

  const helmetTex = ProceduralPBRGenerator.createTacticalHelmetPBRTextures();

  // Casco balístico FAST SF con pintura antirreflectante CARC texturizada con arena de sílice y micro-arañazos
  const helmetShell = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: weatheredPolymer.helmetMap,
    metalness: 0.02,
    roughness: 0.84,
    bumpMap: weatheredPolymer.bumpMap,
    bumpScale: 0.012,
    normalMap: stippleNormal,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughnessMap: weatheredPolymer.roughnessMap,
    sheen: 0.14,
    sheenRoughness: 0.86,
    sheenColor: new THREE.Color(0x9c8f7a)
  });

  // Funda táctica de Cordura 500D MultiCam con corte láser y micro-trama 2x2 Basketweave
  const helmetCover = enhanceFabricShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: helmetTex.coverMap,
      normalMap: helmetTex.coverNormalMap,
      normalScale: new THREE.Vector2(1.08, 1.08),
      roughnessMap: helmetTex.coverRoughnessMap,
      roughness: 0.91,
      metalness: 0.0,
      ior: 1.15,
      specularIntensity: 0.04,
      sheen: 0.24,
      sheenRoughness: 0.84,
      sheenColor: new THREE.Color(0xb5a88c)
    }),
    0xb5a88c,
    0.16
  );

  // Ribete de protección perimetral del casco en caucho de nitrilo balístico EPDM vulcanizado
  const helmetRimRubber = new THREE.MeshPhysicalMaterial({
    color: 0x16181c,
    metalness: 0.02,
    roughness: 0.78,
    bumpMap: bootTex.rubberBump,
    bumpScale: 0.015,
    normalMap: stippleNormal,
    normalScale: new THREE.Vector2(0.26, 0.26),
    roughnessMap: weatheredPolymer.roughnessMap,
    clearcoat: 0.08,
    clearcoatRoughness: 0.64
  });

  // Montura frontal Wilcox L4 G24 en aluminio aeroespacial 7075-T6 anodizado FDE mecanizado por CNC
  const wilcoxAluminum = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: helmetTex.wilcoxMetalMap,
    metalness: 0.88,
    roughness: 0.30,
    clearcoat: 0.28,
    clearcoatRoughness: 0.24,
    roughnessMap: metalNoiseRough,
    normalMap: metalMaps.normalMap,
    normalScale: new THREE.Vector2(0.20, 0.20)
  });

  // Almohadillas de gel de silicona acústica Peltor ComTac VI con sellado anatómico mate
  const headsetGel = new THREE.MeshPhysicalMaterial({
    color: 0x17191d,
    metalness: 0.02,
    roughness: 0.72,
    bumpMap: bootTex.rubberBump,
    bumpScale: 0.008,
    clearcoat: 0.16,
    clearcoatRoughness: 0.48,
    roughnessMap: weatheredPolymer.roughnessMap
  });

  // Cúpula óptica facetada Hel-Star 6 en policarbonato con circuito PCB en oro y LEDs visibles
  const strobeDomeGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: helmetTex.strobeCircuitMap,
    emissive: 0x052e16,
    emissiveIntensity: 0.35,
    roughness: 0.06,
    metalness: 0.12,
    transparent: true,
    opacity: 0.92,
    ior: 1.58,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    reflectivity: 0.95
  });

  // Parche táctico retro-reflectante IR Subdued con micro-prismas hexagonales 3M SOLAS
  const irReflectivePatch = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: helmetTex.irPatchMap,
    normalMap: corduraNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.54,
    metalness: 0.22,
    clearcoat: 0.26,
    clearcoatRoughness: 0.32,
    sheen: 0.42,
    sheenColor: new THREE.Color(0x9c8e75)
  });

  // Caucho de combate para cúpulas de rodilleras Crye AirFlex, coderas y armadura TPR de guantes
  const combatRubber = enhanceTacticalPolymerShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: bootTex.rubberMap,
      metalness: 0.02,
      roughness: 0.78,
      normalMap: weatheredPolymer.normalMap,
      normalScale: new THREE.Vector2(0.46, 0.46),
      bumpMap: bootTex.rubberBump,
      bumpScale: 0.024,
      roughnessMap: bootTex.rubberRough,
      clearcoat: 0.06,
      clearcoatRoughness: 0.62
    }),
    0x78716c,
    0.14
  );

  const stippledPolymer = enhanceTacticalPolymerShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: weatheredPolymer.polymerMap,
      metalness: 0.01,
      roughness: 0.84,
      roughnessMap: weatheredPolymer.roughnessMap,
      normalMap: stippleNormal,
      normalScale: new THREE.Vector2(1.04, 1.04)
    }),
    0x64748b,
    0.12
  );

  const pmagFDE = enhanceTacticalPolymerShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: weatheredPolymer.pmagMap,
      metalness: 0.02,
      roughness: 0.78,
      normalMap: weatheredPolymer.normalMap,
      normalScale: new THREE.Vector2(0.52, 0.52),
      bumpMap: weatheredPolymer.bumpMap,
      bumpScale: 0.008,
      roughnessMap: weatheredPolymer.roughnessMap,
      ior: 1.38,
      specularIntensity: 0.14
    }),
    0xa89882,
    0.16
  );

  const hypalon = enhanceFabricShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: weatheredPolymer.polymerMap,
      metalness: 0.01,
      roughness: 0.88,
      normalMap: cordura1000D.normalMap,
      normalScale: new THREE.Vector2(0.76, 0.76),
      roughnessMap: weatheredPolymer.roughnessMap,
      sheen: 0.24,
      sheenRoughness: 0.82,
      sheenColor: new THREE.Color(0x475569)
    }),
    0x475569,
    0.16
  );

  const bootChassis = new THREE.MeshPhysicalMaterial({
    color: 0x352c22,
    metalness: 0.04,
    roughness: 0.56,
    bumpMap: bootTex.rubberBump,
    bumpScale: 0.018,
    roughnessMap: bootTex.rubberRough,
    clearcoat: 0.10,
    clearcoatRoughness: 0.48
  });

  const bootMidsole = new THREE.MeshPhysicalMaterial({
    color: 0x26231f,
    map: bootTex.rubberMap,
    metalness: 0.02,
    roughness: 0.78,
    bumpMap: bootTex.rubberBump,
    bumpScale: 0.022,
    roughnessMap: bootTex.rubberRough
  });

  const patchMat = enhanceFabricShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: helmetTex.velcroMohawkMap,
      normalMap: cordura1000D.normalMap,
      normalScale: new THREE.Vector2(1.12, 1.12),
      metalness: 0.0,
      roughness: 0.94,
      roughnessMap: cordura1000D.roughnessMap,
      sheen: 0.38,
      sheenRoughness: 0.86,
      sheenColor: new THREE.Color(0x7c6f5b)
    }),
    0x7c6f5b,
    0.16
  );

  const redTab = enhanceFabricShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: cordura1000D.redWebbingMap,
      normalMap: cordura1000D.webbingNormalMap,
      normalScale: new THREE.Vector2(0.96, 0.96),
      metalness: 0.0,
      roughness: 0.88,
      roughnessMap: cordura1000D.roughnessMap,
      sheen: 0.28,
      sheenRoughness: 0.78,
      sheenColor: new THREE.Color(0xe05252)
    }),
    0xe05252,
    0.16
  );

  const stitchThread = enhanceFabricShader(
    new THREE.MeshPhysicalMaterial({
      color: 0x968367,
      normalMap: cordura1000D.webbingNormalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
      metalness: 0.01,
      roughness: 0.86,
      sheen: 0.34,
      sheenRoughness: 0.76,
      sheenColor: new THREE.Color(0xc2b092)
    }),
    0xc2b092,
    0.16
  );

  // 4. MATERIALES ANATÓMICOS Y ÓPTICOS ESPECIALIZADOS (Piel Humana y Ojos con Shader SSS Rojizo en Bordes de Luz)
  const skin = enhanceSubsurfaceSkinShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: skinEyeTex.skinMap,
      normalMap: skinEyeTex.skinNormalMap,
      normalScale: new THREE.Vector2(0.46, 0.46),
      roughnessMap: skinEyeTex.skinRoughnessMap,
      roughness: 0.52,
      metalness: 0.0,
      ior: 1.38,
      clearcoat: 0.12,
      clearcoatRoughness: 0.36,
      sheen: 0.42,
      sheenRoughness: 0.58,
      sheenColor: new THREE.Color(0xf07a68),
      reflectivity: 0.34
    })
  );

  const eyeSclera = enhanceSubsurfaceSkinShader(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: skinEyeTex.scleraMap,
      normalMap: skinEyeTex.skinNormalMap,
      normalScale: new THREE.Vector2(0.06, 0.06),
      roughness: 0.05,
      metalness: 0.0,
      ior: 1.376,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      sheen: 0.35,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color(0xed6b5a)
    })
  );

  const eyeIris = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: skinEyeTex.irisMap,
    normalMap: skinEyeTex.skinNormalMap,
    normalScale: new THREE.Vector2(0.18, 0.18),
    roughness: 0.10,
    metalness: 0.08,
    ior: 1.40,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01
  });

  const visorGlass = new THREE.MeshPhysicalMaterial({
    color: 0x090e17,
    emissive: 0x030912,
    emissiveIntensity: 0.18,
    roughness: 0.03,
    metalness: 0.38,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    reflectivity: 0.96,
    transparent: true,
    opacity: 0.88
  });

  // Ventana translúcida ahumada Magpul PMAG
  const magWindowGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1c1917,
    roughness: 0.08,
    metalness: 0.18,
    transparent: true,
    opacity: 0.44,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    reflectivity: 0.9,
    depthWrite: false
  });

  const opticGlassRuby = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    emissive: 0x451a03,
    emissiveIntensity: 0.35,
    roughness: 0.02,
    metalness: 0.45,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide
  });

  // Lente Objetivo y Ocular Dicroica L3Harris GPNVG-18 con Shader GLSL de Interferencia Multicapa (Thin-Film Iridescence)
  const nvgLens = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: helmetTex.dichroicLensMap,
    emissive: 0x047857,
    emissiveIntensity: 0.42,
    roughness: 0.03,
    metalness: 0.32,
    ior: 1.72,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    sheen: 0.90,
    sheenRoughness: 0.12,
    sheenColor: new THREE.Color(0x34d399)
  });

  nvgLens.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      // Película delgada dicroica antirreflectante (esmeralda -> cian -> azul zafiro en ángulo rasante)
      vec3 vDir = normalize(vViewPosition);
      float ndv = saturate(dot(normal, vDir));
      float fresnel = pow(1.0 - ndv, 2.4);
      vec3 emeraldFilm = vec3(0.06, 0.82, 0.54);
      vec3 cyanFilm = vec3(0.04, 0.72, 0.88);
      vec3 thinFilmCol = mix(emeraldFilm, cyanFilm, smoothstep(0.15, 0.75, fresnel));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + thinFilmCol * 0.65, fresnel);
      #include <dithering_fragment>
      `
    );
  };

  const eotechReticle = new THREE.MeshBasicMaterial({
    map: reticleTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  return {
    camoFabric,
    corduraVest,
    webbing,
    balaclava,
    bootSuede,
    bootMesh,
    bootLaces,
    gunmetal,
    geisseleDDC,
    fdeAnodized,
    suppressorMetal,
    boltSteel,
    brass,
    copperFMJ,
    darkPolymer,
    helmetShell,
    helmetCover,
    helmetRimRubber,
    wilcoxAluminum,
    headsetGel,
    strobeDomeGlass,
    irReflectivePatch,
    combatRubber,
    stippledPolymer,
    pmagFDE,
    hypalon,
    bootChassis,
    bootMidsole,
    patchMat,
    redTab,
    stitchThread,
    skin,
    eyeSclera,
    eyeIris,
    visorGlass,
    magWindowGlass,
    opticGlassRuby,
    nvgLens,
    eotechReticle
  };
}
