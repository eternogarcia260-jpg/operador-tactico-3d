import * as THREE from 'three';
import { CamoPalette } from '../types';

/**
 * Motor de Texturas Procedurales PBR de Alta Definición (1024x1024 / 512x512)
 */
export class ProceduralPBRGenerator {
  // Genera mapa de micro-tejido (weave/ripstop) en Canvas para bumpMap de telas tácticas
  static createFabricWeaveBumpMap(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        // Trama de hilo cruzado (warp & weft weave)
        const weave = (x % 4 < 2 ? 1 : -1) * (y % 4 < 2 ? 1 : -1) * 18;
        // Cuadrícula ripstop de refuerzo cada 16 píxeles
        const ripstop = x % 16 === 0 || y % 16 === 0 ? 38 : 0;
        // Micro-grano orgánico
        const noise = (Math.random() - 0.5) * 12;
        const val = Math.min(255, Math.max(0, 128 + weave + ripstop + noise));
        data[idx] = data[idx + 1] = data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    tex.anisotropy = 16;
    return tex;
  }

  // Genera mapa de ruido fino en Canvas para roughnessMap de arma y metales
  static createMetalNoiseRoughnessMap(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, 0, size, size);

    // Micro-rayones direccionales y granulado de mecanizado CNC / pavonado
    for (let i = 0; i < 2200; i++) {
      const v = 50 + Math.floor(Math.random() * 85);
      ctx.strokeStyle = `rgba(${v}, ${v}, ${v}, 0.28)`;
      ctx.lineWidth = 0.5 + Math.random() * 0.9;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 4 + Math.random() * 32;
      const angle = (Math.random() - 0.5) * 0.22;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.anisotropy = 16;
    return tex;
  }

  // Genera mapa de grano fino en Canvas para bumpMap de polímeros tácticos (Kydex/Nylon)
  static createPolymerGrainBumpMap(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    for (let i = 0; i < size * size * 4; i += 4) {
      // Micro-porosidad y stippling fino
      const n = 128 + Math.floor((Math.random() - 0.5) * 48);
      data[i] = data[i + 1] = data[i + 2] = n;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    tex.anisotropy = 16;
    return tex;
  }

  // Genera texturas PBR completas de Cordura 1000D (con Mapa de Normales Tangencial 2x2 Basketweave),
  // Cincha MIL-W-4088 en espiga (con Mapa de Normales Chevron Herringbone), Velcro Loop y Tiradores Rojos
  static createCordura1000DTextures(): {
    map: THREE.CanvasTexture;
    webbingMap: THREE.CanvasTexture;
    velcroMap: THREE.CanvasTexture;
    redWebbingMap: THREE.CanvasTexture;
    bumpMap: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
    webbingNormalMap: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  } {
    const size = 512;
    const diffCanvas = document.createElement('canvas');
    const webCanvas = document.createElement('canvas');
    const velcroCanvas = document.createElement('canvas');
    const redCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    const normCanvas = document.createElement('canvas');
    const webNormCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');

    diffCanvas.width = webCanvas.width = velcroCanvas.width = redCanvas.width = bumpCanvas.width = normCanvas.width = webNormCanvas.width = roughCanvas.width = size;
    diffCanvas.height = webCanvas.height = velcroCanvas.height = redCanvas.height = bumpCanvas.height = normCanvas.height = webNormCanvas.height = roughCanvas.height = size;

    const dCtx = diffCanvas.getContext('2d')!;
    const wCtx = webCanvas.getContext('2d')!;
    const vCtx = velcroCanvas.getContext('2d')!;
    const redCtx = redCanvas.getContext('2d')!;
    const bCtx = bumpCanvas.getContext('2d')!;
    const nCtx = normCanvas.getContext('2d')!;
    const wnCtx = webNormCanvas.getContext('2d')!;
    const rCtx = roughCanvas.getContext('2d')!;

    const dImg = dCtx.createImageData(size, size);
    const wImg = wCtx.createImageData(size, size);
    const vImg = vCtx.createImageData(size, size);
    const redImg = redCtx.createImageData(size, size);
    const bImg = bCtx.createImageData(size, size);
    const nImg = nCtx.createImageData(size, size);
    const wnImg = wnCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);

    const dData = dImg.data;
    const wData = wImg.data;
    const vData = vImg.data;
    const redData = redImg.data;
    const bData = bImg.data;
    const nData = nImg.data;
    const wnData = wnImg.data;
    const rData = rImg.data;

    let seed = 739182;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Trama de tejido balístico Cordura 1000D (Basket Weave 2x2) + Cincha Herringbone + Velcro Loop Pile
    for (let y = 0; y < size; y++) {
      const yBlock = Math.floor(y / 6);
      const yPhase = (y % 6) / 6;
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const xBlock = Math.floor(x / 6);
        const xPhase = (x % 6) / 6;

        // 1. Entrelazado de trama y urdimbre (Basket Weave 2x2 de filamentos de nylon texturizado por aire)
        const isWarp = (xBlock + yBlock) % 2 === 0;
        const phase = isWarp ? yPhase : xPhase;
        const crossPhase = isWarp ? xPhase : yPhase;

        const hump = Math.sin(phase * Math.PI) * Math.cos(crossPhase * Math.PI - 0.5 * Math.PI);
        const filamentGroove = Math.sin((isWarp ? x : y) * 1.15) * 0.36;
        const yarnBias = isWarp ? 7.2 : -7.2;
        const ripGrid = (x % 24 === 0 || y % 24 === 0) ? -11.0 : ((x % 24 === 1 || y % 24 === 1) ? 8.5 : 0.0);

        // Variación orgánica macro de polvo seco, pliegues y desgaste en campaña
        const macroDust =
          (Math.sin(x * 0.024 + y * 0.019) + Math.cos(x * 0.017 - y * 0.029)) * 13.5 +
          Math.sin(x * 0.068 + y * 0.052) * 8.0;
        const microFuzz = (rand() - 0.5) * 15.0;

        // Oclusión de intersticios profundos entre cabos de nylon
        const intersticeAO = Math.max(0.68, 0.78 + hump * 0.26);

        // Albedo Cordura 1000D Coyote / Ranger Khaki (#6c604d) con sombreado real de intersticios entre hilos
        const yarnShade = (hump - 0.40) * 42.0 + filamentGroove * 20.0 + yarnBias + ripGrid + macroDust + microFuzz;
        dData[idx] = Math.min(255, Math.max(0, Math.floor((108 + yarnShade) * intersticeAO)));
        dData[idx + 1] = Math.min(255, Math.max(0, Math.floor((96 + yarnShade * 0.90) * intersticeAO)));
        dData[idx + 2] = Math.min(255, Math.max(0, Math.floor((76 + yarnShade * 0.76) * intersticeAO)));
        dData[idx + 3] = 255;

        // 2. Albedo Cincha MIL-W-4088 (Herringbone Twill Webbing #463e31)
        const vPeriod = 20;
        const vDist = Math.abs((y % vPeriod) - vPeriod * 0.5);
        const chevronArg = x * 0.72 + vDist * 1.25;
        const chevron = Math.sin(chevronArg);
        const webRidge = chevron * 25.0 + Math.cos(y * 1.35) * 11.0 + macroDust * 0.7 + microFuzz * 0.9;
        wData[idx] = Math.min(255, Math.max(0, Math.floor(72 + webRidge)));
        wData[idx + 1] = Math.min(255, Math.max(0, Math.floor(62 + webRidge * 0.88)));
        wData[idx + 2] = Math.min(255, Math.max(0, Math.floor(49 + webRidge * 0.74)));
        wData[idx + 3] = 255;

        // 3. Albedo Velcro Loop Pile (#2d2923) con micro-bucles enmarañados mates
        const loopCurl =
          Math.sin(x * 0.55 + Math.cos(y * 0.52) * 2.6) *
          Math.cos(y * 0.58 - Math.sin(x * 0.48) * 2.6) *
          19.0;
        const feltNoise = (rand() - 0.5) * 22.0 + macroDust * 0.5;
        vData[idx] = Math.min(255, Math.max(0, Math.floor(44 + loopCurl + feltNoise)));
        vData[idx + 1] = Math.min(255, Math.max(0, Math.floor(40 + loopCurl * 0.92 + feltNoise * 0.9)));
        vData[idx + 2] = Math.min(255, Math.max(0, Math.floor(34 + loopCurl * 0.82 + feltNoise * 0.8)));
        vData[idx + 3] = 255;

        // 4. Albedo Cincha Roja Médica IFAK / Torniquete (#9e1c1c) con textura de hilo tejido mate
        const redWeave = chevron * 24.0 + (hump - 0.35) * 22.0 + microFuzz;
        redData[idx] = Math.min(255, Math.max(0, Math.floor(156 + redWeave)));
        redData[idx + 1] = Math.min(255, Math.max(0, Math.floor(26 + redWeave * 0.35)));
        redData[idx + 2] = Math.min(255, Math.max(0, Math.floor(24 + redWeave * 0.32)));
        redData[idx + 3] = 255;

        // 5. Relieve (Bump) de alta definición para la trama textil
        const relief = (hump * 1.45 + filamentGroove) * 92 + ripGrid * 1.9 + macroDust + microFuzz;
        const bumpVal = Math.min(255, Math.max(0, Math.floor(128 + relief)));
        bData[idx] = bData[idx + 1] = bData[idx + 2] = bumpVal;
        bData[idx + 3] = 255;

        // 6. Mapa de Normales Tangencial Analítico para Cordura 1000D Basketweave 2x2
        const dPhase = Math.cos(phase * Math.PI) * Math.PI;
        const dCross = -Math.sin(crossPhase * Math.PI - 0.5 * Math.PI) * Math.PI;
        let nx = (isWarp ? dCross * 0.24 : dPhase * 0.42) + (x % 24 === 0 ? 0.45 : x % 24 === 1 ? -0.45 : 0);
        let ny = (isWarp ? dPhase * 0.42 : dCross * 0.24) + (y % 24 === 0 ? 0.45 : y % 24 === 1 ? -0.45 : 0);
        nx += (isWarp ? Math.cos(x * 1.15) * 0.22 : 0) + (rand() - 0.5) * 0.14;
        ny += (!isWarp ? Math.cos(y * 1.15) * 0.22 : 0) + (rand() - 0.5) * 0.14;
        const nLen = Math.hypot(nx, ny, 1.0);
        nData[idx] = Math.min(255, Math.max(0, Math.round(((nx / nLen) * 0.5 + 0.5) * 255)));
        nData[idx + 1] = Math.min(255, Math.max(0, Math.round(((ny / nLen) * 0.5 + 0.5) * 255)));
        nData[idx + 2] = Math.min(255, Math.max(128, Math.round(((1.0 / nLen) * 0.5 + 0.5) * 255)));
        nData[idx + 3] = 255;

        // 7. Mapa de Normales Tangencial Analítico para Cincha MIL-W-4088 en Espiga (Herringbone Chevron)
        const vSign = (y % vPeriod) < vPeriod * 0.5 ? -1.0 : 1.0;
        const dChevron = Math.cos(chevronArg);
        const wnx = dChevron * 0.56 + (rand() - 0.5) * 0.12;
        const wny = dChevron * vSign * 0.52 - Math.sin(y * 1.35) * 0.28 + (rand() - 0.5) * 0.12;
        const wnLen = Math.hypot(wnx, wny, 1.0);
        wnData[idx] = Math.min(255, Math.max(0, Math.round(((wnx / wnLen) * 0.5 + 0.5) * 255)));
        wnData[idx + 1] = Math.min(255, Math.max(0, Math.round(((wny / wnLen) * 0.5 + 0.5) * 255)));
        wnData[idx + 2] = Math.min(255, Math.max(128, Math.round(((1.0 / wnLen) * 0.5 + 0.5) * 255)));
        wnData[idx + 3] = 255;

        // 8. Rugosidad micro-estructurada (~0.84 en las coronas de hilo rozadas, ~0.97 en valles/intersticios)
        const roughVal = Math.min(255, Math.max(204, Math.floor(240 - hump * 28 + macroDust * 0.9 + microFuzz * 0.7)));
        rData[idx] = rData[idx + 1] = rData[idx + 2] = roughVal;
        rData[idx + 3] = 255;
      }
    }

    dCtx.putImageData(dImg, 0, 0);
    wCtx.putImageData(wImg, 0, 0);
    vCtx.putImageData(vImg, 0, 0);
    redCtx.putImageData(redImg, 0, 0);
    bCtx.putImageData(bImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    wnCtx.putImageData(wnImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);

    // Pátina orgánica de polvo seco, pliegues sombreados y roce de campaña sobre la Cordura
    for (let i = 0; i < 65; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const r = 14 + rand() * 68;
      const isDust = i % 2 === 0;
      const dGrad = dCtx.createRadialGradient(cx, cy, 2, cx, cy, r);
      if (isDust) {
        dGrad.addColorStop(0, 'rgba(154, 142, 120, 0.25)');
        dGrad.addColorStop(1, 'rgba(106, 94, 75, 0)');
      } else {
        dGrad.addColorStop(0, 'rgba(48, 40, 30, 0.28)');
        dGrad.addColorStop(1, 'rgba(106, 94, 75, 0)');
      }
      dCtx.fillStyle = dGrad;
      dCtx.beginPath();
      dCtx.arc(cx, cy, r, 0, Math.PI * 2);
      dCtx.fill();

      const rGrad = rCtx.createRadialGradient(cx, cy, 2, cx, cy, r);
      rGrad.addColorStop(0, 'rgba(252, 252, 252, 0.48)');
      rGrad.addColorStop(1, 'rgba(234, 234, 234, 0)');
      rCtx.fillStyle = rGrad;
      rCtx.beginPath();
      rCtx.arc(cx, cy, r, 0, Math.PI * 2);
      rCtx.fill();
    }

    const makeTex = (canvas: HTMLCanvasElement, isSRGB: boolean, repeat: number) => {
      const tex = new THREE.CanvasTexture(canvas);
      if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
      tex.anisotropy = 16;
      return tex;
    };

    return {
      map: makeTex(diffCanvas, true, 8),
      webbingMap: makeTex(webCanvas, true, 8),
      velcroMap: makeTex(velcroCanvas, true, 7),
      redWebbingMap: makeTex(redCanvas, true, 7),
      bumpMap: makeTex(bumpCanvas, false, 8),
      normalMap: makeTex(normCanvas, false, 8),
      webbingNormalMap: makeTex(webNormCanvas, false, 9),
      roughnessMap: makeTex(roughCanvas, false, 8)
    };
  }

  // Genera mapa de punto acanalado (Ribbed Jersey Knit) táctico con Mapa de Normales Tangencial de bucles en V
  // para camiseta ignífuga Drifire/Crye G3 del torso y pasamontañas
  static createTacticalRibbedThermalTextures(): {
    map: THREE.CanvasTexture;
    bumpMap: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  } {
    const size = 512;
    const diffCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    const normCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');
    diffCanvas.width = bumpCanvas.width = normCanvas.width = roughCanvas.width = size;
    diffCanvas.height = bumpCanvas.height = normCanvas.height = roughCanvas.height = size;
    const dCtx = diffCanvas.getContext('2d')!;
    const bCtx = bumpCanvas.getContext('2d')!;
    const nCtx = normCanvas.getContext('2d')!;
    const rCtx = roughCanvas.getContext('2d')!;

    const dImg = dCtx.createImageData(size, size);
    const bImg = bCtx.createImageData(size, size);
    const nImg = nCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);
    const dData = dImg.data;
    const bData = bImg.data;
    const nData = nImg.data;
    const rData = rImg.data;

    let seed = 512943;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Punto jersey acanalado de algodón/modacrílico ignífugo en tono carbón pizarra (#252932) con micro-bucles en V
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const ribPhase = (x % 8) / 8.0;
        const vOffset = Math.abs((x % 8) - 4) * 0.92;
        const vArg = ((y + vOffset) / 3.5) * Math.PI * 2.0;
        const stitchV = Math.sin(vArg) * 16.0;
        const ribRelief = Math.sin(ribPhase * Math.PI * 2.0) * 56.0;
        const macroFold = Math.sin(x * 0.025 + y * 0.018) * 7.5 + Math.cos(y * 0.032 - x * 0.015) * 6.0;
        const microFuzz = (rand() - 0.5) * 12.0;

        const val = Math.min(255, Math.max(0, Math.floor(128 + ribRelief + stitchV + microFuzz)));
        bData[idx] = bData[idx + 1] = bData[idx + 2] = val;
        bData[idx + 3] = 255;

        // Mapa de Normales Tangencial Analítico de los canales de punto y bucles en V (Wale & Course Knit)
        const vSign = (x % 8) < 4 ? -1.0 : 1.0;
        const nx = Math.cos(ribPhase * Math.PI * 2.0) * 0.62 + Math.cos(vArg) * vSign * 0.25 + (rand() - 0.5) * 0.14;
        const ny = Math.cos(vArg) * 0.42 + (rand() - 0.5) * 0.14;
        const nLen = Math.hypot(nx, ny, 1.0);
        nData[idx] = Math.min(255, Math.max(0, Math.round(((nx / nLen) * 0.5 + 0.5) * 255)));
        nData[idx + 1] = Math.min(255, Math.max(0, Math.round(((ny / nLen) * 0.5 + 0.5) * 255)));
        nData[idx + 2] = Math.min(255, Math.max(128, Math.round(((1.0 / nLen) * 0.5 + 0.5) * 255)));
        nData[idx + 3] = 255;

        // Variación rica en diffuse: canales sombreados entre las costillas térmicas y crestas mate gris carbón
        const dShade = 38 + ribRelief * 0.20 + stitchV * 0.24 + macroFold + microFuzz * 0.35;
        dData[idx] = Math.min(255, Math.max(12, Math.floor(dShade)));
        dData[idx + 1] = Math.min(255, Math.max(14, Math.floor(dShade + 3)));
        dData[idx + 2] = Math.min(255, Math.max(18, Math.floor(dShade + 7)));
        dData[idx + 3] = 255;

        // Rugosidad textil mate de algodón/nomex (~0.90 - 0.98)
        const rVal = Math.min(255, Math.max(218, Math.floor(242 - ribRelief * 0.16 + (rand() - 0.5) * 10)));
        rData[idx] = rData[idx + 1] = rData[idx + 2] = rVal;
        rData[idx + 3] = 255;
      }
    }
    dCtx.putImageData(dImg, 0, 0);
    bCtx.putImageData(bImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);

    const diffTex = new THREE.CanvasTexture(diffCanvas);
    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    const normTex = new THREE.CanvasTexture(normCanvas);
    const roughTex = new THREE.CanvasTexture(roughCanvas);
    diffTex.colorSpace = THREE.SRGBColorSpace;
    diffTex.wrapS =
      diffTex.wrapT =
      bumpTex.wrapS =
      bumpTex.wrapT =
      normTex.wrapS =
      normTex.wrapT =
      roughTex.wrapS =
      roughTex.wrapT =
        THREE.RepeatWrapping;
    diffTex.repeat.set(22, 22);
    bumpTex.repeat.set(22, 22);
    normTex.repeat.set(22, 22);
    roughTex.repeat.set(22, 22);
    diffTex.anisotropy = bumpTex.anisotropy = normTex.anisotropy = roughTex.anisotropy = 16;

    return { map: diffTex, bumpMap: bumpTex, normalMap: normTex, roughnessMap: roughTex };
  }

  // Genera mapas PBR completos (Albedo sRGB + Bump + Normal Tangencial EDM + Roughness) para Casco Balístico CARC,
  // Polímero Kydex Mate (funda Safariland, rodilleras AirFlex, Hypalon) y Polímero FDE con Fibra de Vidrio
  static createWeatheredPolymerTextures(): {
    helmetMap: THREE.CanvasTexture;
    polymerMap: THREE.CanvasTexture;
    pmagMap: THREE.CanvasTexture;
    bumpMap: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  } {
    const size = 512;
    const helmetCanvas = document.createElement('canvas');
    const polyCanvas = document.createElement('canvas');
    const pmagCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    const normCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');

    helmetCanvas.width = polyCanvas.width = pmagCanvas.width = bumpCanvas.width = normCanvas.width = roughCanvas.width = size;
    helmetCanvas.height = polyCanvas.height = pmagCanvas.height = bumpCanvas.height = normCanvas.height = roughCanvas.height = size;

    const hCtx = helmetCanvas.getContext('2d')!;
    const pCtx = polyCanvas.getContext('2d')!;
    const mCtx = pmagCanvas.getContext('2d')!;
    const bCtx = bumpCanvas.getContext('2d')!;
    const nCtx = normCanvas.getContext('2d')!;
    const rCtx = roughCanvas.getContext('2d')!;

    const hImg = hCtx.createImageData(size, size);
    const pImg = pCtx.createImageData(size, size);
    const mImg = mCtx.createImageData(size, size);
    const bImg = bCtx.createImageData(size, size);
    const nImg = nCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);

    const hData = hImg.data;
    const pData = pImg.data;
    const mData = mImg.data;
    const bData = bImg.data;
    const nData = nImg.data;
    const rData = rImg.data;

    let seed = 314159;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // 1. Pintura balística antirreflectante CARC con sílice texturizada + malla snakeskin en el casco Ops-Core
        const snakeX = (x + (Math.floor(y / 6) % 2) * 3) % 6;
        const snakeY = y % 6;
        const snakeScale = Math.hypot(snakeX - 3, snakeY - 3) < 2.1 ? 5.5 : -3.5;
        const sandGrain = (rand() - 0.5) * 16.0;
        const dustWave =
          Math.sin(x * 0.024 + y * 0.019) * 7.5 +
          Math.cos(x * 0.035 - y * 0.028) * 5.5;

        const hShade = snakeScale + sandGrain * 0.65 + dustWave;
        hData[idx] = Math.min(255, Math.max(0, Math.floor(88 + hShade)));
        hData[idx + 1] = Math.min(255, Math.max(0, Math.floor(79 + hShade * 0.90)));
        hData[idx + 2] = Math.min(255, Math.max(0, Math.floor(64 + hShade * 0.78)));
        hData[idx + 3] = 255;

        // 2. Kydex / Nylon 66 cargado con fibra de vidrio y granallado EDM en negro grafito mate (#1e2126)
        const edmWaveX = Math.sin(x * 0.52 + Math.cos(y * 0.37) * 1.8);
        const edmWaveY = Math.cos(y * 0.52 - Math.sin(x * 0.37) * 1.8);
        const edmGrain = (rand() - 0.5) * 15.0 + edmWaveX * edmWaveY * 5.5;
        const pDust = Math.max(0, dustWave) * 1.15;
        const pVal = 29 + edmGrain * 0.58 + pDust;
        pData[idx] = Math.min(255, Math.max(12, Math.floor(pVal)));
        pData[idx + 1] = Math.min(255, Math.max(14, Math.floor(pVal + 2)));
        pData[idx + 2] = Math.min(255, Math.max(16, Math.floor(pVal + 4)));
        pData[idx + 3] = 255;

        // 3. Polímero FDE Magpul / Crye AirFlex (#76654e) con micro-fibra de vidrio y pátina mate
        const fdeShade = edmGrain * 0.68 + dustWave * 0.88;
        mData[idx] = Math.min(255, Math.max(0, Math.floor(117 + fdeShade)));
        mData[idx + 1] = Math.min(255, Math.max(0, Math.floor(100 + fdeShade * 0.88)));
        mData[idx + 2] = Math.min(255, Math.max(0, Math.floor(77 + fdeShade * 0.75)));
        mData[idx + 3] = 255;

        // 4. Bump de micro-textura de molde EDM y grano de arena sílice
        const bVal = Math.min(255, Math.max(0, Math.floor(128 + sandGrain * 2.2 + snakeScale * 1.2)));
        bData[idx] = bData[idx + 1] = bData[idx + 2] = bVal;
        bData[idx + 3] = 255;

        // 5. Mapa de Normales Tangencial de grano EDM de polímero táctico
        const pnx = edmWaveX * 0.28 + (rand() - 0.5) * 0.24;
        const pny = edmWaveY * 0.28 + (rand() - 0.5) * 0.24;
        const pnLen = Math.hypot(pnx, pny, 1.0);
        nData[idx] = Math.min(255, Math.max(0, Math.round(((pnx / pnLen) * 0.5 + 0.5) * 255)));
        nData[idx + 1] = Math.min(255, Math.max(0, Math.round(((pny / pnLen) * 0.5 + 0.5) * 255)));
        nData[idx + 2] = Math.min(255, Math.max(128, Math.round(((1.0 / pnLen) * 0.5 + 0.5) * 255)));
        nData[idx + 3] = 255;

        // 6. Rugosidad base mate (~0.78 - 0.92, valor 198-236) para evitar reflejos especulares blancos de plástico
        const rVal = Math.min(255, Math.max(194, Math.floor(218 + dustWave * 1.7 + sandGrain * 0.95)));
        rData[idx] = rData[idx + 1] = rData[idx + 2] = rVal;
        rData[idx + 3] = 255;
      }
    }

    hCtx.putImageData(hImg, 0, 0);
    pCtx.putImageData(pImg, 0, 0);
    mCtx.putImageData(mImg, 0, 0);
    bCtx.putImageData(bImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);

    // Micro-arañazos tácticos de uso real y abrasiones sobre polímeros, rodilleras y fundas Kydex
    for (let i = 0; i < 190; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = 6 + rand() * 38;
      const angle = rand() * Math.PI * 2;
      const ex = x + Math.cos(angle) * len;
      const ey = y + Math.sin(angle) * len;
      const lw = 0.7 + rand() * 1.3;

      bCtx.strokeStyle = rand() > 0.4 ? 'rgba(65, 65, 65, 0.55)' : 'rgba(195, 195, 195, 0.55)';
      bCtx.lineWidth = lw;
      bCtx.beginPath();
      bCtx.moveTo(x, y);
      bCtx.lineTo(ex, ey);
      bCtx.stroke();

      nCtx.strokeStyle = i % 2 === 0 ? 'rgba(165, 102, 255, 0.42)' : 'rgba(92, 154, 255, 0.42)';
      nCtx.lineWidth = lw * 1.05;
      nCtx.beginPath();
      nCtx.moveTo(x, y);
      nCtx.lineTo(ex, ey);
      nCtx.stroke();

      rCtx.strokeStyle = 'rgba(158, 158, 158, 0.58)';
      rCtx.lineWidth = lw * 1.1;
      rCtx.beginPath();
      rCtx.moveTo(x, y);
      rCtx.lineTo(ex, ey);
      rCtx.stroke();

      hCtx.strokeStyle = 'rgba(118, 108, 92, 0.32)';
      hCtx.lineWidth = lw * 0.9;
      hCtx.beginPath();
      hCtx.moveTo(x, y);
      hCtx.lineTo(ex, ey);
      hCtx.stroke();

      pCtx.strokeStyle = 'rgba(58, 62, 70, 0.32)';
      pCtx.lineWidth = lw * 0.85;
      pCtx.beginPath();
      pCtx.moveTo(x, y);
      pCtx.lineTo(ex, ey);
      pCtx.stroke();

      mCtx.strokeStyle = 'rgba(146, 128, 104, 0.30)';
      mCtx.lineWidth = lw * 0.85;
      mCtx.beginPath();
      mCtx.moveTo(x, y);
      mCtx.lineTo(ex, ey);
      mCtx.stroke();
    }

    const makeTex = (canvas: HTMLCanvasElement, isSRGB: boolean, repeat: number) => {
      const tex = new THREE.CanvasTexture(canvas);
      if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
      tex.anisotropy = 16;
      return tex;
    };

    return {
      helmetMap: makeTex(helmetCanvas, true, 4),
      polymerMap: makeTex(polyCanvas, true, 6),
      pmagMap: makeTex(pmagCanvas, true, 5),
      bumpMap: makeTex(bumpCanvas, false, 5),
      normalMap: makeTex(normCanvas, false, 5),
      roughnessMap: makeTex(roughCanvas, false, 5)
    };
  }

  // Genera retícula holográfica EOTech (Anillo de 68 MOA con 4 marcas cardinales y punto central de 1 MOA)
  static createEOTechReticleTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const r = 64;

    // Halo láser difuso exterior
    ctx.shadowColor = '#ff1e1e';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#ff2a2a';
    ctx.fillStyle = '#ff3b3b';
    ctx.lineWidth = 5;

    // Anillo de 68 MOA
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // 4 marcas cardinales (12, 3, 6, 9 en punto)
    const tickLen = 16;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(
        cx + Math.cos(angle) * (r - tickLen * 0.5),
        cy + Math.sin(angle) * (r - tickLen * 0.5)
      );
      ctx.lineTo(
        cx + Math.cos(angle) * (r + tickLen * 0.6),
        cy + Math.sin(angle) * (r + tickLen * 0.6)
      );
      ctx.stroke();
    }

    // Punto central de 1 MOA + Segundo punto de caída balística BDC
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy + 20, 2.8, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  // Genera mapa de picado (Stippling) para empuñaduras de polímero y paneles RailScales
  static createStippleNormalMap(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 6) {
      for (let x = 0; x < size; x += 6) {
        const ox = x + (y % 12 === 0 ? 3 : 0);
        ctx.fillStyle = 'rgb(85, 85, 255)';
        ctx.beginPath();
        ctx.arc(ox, y, 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgb(175, 175, 255)';
        ctx.beginPath();
        ctx.arc(ox + 0.8, y + 0.8, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }

  // Genera mapa de camuflaje Crye Precision MultiCam® 50/50 NYCO Ripstop 1K de máxima nitidez (Razor-Sharp):
  // manchas orgánicas opacas con contornos nítidos vectoriales, ramificaciones horizontales de alto contraste,
  // micro-salpicaduras e islas auténticas y trama ripstop hilo a hilo sin degradados borrosos.
  static createCamoTexture(palette: CamoPalette): {
    map: THREE.CanvasTexture;
    bumpMap: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  } {
    const size = 1024;
    const canvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    const normCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');
    canvas.width = bumpCanvas.width = normCanvas.width = roughCanvas.width = size;
    canvas.height = bumpCanvas.height = normCanvas.height = roughCanvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const bCtx = bumpCanvas.getContext('2d')!;
    const nCtx = normCanvas.getContext('2d')!;
    const rCtx = roughCanvas.getContext('2d')!;

    let seed = 482915;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    void palette;

    // Colores militares oficiales Crye Precision MultiCam® equilibrados y realistas
    const colCoyoteTan   = '#7e7057'; // Fondo base: Coyote Tan 499
    const colPaleSage    = '#586445'; // Fondo secundario: Verde Sage / Oliva medio
    const colEarthLoam   = '#4d402f'; // Fondo terciario: Tierra / Marrón oscuro
    const colDarkOlive   = '#3a4628'; // Manchas principales: Verde bosque desaturado
    const colKhakiSand   = '#998a6e'; // Manchas principales: Arena / Khaki militar
    const colBarkBrown   = '#231a12'; // Trazos y ramas: Marrón corteza oscuro
    const colBoneCream   = '#cdc2ae'; // Trazos y ramas: Crema hueso desértico mate

    // 1. CAPA BASE: Fondo continuo en Coyote Tan
    ctx.fillStyle = colCoyoteTan;
    ctx.fillRect(0, 0, size, size);

    // Función toroidal que envuelve suavemente los márgenes del canvas para un tileado 100% continuo
    const drawSeamlessBlob = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      rot: number,
      color: string,
      steps: number,
      wobbleSeed: number,
      amp1 = 0.28,
      amp2 = 0.16
    ) => {
      const renderAt = (ox: number, oy: number) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(rot);
        ctx.fillStyle = color;

        const pts: { x: number; y: number }[] = [];
        for (let s = 0; s < steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const w1 = Math.sin(a * 2.0 + wobbleSeed * 1.5) * amp1;
          const w2 = Math.cos(a * 4.0 - wobbleSeed * 2.1) * amp2;
          const radScale = Math.max(0.40, 0.90 + w1 + w2);
          pts.push({
            x: Math.cos(a) * rx * radScale,
            y: Math.sin(a) * ry * radScale
          });
        }

        ctx.beginPath();
        const pLast = pts[steps - 1];
        ctx.moveTo((pLast.x + pts[0].x) * 0.5, (pLast.y + pts[0].y) * 0.5);
        for (let s = 0; s < steps; s++) {
          const p0 = pts[s];
          const p1 = pts[(s + 1) % steps];
          ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) * 0.5, (p0.y + p1.y) * 0.5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      const maxR = Math.max(rx, ry) * 1.6;
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          if (
            cx + dx + maxR > 0 &&
            cx + dx - maxR < size &&
            cy + dy + maxR > 0 &&
            cy + dy - maxR < size
          ) {
            renderAt(cx + dx, cy + dy);
          }
        }
      }
    };

    // 2. CAPAS DE FONDO MACRO-GRADIENTE (Transiciones atmosféricas suaves entre Coyote, Sage y Earth Loam,
    // rasgo óptico distintivo del patrón oficial Crye Precision MultiCam® bajo las manchas nítidas)
    for (let i = 0; i < 18; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const rad = 180 + rand() * 190;
      const rgb = i % 3 === 0 ? '88, 100, 69' : i % 3 === 1 ? '77, 64, 47' : '142, 128, 100';
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          const ox = cx + dx;
          const oy = cy + dy;
          if (ox + rad > 0 && ox - rad < size && oy + rad > 0 && oy - rad < size) {
            const grad = ctx.createRadialGradient(ox, oy, rad * 0.12, ox, oy, rad);
            grad.addColorStop(0.0, `rgba(${rgb}, 0.62)`);
            grad.addColorStop(0.55, `rgba(${rgb}, 0.28)`);
            grad.addColorStop(1.0, `rgba(${rgb}, 0.0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(ox, oy, rad, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Sub-capa de lóbulos orgánicos de transición media (Sage y Earth Loam)
    for (let i = 0; i < 14; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const rx = 145 + rand() * 135;
      const ry = 72 + rand() * 75;
      const rot = (rand() - 0.5) * 0.40;
      const color = i % 2 === 0 ? colPaleSage : colEarthLoam;
      drawSeamlessBlob(cx, cy, rx, ry, rot, color, 20, i * 7, 0.35, 0.20);
    }

    // 3. MANCHAS PRINCIPALES DEL MULTICAM (Verde Oliva Oscuro y Arena Khaki definida):
    // Manchas nítidas, legibles a distancia, de 80px a 180px
    for (let i = 0; i < 22; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const rx = 75 + rand() * 95;
      const ry = 40 + rand() * 55;
      const rot = (rand() - 0.5) * 0.45;
      const color = i % 2 === 0 ? colDarkOlive : colKhakiSand;
      drawSeamlessBlob(cx, cy, rx, ry, rot, color, 18, i * 13 + 50, 0.30, 0.16);
    }

    // Manchas secundarias de conexión
    for (let i = 0; i < 16; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const rx = 50 + rand() * 65;
      const ry = 25 + rand() * 38;
      const rot = (rand() - 0.5) * 0.50;
      const color = i % 3 === 0 ? colDarkOlive : i % 3 === 1 ? colKhakiSand : colEarthLoam;
      drawSeamlessBlob(cx, cy, rx, ry, rot, color, 16, i * 19 + 120, 0.26, 0.14);
    }

    // 4. ELEMENTOS HORIZONTALES ICÓNICOS (Bark Brown y Bone Cream "twigs / slugs"):
    // Ramas y trazos finos y ahusados con silueta horizontal característica
    for (let i = 0; i < 34; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const isCream = i % 2 === 0;
      const color = isCream ? colBoneCream : colBarkBrown;
      const rx = isCream ? 40 + rand() * 55 : 55 + rand() * 75;
      const ry = isCream ? 6.0 + rand() * 7.5 : 8.5 + rand() * 11.0;
      const rot = (rand() - 0.5) * 0.22; // Orientación marcadamente horizontal
      drawSeamlessBlob(cx, cy, rx, ry, rot, color, 20, i * 23 + 300, 0.38, 0.22);
    }

    // 5. SATÉLITES Y PEQUEÑAS ISLAS NÍTIDAS (gotas orgánicas de acento)
    for (let i = 0; i < 36; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const isCream = i % 2 === 0;
      const color = isCream ? colBoneCream : colBarkBrown;
      const rx = isCream ? 4.5 + rand() * 6.5 : 6.0 + rand() * 9.0;
      const ry = isCream ? 3.0 + rand() * 4.5 : 4.0 + rand() * 6.0;
      const rot = (rand() - 0.5) * 0.35;
      drawSeamlessBlob(cx, cy, rx, ry, rot, color, 12, i * 17 + 800, 0.24, 0.14);
    }

    // 6. DETALLE TEXTIL MICRO-PBR NYCO RIPSTOP 50/50 + MAPA DE NORMALES TANGENCIAL 1K:
    // Cuadrícula de refuerzo Ripstop de 16px + trama de hilos urdimbre/trama de 2px
    const albedoImg = ctx.getImageData(0, 0, size, size);
    const aData = albedoImg.data;
    const bumpImg = bCtx.createImageData(size, size);
    const bData = bumpImg.data;
    const normImg = nCtx.createImageData(size, size);
    const nData = normImg.data;
    const roughImg = rCtx.createImageData(size, size);
    const rData = roughImg.data;

    const ripPitch = 16; // Cuadrícula Ripstop militar cada 16px (~5mm reales)

    for (let y = 0; y < size; y++) {
      const ripY = y % ripPitch;
      const isRipY = ripY === 0 || ripY === 1;
      const vRad = (y / size) * Math.PI * 2.0;

      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const ripX = x % ripPitch;
        const isRipX = ripX === 0 || ripX === 1;
        const uRad = (x / size) * Math.PI * 2.0;

        // Entrelazado de hilos de 2px (Warp & Weft Twill Weave) + micro-tensión de pliegues textiles
        const threadCross = ((x + y) & 1) === 0 ? 1.0 : -0.75;
        const twillWaveX = Math.sin((x + (y & 1) * 1.5) * Math.PI * 0.5);
        const twillWaveY = Math.cos((y + (x & 1) * 1.5) * Math.PI * 0.5);
        const microCrease =
          Math.sin(uRad * 5.0 + Math.cos(vRad * 4.0) * 1.4) *
          Math.cos(vRad * 6.0 - Math.sin(uRad * 3.0) * 1.2);

        // Cuadrícula de refuerzo doble hilo Ripstop
        let ripShade = 1.0;
        let ripBump = 0.0;
        if (isRipX && isRipY) {
          ripShade = 1.08;
          ripBump = 0.48;
        } else if (isRipX || isRipY) {
          ripShade = (ripX === 0 || ripY === 0) ? 1.045 : 0.955;
          ripBump = (ripX === 0 || ripY === 0) ? 0.30 : -0.14;
        }

        const lumaMod = (1.0 + threadCross * 0.032 + microCrease * 0.045) * ripShade;

        const r = aData[idx];
        const g = aData[idx + 1];
        const b = aData[idx + 2];

        // Se modula la luminancia preservando el 100% del tono y contraste cromático
        aData[idx]     = Math.min(255, Math.max(0, Math.round(r * lumaMod)));
        aData[idx + 1] = Math.min(255, Math.max(0, Math.round(g * lumaMod)));
        aData[idx + 2] = Math.min(255, Math.max(0, Math.round(b * lumaMod)));
        aData[idx + 3] = 255;

        // Relieve nítido de los hilos de refuerzo
        const bVal = Math.min(255, Math.max(0, Math.round(128 + threadCross * 18 + ripBump * 64)));
        bData[idx] = bData[idx + 1] = bData[idx + 2] = bVal;
        bData[idx + 3] = 255;

        // Mapa de Normales Tangencial 1024x1024 para NYCO 50/50 Ripstop
        const rnx = (ripX === 0 ? 0.42 : ripX === 1 ? -0.42 : 0.0) + twillWaveX * 0.24;
        const rny = (ripY === 0 ? 0.42 : ripY === 1 ? -0.42 : 0.0) + twillWaveY * 0.24;
        const nLen = Math.hypot(rnx, rny, 1.0);
        nData[idx] = Math.min(255, Math.max(0, Math.round(((rnx / nLen) * 0.5 + 0.5) * 255)));
        nData[idx + 1] = Math.min(255, Math.max(0, Math.round(((rny / nLen) * 0.5 + 0.5) * 255)));
        nData[idx + 2] = Math.min(255, Math.max(128, Math.round(((1.0 / nLen) * 0.5 + 0.5) * 255)));
        nData[idx + 3] = 255;

        // Rugosidad estrictamente mate (~0.89 a 0.96)
        const rVal = Math.min(252, Math.max(226, Math.round(240 - ripBump * 12)));
        rData[idx] = rData[idx + 1] = rData[idx + 2] = rVal;
        rData[idx + 3] = 255;
      }
    }

    ctx.putImageData(albedoImg, 0, 0);
    bCtx.putImageData(bumpImg, 0, 0);
    nCtx.putImageData(normImg, 0, 0);
    rCtx.putImageData(roughImg, 0, 0);

    const diffTex = new THREE.CanvasTexture(canvas);
    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    const normTex = new THREE.CanvasTexture(normCanvas);
    const roughTex = new THREE.CanvasTexture(roughCanvas);

    diffTex.colorSpace = THREE.SRGBColorSpace;
    diffTex.wrapS = diffTex.wrapT = THREE.RepeatWrapping;
    bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    normTex.wrapS = normTex.wrapT = THREE.RepeatWrapping;
    roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;

    diffTex.repeat.set(1, 1);
    bumpTex.repeat.set(1, 1);
    normTex.repeat.set(1, 1);
    roughTex.repeat.set(1, 1);

    diffTex.minFilter = THREE.LinearMipmapLinearFilter;
    diffTex.magFilter = THREE.LinearFilter;
    diffTex.anisotropy = 16;
    bumpTex.anisotropy = 16;
    normTex.anisotropy = 16;
    roughTex.anisotropy = 16;

    return { map: diffTex, bumpMap: bumpTex, normalMap: normTex, roughnessMap: roughTex };
  }

  // Genera un Mapa de Normales (Normal Map RGB) de alta densidad para tejidos tácticos
  static createFabricNormalMap(repeatScale = 16, isCordura = false): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const freq = isCordura ? 2.5 : 4.0;
        const waveX = Math.sin((x / freq) * Math.PI * 2) * Math.cos((y / (freq * 2)) * Math.PI);
        const waveY = Math.cos((y / freq) * Math.PI * 2) * Math.sin((x / (freq * 2)) * Math.PI);

        const ripstopX = !isCordura && x % 16 === 0 ? 0.55 : 0;
        const ripstopY = !isCordura && y % 16 === 0 ? 0.55 : 0;
        const microNoise = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 0.08;

        const nx = (waveX * 0.32 + ripstopX + microNoise) * 0.5 + 0.5;
        const ny = (waveY * 0.32 + ripstopY + microNoise) * 0.5 + 0.5;
        const nz = 0.88;

        data[idx] = Math.min(255, Math.max(0, Math.floor(nx * 255)));
        data[idx + 1] = Math.min(255, Math.max(0, Math.floor(ny * 255)));
        data[idx + 2] = Math.floor(nz * 255);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 16;
    texture.repeat.set(repeatScale, repeatScale);
    return texture;
  }

  // Genera Mapa de Rugosidad, Micro-Desgaste y Mapa de Normales para Metal de Armas
  static createMetalPBRMaps(): {
    roughnessMap: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
  } {
    const size = 512;
    const normCanvas = document.createElement('canvas');
    normCanvas.width = size;
    normCanvas.height = size;
    const nCtx = normCanvas.getContext('2d')!;

    // Base normal plana (128, 128, 255)
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, size, size);

    // Relieve en el mapa de normales para los micro-rayones de mecanizado CNC
    nCtx.lineWidth = 0.8;
    for (let i = 0; i < 740; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 8 + Math.random() * 65;
      const angle = (Math.random() - 0.5) * 0.55;
      nCtx.strokeStyle =
        i % 2 === 0 ? 'rgba(165, 145, 255, 0.22)' : 'rgba(95, 110, 255, 0.22)';
      nCtx.beginPath();
      nCtx.moveTo(x, y);
      nCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      nCtx.stroke();
    }

    const normTex = new THREE.CanvasTexture(normCanvas);
    normTex.wrapS = normTex.wrapT = THREE.RepeatWrapping;
    normTex.anisotropy = 16;
    return { roughnessMap: normTex, normalMap: normTex };
  }

  // Genera texturas PBR para el pedestal de asfalto táctico seco con síntesis directa en memoria (ImageData)
  static createAsphaltTextures(): {
    map: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
  } {
    const size = 512;
    const diffCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');
    const normCanvas = document.createElement('canvas');
    diffCanvas.width = roughCanvas.width = normCanvas.width = size;
    diffCanvas.height = roughCanvas.height = normCanvas.height = size;

    const dCtx = diffCanvas.getContext('2d')!;
    const rCtx = roughCanvas.getContext('2d')!;
    const nCtx = normCanvas.getContext('2d')!;

    const dImg = dCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);
    const nImg = nCtx.createImageData(size, size);
    const dData = dImg.data;
    const rData = rImg.data;
    const nData = nImg.data;

    let seed = 819273;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Síntesis directa de áridos minerales bituminosos del asfalto seco en buffer binario (cero allocaciones de strings)
    for (let i = 0; i < size * size * 4; i += 4) {
      const r = rand();
      const isGrain = r > 0.62;
      const v = isGrain ? 20 + ((r * 34) | 0) : 24;
      dData[i] = v;
      dData[i + 1] = v + 3;
      dData[i + 2] = v + 6;
      dData[i + 3] = 255;

      const rv = isGrain ? 215 + ((r * 36) | 0) : 235;
      rData[i] = rData[i + 1] = rData[i + 2] = rv;
      rData[i + 3] = 255;

      const nx = isGrain ? 96 + (((rand() * 64) | 0)) : 128;
      const ny = isGrain ? 96 + (((rand() * 64) | 0)) : 128;
      nData[i] = nx;
      nData[i + 1] = ny;
      nData[i + 2] = 246;
      nData[i + 3] = 255;
    }

    dCtx.putImageData(dImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);

    // Grietas finas en el pavimento
    dCtx.strokeStyle = 'rgba(8, 9, 12, 0.88)';
    nCtx.strokeStyle = 'rgb(75, 75, 255)';
    for (let c = 0; c < 14; c++) {
      let cx = rand() * size;
      let cy = rand() * size;
      dCtx.lineWidth = 1.2;
      nCtx.lineWidth = 1.8;
      dCtx.beginPath();
      nCtx.beginPath();
      dCtx.moveTo(cx, cy);
      nCtx.moveTo(cx, cy);
      for (let seg = 0; seg < 16; seg++) {
        cx += (rand() - 0.5) * 24;
        cy += (rand() - 0.5) * 24;
        dCtx.lineTo(cx, cy);
        nCtx.lineTo(cx, cy);
      }
      dCtx.stroke();
      nCtx.stroke();
    }

    // Parches sutiles de polvo mineral y tierra seca acumulada en el pavimento
    for (let i = 0; i < 16; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const r = 25 + rand() * 65;

      const dGrad = dCtx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      dGrad.addColorStop(0, 'rgba(48, 43, 36, 0.30)');
      dGrad.addColorStop(1, 'rgba(24, 27, 34, 0)');
      dCtx.fillStyle = dGrad;
      dCtx.beginPath();
      dCtx.arc(cx, cy, r, 0, Math.PI * 2);
      dCtx.fill();
    }

    const diffTex = new THREE.CanvasTexture(diffCanvas);
    const roughTex = new THREE.CanvasTexture(roughCanvas);
    const normTex = new THREE.CanvasTexture(normCanvas);
    diffTex.colorSpace = THREE.SRGBColorSpace;
    diffTex.wrapS =
      diffTex.wrapT =
      roughTex.wrapS =
      roughTex.wrapT =
      normTex.wrapS =
      normTex.wrapT =
        THREE.RepeatWrapping;
    diffTex.repeat.set(2, 2);
    roughTex.repeat.set(2, 2);
    normTex.repeat.set(2, 2);
    diffTex.anisotropy = roughTex.anisotropy = normTex.anisotropy = 16;

    return { map: diffTex, roughnessMap: roughTex, normalMap: normTex };
  }

  /**
   * Genera el paquete de texturas PBR fotorrealistas dedicadas para las botas tácticas
   * (Ante Nubuck engrasado Coyote/Earth, Malla balística 3D de caña, Caucho vulcanizado Contagrip con polvo de asfalto y Paracord trenzado)
   */
  static createTacticalBootPBRTextures(): {
    suedeMap: THREE.CanvasTexture;
    suedeBump: THREE.CanvasTexture;
    suedeRough: THREE.CanvasTexture;
    meshMap: THREE.CanvasTexture;
    meshBump: THREE.CanvasTexture;
    rubberMap: THREE.CanvasTexture;
    rubberBump: THREE.CanvasTexture;
    rubberRough: THREE.CanvasTexture;
    laceMap: THREE.CanvasTexture;
  } {
    const size = 512;

    // 1. ANTE NUBUCK ENGRASADO (OILED COYOTE-UMBER SUEDE LEATHER)
    const sDiff = document.createElement('canvas');
    const sBump = document.createElement('canvas');
    const sRough = document.createElement('canvas');
    sDiff.width = sBump.width = sRough.width = size;
    sDiff.height = sBump.height = sRough.height = size;
    const sdCtx = sDiff.getContext('2d')!;
    const sbCtx = sBump.getContext('2d')!;
    const srCtx = sRough.getContext('2d')!;

    const sImg = sdCtx.createImageData(size, size);
    const sbImg = sbCtx.createImageData(size, size);
    const srImg = srCtx.createImageData(size, size);
    const sd = sImg.data;
    const sb = sbImg.data;
    const sr = srImg.data;

    let seed = 918273;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        // Ondulación macro de cepillado del ante (Suede Nap Brush) + poro microscópico de piel vuelta
        const napWave =
          Math.sin(x * 0.025 + Math.cos(y * 0.032) * 2.2) * 9 +
          Math.cos(y * 0.045 - x * 0.018) * 7;
        const microFiber =
          Math.sin(x * 0.65 + y * 0.18) * 6 +
          (rand() - 0.5) * 18;
        const pore = (rand() < 0.18 ? -14 : 4) * rand();

        // Color base Coyote-Tierra Táctico (#564635) con modulación rica de fibras y sombra de pliegue
        const rBase = 84 + napWave * 0.65 + microFiber * 0.45 + pore;
        const gBase = 68 + napWave * 0.52 + microFiber * 0.36 + pore * 0.85;
        const bBase = 51 + napWave * 0.38 + microFiber * 0.28 + pore * 0.70;

        sd[idx] = Math.min(255, Math.max(0, Math.floor(rBase)));
        sd[idx + 1] = Math.min(255, Math.max(0, Math.floor(gBase)));
        sd[idx + 2] = Math.min(255, Math.max(0, Math.floor(bBase)));
        sd[idx + 3] = 255;

        const bumpVal = Math.min(255, Math.max(0, Math.floor(128 + microFiber * 2.1 + pore * 1.8)));
        sb[idx] = sb[idx + 1] = sb[idx + 2] = bumpVal;
        sb[idx + 3] = 255;

        // Rugosidad alta en la fibra aterciopelada (~0.88) y más baja en zonas rozadas/engrasadas (~0.66)
        const roughVal = Math.min(255, Math.max(0, Math.floor(218 - napWave * 1.8 + microFiber * 1.1)));
        sr[idx] = sr[idx + 1] = sr[idx + 2] = roughVal;
        sr[idx + 3] = 255;
      }
    }
    sdCtx.putImageData(sImg, 0, 0);
    sbCtx.putImageData(sbImg, 0, 0);
    srCtx.putImageData(srImg, 0, 0);

    // Pliegues oscurecidos de flexión en el cuero y manchas de polvo seco de campaña
    for (let i = 0; i < 28; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const r = 18 + rand() * 55;
      const isDust = i % 2 === 0;
      const grad = sdCtx.createRadialGradient(cx, cy, 2, cx, cy, r);
      if (isDust) {
        grad.addColorStop(0, 'rgba(118, 108, 94, 0.22)');
        grad.addColorStop(1, 'rgba(84, 68, 51, 0)');
      } else {
        grad.addColorStop(0, 'rgba(34, 26, 18, 0.28)');
        grad.addColorStop(1, 'rgba(84, 68, 51, 0)');
      }
      sdCtx.fillStyle = grad;
      sdCtx.beginPath();
      sdCtx.arc(cx, cy, r, 0, Math.PI * 2);
      sdCtx.fill();
    }

    // 2. MALLA BALÍSTICA CORDURA / HONEYCOMB DE CAÑA Y LENGÜETA (DARK UMBER RIPSTOP MESH)
    const mDiff = document.createElement('canvas');
    const mBump = document.createElement('canvas');
    mDiff.width = mBump.width = size;
    mDiff.height = mBump.height = size;
    const mdCtx = mDiff.getContext('2d')!;
    const mbCtx = mBump.getContext('2d')!;
    const mImg = mdCtx.createImageData(size, size);
    const mbImg = mbCtx.createImageData(size, size);
    const md = mImg.data;
    const mb = mbImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        // Patrón panal / diamante transpirable de alta resistencia
        const cellX = (x + (Math.floor(y / 6) % 2) * 3) % 6;
        const cellY = y % 6;
        const dx = cellX - 3;
        const dy = cellY - 3;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isPore = dist < 1.65;
        const weave = Math.sin(x * 0.9) * Math.cos(y * 0.9) * 8;
        const noise = (rand() - 0.5) * 8;

        const shade = isPore ? -16 : 8 + weave;
        md[idx] = Math.min(255, Math.max(0, Math.floor(54 + shade + noise)));
        md[idx + 1] = Math.min(255, Math.max(0, Math.floor(46 + shade * 0.9 + noise)));
        md[idx + 2] = Math.min(255, Math.max(0, Math.floor(36 + shade * 0.75 + noise)));
        md[idx + 3] = 255;

        const bVal = isPore ? 68 : Math.min(255, Math.max(0, Math.floor(156 + weave * 3 + noise)));
        mb[idx] = mb[idx + 1] = mb[idx + 2] = bVal;
        mb[idx + 3] = 255;
      }
    }
    mdCtx.putImageData(mImg, 0, 0);
    mbCtx.putImageData(mbImg, 0, 0);

    // 3. CAUCHO VULCANIZADO CONTAGRIP® CON GRANO DE MOLDE Y POLVO MINERAL DE ASFALTO
    const rDiff = document.createElement('canvas');
    const rBump = document.createElement('canvas');
    const rRough = document.createElement('canvas');
    rDiff.width = rBump.width = rRough.width = size;
    rDiff.height = rBump.height = rRough.height = size;
    const rdCtx = rDiff.getContext('2d')!;
    const rbCtx = rBump.getContext('2d')!;
    const rrCtx = rRough.getContext('2d')!;

    const rImg = rdCtx.createImageData(size, size);
    const rbImg = rbCtx.createImageData(size, size);
    const rrImg = rrCtx.createImageData(size, size);
    const rd = rImg.data;
    const rb = rbImg.data;
    const rr = rrImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        // Micro-grano EDM de caucho de carbono vulcanizado + moteado sutil de polvo gris/tierra
        const grain = (rand() - 0.5) * 20;
        const dustPatch =
          Math.max(0, Math.sin(x * 0.035 + y * 0.028) * Math.cos(x * 0.022 - y * 0.041));
        const dustAmt = Math.pow(dustPatch, 2.2) * 26;

        const baseC = 22 + grain * 0.35 + dustAmt;
        rd[idx] = Math.min(255, Math.max(0, Math.floor(baseC + dustAmt * 0.12)));
        rd[idx + 1] = Math.min(255, Math.max(0, Math.floor(baseC + dustAmt * 0.06)));
        rd[idx + 2] = Math.min(255, Math.max(0, Math.floor(baseC)));
        rd[idx + 3] = 255;

        rb[idx] = rb[idx + 1] = rb[idx + 2] = Math.min(255, Math.max(0, Math.floor(128 + grain * 2.2)));
        rb[idx + 3] = 255;

        // Caucho mate táctico (~0.76-0.88), nunca plástico brillante
        rr[idx] = rr[idx + 1] = rr[idx + 2] = Math.min(255, Math.max(0, Math.floor(196 + dustAmt * 1.4 + grain * 0.8)));
        rr[idx + 3] = 255;
      }
    }
    rdCtx.putImageData(rImg, 0, 0);
    rbCtx.putImageData(rbImg, 0, 0);
    rrCtx.putImageData(rrImg, 0, 0);

    // 4. CORDÓN PARACORD 550 TRENZADO BICOLOR (COYOTE / CARBON FLECKED)
    const lCanvas = document.createElement('canvas');
    lCanvas.width = lCanvas.height = 128;
    const lCtx = lCanvas.getContext('2d')!;
    const lImg = lCtx.createImageData(128, 128);
    const ld = lImg.data;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const idx = (y * 128 + x) * 4;
        const braid = Math.sin((x + y) * 0.55) * Math.cos((x - y) * 0.55);
        const fleck = braid > 0.25 ? 18 : -8;
        ld[idx] = Math.min(255, Math.max(0, 48 + fleck));
        ld[idx + 1] = Math.min(255, Math.max(0, 40 + fleck * 0.85));
        ld[idx + 2] = Math.min(255, Math.max(0, 31 + fleck * 0.65));
        ld[idx + 3] = 255;
      }
    }
    lCtx.putImageData(lImg, 0, 0);

    const makeTex = (c: HTMLCanvasElement, isColor: boolean, rep: number) => {
      const t = new THREE.CanvasTexture(c);
      if (isColor) t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rep, rep);
      t.anisotropy = 16;
      return t;
    };

    return {
      suedeMap: makeTex(sDiff, true, 4),
      suedeBump: makeTex(sBump, false, 4),
      suedeRough: makeTex(sRough, false, 4),
      meshMap: makeTex(mDiff, true, 8),
      meshBump: makeTex(mBump, false, 8),
      rubberMap: makeTex(rDiff, true, 4),
      rubberBump: makeTex(rBump, false, 4),
      rubberRough: makeTex(rRough, false, 4),
      laceMap: makeTex(lCanvas, true, 12)
    };
  }

  /**
   * Genera mapas PBR de ultra-alta fidelidad (1024x1024) para el casco balístico táctico Ops-Core FAST SF,
   * funda Cordura 500D MultiCam con corte láser, paneles de Velcro Mohawk, parches IR reflectantes,
   * montura CNC Wilcox L4 G24 y ópticas dicroicas GPNVG-18 con tratamiento antirreflectante esmeralda.
   */
  static createTacticalHelmetPBRTextures(): {
    coverMap: THREE.CanvasTexture;
    coverNormalMap: THREE.CanvasTexture;
    coverRoughnessMap: THREE.CanvasTexture;
    velcroMohawkMap: THREE.CanvasTexture;
    irPatchMap: THREE.CanvasTexture;
    wilcoxMetalMap: THREE.CanvasTexture;
    strobeCircuitMap: THREE.CanvasTexture;
    dichroicLensMap: THREE.CanvasTexture;
  } {
    const size = 1024;
    const coverCanvas = document.createElement('canvas');
    const normCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');
    coverCanvas.width = coverCanvas.height = size;
    normCanvas.width = normCanvas.height = size;
    roughCanvas.width = roughCanvas.height = size;

    const cCtx = coverCanvas.getContext('2d')!;
    const nCtx = normCanvas.getContext('2d')!;
    const rCtx = roughCanvas.getContext('2d')!;

    let seed = 918273;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // 1. CAMUFLAJE CRYE MULTICAM® NÍTIDO SOBRE CORDURA 500D CON CORTE LÁSER (1024x1024)
    const colCoyoteTan = '#7c6e55';
    const colPaleSage  = '#576344';
    const colEarthLoam = '#4b3e2d';
    const colDarkOlive = '#384426';
    const colKhakiSand = '#9a8b6f';
    const colBarkBrown = '#241b13';
    const colBoneCream = '#ccc1ad';

    cCtx.fillStyle = colCoyoteTan;
    cCtx.fillRect(0, 0, size, size);

    const drawSeamlessBlob = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      rot: number,
      color: string,
      steps: number,
      wobbleSeed: number,
      amp1 = 0.28,
      amp2 = 0.16
    ) => {
      const renderAt = (ox: number, oy: number) => {
        cCtx.save();
        cCtx.translate(ox, oy);
        cCtx.rotate(rot);
        cCtx.fillStyle = color;

        const pts: { x: number; y: number }[] = [];
        for (let s = 0; s < steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const w1 = Math.sin(a * 2.0 + wobbleSeed * 1.5) * amp1;
          const w2 = Math.cos(a * 4.0 - wobbleSeed * 2.1) * amp2;
          const radScale = Math.max(0.40, 0.90 + w1 + w2);
          pts.push({
            x: Math.cos(a) * rx * radScale,
            y: Math.sin(a) * ry * radScale
          });
        }

        cCtx.beginPath();
        const pLast = pts[steps - 1];
        cCtx.moveTo((pLast.x + pts[0].x) * 0.5, (pLast.y + pts[0].y) * 0.5);
        for (let s = 0; s < steps; s++) {
          const p0 = pts[s];
          const p1 = pts[(s + 1) % steps];
          cCtx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) * 0.5, (p0.y + p1.y) * 0.5);
        }
        cCtx.closePath();
        cCtx.fill();
        cCtx.restore();
      };

      const maxR = Math.max(rx, ry) * 1.6;
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          if (
            cx + dx + maxR > 0 &&
            cx + dx - maxR < size &&
            cy + dy + maxR > 0 &&
            cy + dy - maxR < size
          ) {
            renderAt(cx + dx, cy + dy);
          }
        }
      }
    };

    for (let i = 0; i < 16; i++) {
      drawSeamlessBlob(
        rand() * size,
        rand() * size,
        150 + rand() * 140,
        75 + rand() * 80,
        (rand() - 0.5) * 0.4,
        i % 2 === 0 ? colPaleSage : colEarthLoam,
        20,
        i * 7,
        0.34,
        0.18
      );
    }
    for (let i = 0; i < 24; i++) {
      drawSeamlessBlob(
        rand() * size,
        rand() * size,
        70 + rand() * 90,
        36 + rand() * 52,
        (rand() - 0.5) * 0.45,
        i % 2 === 0 ? colDarkOlive : colKhakiSand,
        18,
        i * 13 + 50,
        0.30,
        0.16
      );
    }
    for (let i = 0; i < 36; i++) {
      const isCream = i % 2 === 0;
      drawSeamlessBlob(
        rand() * size,
        rand() * size,
        isCream ? 38 + rand() * 52 : 52 + rand() * 70,
        isCream ? 5.5 + rand() * 7.0 : 8.0 + rand() * 10.5,
        (rand() - 0.5) * 0.22,
        isCream ? colBoneCream : colBarkBrown,
        20,
        i * 23 + 300,
        0.36,
        0.20
      );
    }

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);

    const cd = cImg.data;
    const nd = nImg.data;
    const rd = rImg.data;

    for (let y = 0; y < size; y++) {
      const yGrid = Math.floor(y / 3);
      const yPhase = (y % 3) / 3;

      for (let x = 0; x < size; x++) {
        const xGrid = Math.floor(x / 3);
        const xPhase = (x % 3) / 3;
        const idx = (y * size + x) * 4;

        // Trama 2x2 Basketweave microscópica de filamentos Cordura 500D Invista
        const isWarp = (xGrid + yGrid) % 2 === 0;
        const phase = isWarp ? yPhase : xPhase;
        const crossPhase = isWarp ? xPhase : yPhase;
        const threadArch = Math.sin(phase * Math.PI) * (0.75 + 0.25 * Math.sin(crossPhase * Math.PI));
        const threadShade = (threadArch - 0.42) * 28.0;

        // Rejilla de refuerzo ripstop cada 24 píxeles
        const isRipstop = (x % 24 === 0 || y % 24 === 0) ? 10.0 : ((x % 24 === 1 || y % 24 === 1) ? -6.0 : 0.0);
        const sandDust = (rand() - 0.5) * 9.0;

        const r = cd[idx];
        const g = cd[idx + 1];
        const b = cd[idx + 2];

        cd[idx]     = Math.min(255, Math.max(0, Math.floor(r + threadShade + isRipstop + sandDust)));
        cd[idx + 1] = Math.min(255, Math.max(0, Math.floor(g + threadShade * 0.92 + isRipstop * 0.9 + sandDust)));
        cd[idx + 2] = Math.min(255, Math.max(0, Math.floor(b + threadShade * 0.78 + isRipstop * 0.8 + sandDust)));
        cd[idx + 3] = 255;

        // Normal Map Tangente de alta definición
        const normDx = (isWarp ? 0 : Math.cos(phase * Math.PI)) * 0.38 + (rand() - 0.5) * 0.12;
        const normDy = (isWarp ? Math.cos(phase * Math.PI) : 0) * 0.38 + (rand() - 0.5) * 0.12;
        nd[idx]     = Math.min(255, Math.max(0, Math.floor(128 + normDx * 127)));
        nd[idx + 1] = Math.min(255, Math.max(0, Math.floor(128 + normDy * 127)));
        nd[idx + 2] = 244;
        nd[idx + 3] = 255;

        // Rugosidad estrictamente mate (0.87 - 0.96)
        rd[idx] = rd[idx + 1] = rd[idx + 2] = Math.min(255, Math.max(218, Math.floor(236 - threadArch * 14 + sandDust * 0.4)));
        rd[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);

    // 2. TEXTURA DE VELCRO MOHAWK TÁCTICO CON BUCLES ENMARAÑADOS DE ALTA DENSIDAD (512x512)
    const vCanvas = document.createElement('canvas');
    vCanvas.width = vCanvas.height = 512;
    const vCtx = vCanvas.getContext('2d')!;
    const vImg = vCtx.createImageData(512, 512);
    const vd = vImg.data;
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const idx = (y * 512 + x) * 4;
        const swirl =
          Math.sin(x * 0.58 + Math.cos(y * 0.52) * 3.4) *
          Math.cos(y * 0.62 - Math.sin(x * 0.54) * 3.4);
        const fineLoop = Math.sin((x * 1.3 + y * 1.1)) * 9.0;
        const loopShade = swirl * 22.0 + fineLoop + (rand() - 0.5) * 20.0;
        // Coyote Tan 499 / Dark Earth Loop Pile (#574c3c)
        vd[idx]     = Math.min(255, Math.max(0, Math.floor(82 + loopShade)));
        vd[idx + 1] = Math.min(255, Math.max(0, Math.floor(71 + loopShade * 0.88)));
        vd[idx + 2] = Math.min(255, Math.max(0, Math.floor(56 + loopShade * 0.72)));
        vd[idx + 3] = 255;
      }
    }
    vCtx.putImageData(vImg, 0, 0);

    // Costura perimetral en el borde del panel de Velcro
    vCtx.strokeStyle = 'rgba(42, 35, 26, 0.65)';
    vCtx.lineWidth = 6;
    vCtx.strokeRect(6, 6, 500, 500);
    vCtx.strokeStyle = 'rgba(146, 132, 106, 0.65)';
    vCtx.setLineDash([8, 6]);
    vCtx.lineWidth = 2.5;
    vCtx.strokeRect(12, 12, 488, 488);
    vCtx.setLineDash([]);

    // 3. PARCHE TÁCTICO RETRORREFLECTANTE IR SUBDUED LASER-CUT (512x512)
    const pCanvas = document.createElement('canvas');
    pCanvas.width = pCanvas.height = 512;
    const pCtx = pCanvas.getContext('2d')!;
    pCtx.fillStyle = '#1d1b17';
    pCtx.fillRect(0, 0, 512, 512);

    // Rejilla hexagonal micro-prismática IR reflectante 3M SOLAS
    pCtx.strokeStyle = 'rgba(88, 82, 68, 0.50)';
    pCtx.lineWidth = 1.0;
    const hexR = 7;
    for (let hy = 12; hy < 500; hy += hexR * 1.732) {
      for (let hx = 12; hx < 500; hx += hexR * 3) {
        pCtx.beginPath();
        for (let a = 0; a < 6; a++) {
          const ang = (a * Math.PI) / 3;
          const px = hx + hexR * Math.cos(ang);
          const py = hy + hexR * Math.sin(ang);
          if (a === 0) pCtx.moveTo(px, py);
          else pCtx.lineTo(px, py);
        }
        pCtx.closePath();
        pCtx.stroke();
      }
    }

    // Marco Cordura cortado con láser en Coyote Brown
    pCtx.strokeStyle = '#5a4e3d';
    pCtx.lineWidth = 18;
    pCtx.strokeRect(12, 12, 488, 488);

    // Bandera IR Subdued en tercio superior
    pCtx.fillStyle = '#151310';
    pCtx.fillRect(32, 32, 448, 236);
    pCtx.strokeStyle = '#4a4133';
    pCtx.lineWidth = 4;
    pCtx.strokeRect(32, 32, 448, 236);

    for (let s = 0; s < 13; s++) {
      if (s % 2 === 0) {
        pCtx.fillStyle = 'rgba(96, 87, 71, 0.55)';
        pCtx.fillRect(36, 36 + s * 17.5, 440, 9.5);
      }
    }
    pCtx.fillStyle = '#12100d';
    pCtx.fillRect(36, 36, 196, 126);
    // Estrellas tácticas IR en el cantón
    pCtx.fillStyle = 'rgba(112, 102, 84, 0.72)';
    for (let sy = 0; sy < 5; sy++) {
      for (let sx = 0; sx < 6; sx++) {
        pCtx.beginPath();
        pCtx.arc(54 + sx * 31, 52 + sy * 24, 3.2, 0, Math.PI * 2);
        pCtx.fill();
      }
    }

    // Callsign táctico "DEVGRU 01" y grupo sanguíneo en tipografía stencil cortada con láser
    pCtx.fillStyle = '#29241d';
    pCtx.fillRect(32, 286, 448, 194);
    pCtx.strokeStyle = '#4a4133';
    pCtx.lineWidth = 3;
    pCtx.strokeRect(32, 286, 448, 194);

    pCtx.fillStyle = '#cbbba0';
    pCtx.font = 'bold 48px monospace';
    pCtx.fillText('DEVGRU • T1', 52, 362);
    pCtx.font = 'bold 30px monospace';
    pCtx.fillStyle = '#9e8f75';
    pCtx.fillText('O+ POS // NKDA // IR', 52, 428);

    // 4. ALUMINIO MECANIZADO CNC 7075-T6 ANODIZADO FDE WILCOX G24 / L3HARRIS (512x512)
    const wCanvas = document.createElement('canvas');
    wCanvas.width = wCanvas.height = 512;
    const wCtx = wCanvas.getContext('2d')!;
    const wGrad = wCtx.createLinearGradient(0, 0, 512, 512);
    wGrad.addColorStop(0, '#6a5a44');
    wGrad.addColorStop(0.5, '#594b38');
    wGrad.addColorStop(1, '#64543f');
    wCtx.fillStyle = wGrad;
    wCtx.fillRect(0, 0, 512, 512);

    // Micro-estrías de fresado CNC orbital y cepillado metálico
    wCtx.strokeStyle = 'rgba(148, 132, 106, 0.16)';
    wCtx.lineWidth = 1.0;
    for (let r = 8; r < 390; r += 2.5) {
      wCtx.beginPath();
      wCtx.arc(256, 256, r, 0, Math.PI * 2);
      wCtx.stroke();
    }
    for (let y = 0; y < 512; y += 3) {
      wCtx.strokeStyle = y % 6 === 0 ? 'rgba(160, 142, 115, 0.10)' : 'rgba(40, 32, 22, 0.12)';
      wCtx.beginPath();
      wCtx.moveTo(0, y);
      wCtx.lineTo(512, y);
      wCtx.stroke();
    }

    // Grabados láser blancos/crema de especificación militar
    wCtx.fillStyle = 'rgba(226, 214, 192, 0.85)';
    wCtx.font = 'bold 22px monospace';
    wCtx.fillText('WILCOX L4 G24', 165, 148);
    wCtx.font = '14px monospace';
    wCtx.fillText('P/N 28300G24 • CAGE 00421', 148, 174);
    wCtx.fillText('L3HARRIS GPNVG-18 AN/AVS-10', 138, 340);
    // Escala graduada milimétrica de ajuste IPD / Tilt
    wCtx.strokeStyle = 'rgba(226, 214, 192, 0.70)';
    wCtx.lineWidth = 1.5;
    for (let gx = 120; gx <= 392; gx += 12) {
      const h = gx % 48 === 0 ? 14 : 7;
      wCtx.beginPath();
      wCtx.moveTo(gx, 240);
      wCtx.lineTo(gx, 240 + h);
      wCtx.stroke();
    }

    // 5. CIRCUITO INTERNO DE LA HEL-STAR 6 GEN III+ STROBE (512x512)
    const cirCanvas = document.createElement('canvas');
    cirCanvas.width = cirCanvas.height = 512;
    const cirCtx = cirCanvas.getContext('2d')!;
    cirCtx.fillStyle = '#092212'; // Sustrato PCB FR4 verde esmeralda oscuro
    cirCtx.fillRect(0, 0, 512, 512);

    // Rejilla de micro-prismas Fresnel en la cúpula de policarbonato
    cirCtx.strokeStyle = 'rgba(180, 220, 195, 0.14)';
    cirCtx.lineWidth = 1.0;
    for (let i = 0; i < 512; i += 16) {
      cirCtx.beginPath();
      cirCtx.moveTo(i, 0);
      cirCtx.lineTo(i, 512);
      cirCtx.moveTo(0, i);
      cirCtx.lineTo(512, i);
      cirCtx.stroke();
    }

    // Pistas conductoras bañadas en oro ENIG y pads de soldadura
    cirCtx.strokeStyle = '#d4af37';
    cirCtx.lineWidth = 4.0;
    const traces = [
      [[64, 96], [160, 96], [216, 152], [216, 360], [160, 416], [64, 416]],
      [[448, 96], [352, 96], [296, 152], [296, 360], [352, 416], [448, 416]],
      [[96, 256], [416, 256]],
      [[256, 64], [256, 448]]
    ];
    for (const path of traces) {
      cirCtx.beginPath();
      path.forEach(([tx, ty], i) => {
        if (i === 0) cirCtx.moveTo(tx, ty);
        else cirCtx.lineTo(tx, ty);
      });
      cirCtx.stroke();
    }

    // Vías chapadas en oro (micro-vias)
    for (const [vx, vy] of [
      [160, 96], [352, 96], [160, 416], [352, 416],
      [140, 180], [372, 180], [140, 332], [372, 332]
    ]) {
      cirCtx.fillStyle = '#eab308';
      cirCtx.beginPath();
      cirCtx.arc(vx, vy, 8, 0, Math.PI * 2);
      cirCtx.fill();
      cirCtx.fillStyle = '#05140a';
      cirCtx.beginPath();
      cirCtx.arc(vx, vy, 3.5, 0, Math.PI * 2);
      cirCtx.fill();
    }

    // Diodo emisor CREE High-Intensity central (blanco/verde) + 2 emisores IR 880nm laterales
    cirCtx.fillStyle = '#1e293b';
    cirCtx.fillRect(216, 216, 80, 80);
    cirCtx.strokeStyle = '#e2e8f0';
    cirCtx.lineWidth = 3;
    cirCtx.strokeRect(216, 216, 80, 80);
    const ledGrad = cirCtx.createRadialGradient(256, 256, 4, 256, 256, 34);
    ledGrad.addColorStop(0, '#ffffff');
    ledGrad.addColorStop(0.45, '#4ade80');
    ledGrad.addColorStop(1, '#15803d');
    cirCtx.fillStyle = ledGrad;
    cirCtx.beginPath();
    cirCtx.arc(256, 256, 30, 0, Math.PI * 2);
    cirCtx.fill();

    // Emisores secundarios IR 880nm (matriz cerámica rojiza oscura con hilo de oro)
    for (const irX of [124, 388]) {
      cirCtx.fillStyle = '#27121b';
      cirCtx.fillRect(irX - 24, 232, 48, 48);
      cirCtx.strokeStyle = '#d4af37';
      cirCtx.lineWidth = 2;
      cirCtx.strokeRect(irX - 24, 232, 48, 48);
      cirCtx.fillStyle = '#9f1239';
      cirCtx.beginPath();
      cirCtx.arc(irX, 256, 14, 0, Math.PI * 2);
      cirCtx.fill();
    }

    // 6. ÓPTICA DICROICA MULTICAPA GPNVG-18 CON MICRO-CANALES MCP Y BAFFLES (512x512)
    const lensCanvas = document.createElement('canvas');
    lensCanvas.width = lensCanvas.height = 512;
    const lensCtx = lensCanvas.getContext('2d')!;
    lensCtx.fillStyle = '#020d0a';
    lensCtx.fillRect(0, 0, 512, 512);

    const lensGrad = lensCtx.createRadialGradient(220, 210, 12, 256, 256, 244);
    lensGrad.addColorStop(0.0, '#042f24');    // Núcleo profundo del fotocátodo Gen3
    lensGrad.addColorStop(0.38, '#064e3b');   // Cavidad óptica esmeralda oscura
    lensGrad.addColorStop(0.68, '#047857');   // Recubrimiento dicroico interferencial
    lensGrad.addColorStop(0.84, '#10b981');   // Anillo de interferencia cian-esmeralda
    lensGrad.addColorStop(0.93, '#0e7490');   // Destello periférico azul-turquesa
    lensGrad.addColorStop(1.0, '#022c22');    // Asiento del bisel
    lensCtx.fillStyle = lensGrad;
    lensCtx.beginPath();
    lensCtx.arc(256, 256, 244, 0, Math.PI * 2);
    lensCtx.fill();

    // Micro-retícula hexagonal de la placa de microcanales (MCP) en el fondo de la lente
    lensCtx.strokeStyle = 'rgba(52, 211, 153, 0.14)';
    lensCtx.lineWidth = 0.8;
    const mcpR = 8;
    for (let my = 64; my < 448; my += mcpR * 1.732) {
      for (let mx = 64; mx < 448; mx += mcpR * 3) {
        if (Math.hypot(mx - 256, my - 256) > 195) continue;
        lensCtx.beginPath();
        for (let a = 0; a < 6; a++) {
          const ang = (a * Math.PI) / 3;
          const px = mx + mcpR * Math.cos(ang);
          const py = my + mcpR * Math.sin(ang);
          if (a === 0) lensCtx.moveTo(px, py);
          else lensCtx.lineTo(px, py);
        }
        lensCtx.closePath();
        lensCtx.stroke();
      }
    }

    // Baffles antirreflectantes concéntricos y láminas del diafragma iris
    for (let r = 36; r < 228; r += 18) {
      lensCtx.strokeStyle = r % 36 === 0 ? 'rgba(16, 185, 129, 0.42)' : 'rgba(6, 182, 212, 0.25)';
      lensCtx.lineWidth = r > 180 ? 2.2 : 1.2;
      lensCtx.beginPath();
      lensCtx.arc(256, 256, r, 0, Math.PI * 2);
      lensCtx.stroke();
    }

    // Reflejo especular curvo tipo menisco (Caustic Crescent)
    const specGrad = lensCtx.createRadialGradient(186, 172, 6, 196, 184, 110);
    specGrad.addColorStop(0, 'rgba(167, 243, 208, 0.52)');
    specGrad.addColorStop(0.45, 'rgba(52, 211, 153, 0.18)');
    specGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');
    lensCtx.fillStyle = specGrad;
    lensCtx.beginPath();
    lensCtx.arc(196, 184, 110, 0, Math.PI * 2);
    lensCtx.fill();

    const makeTex = (c: HTMLCanvasElement, isColor: boolean, repX: number, repY = repX) => {
      const t = new THREE.CanvasTexture(c);
      if (isColor) t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repX, repY);
      t.anisotropy = 16;
      return t;
    };

    return {
      coverMap: makeTex(coverCanvas, true, 2.2, 1.4),
      coverNormalMap: makeTex(normCanvas, false, 2.2, 1.4),
      coverRoughnessMap: makeTex(roughCanvas, false, 2.2, 1.4),
      velcroMohawkMap: makeTex(vCanvas, true, 2),
      irPatchMap: makeTex(pCanvas, true, 1),
      wilcoxMetalMap: makeTex(wCanvas, true, 1),
      strobeCircuitMap: makeTex(cirCanvas, true, 1),
      dichroicLensMap: makeTex(lensCanvas, true, 1)
    };
  }

  /**
   * Genera la suite de texturas PBR hiperrealistas para Piel Humana (Epidermis + Dermis Vascular,
   * Mapa de Normales de Líneas de Langer y Poros Foliculares, Mapa de Rugosidad Sebácea)
   * y Ojos Anatómicos (Estroma radial del Iris con Anillo Limbal y Esclerótica con micro-capilares).
   */
  static createHyperrealisticSkinAndEyeTextures(): {
    skinMap: THREE.CanvasTexture;
    skinNormalMap: THREE.CanvasTexture;
    skinRoughnessMap: THREE.CanvasTexture;
    irisMap: THREE.CanvasTexture;
    scleraMap: THREE.CanvasTexture;
  } {
    const size = 512;
    const sDiff = document.createElement('canvas');
    const sNorm = document.createElement('canvas');
    const sRough = document.createElement('canvas');
    sDiff.width = sNorm.width = sRough.width = size;
    sDiff.height = sNorm.height = sRough.height = size;

    const sdCtx = sDiff.getContext('2d')!;
    const snCtx = sNorm.getContext('2d')!;
    const srCtx = sRough.getContext('2d')!;

    const sdImg = sdCtx.createImageData(size, size);
    const snImg = snCtx.createImageData(size, size);
    const srImg = srCtx.createImageData(size, size);
    const sd = sdImg.data;
    const sn = snImg.data;
    const sr = srImg.data;

    let seed = 648291;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // 1. Micro-retícula romboidal de surcos epidérmicos (Sulci Cutis & Cristae Cutis / Líneas de Langer)
        const sulci1 = Math.sin((x * 0.42 + y * 0.34) + Math.sin(y * 0.08) * 1.4);
        const sulci2 = Math.sin((x * 0.36 - y * 0.44) + Math.cos(x * 0.08) * 1.4);
        const cristae = sulci1 * sulci2;

        // 2. Poros foliculares sebáceos distribuidos cuasi-estocásticamente
        const cellX = (x + (Math.floor(y / 7) % 2) * 3.5) % 7;
        const cellY = y % 7;
        const poreDist = Math.hypot(cellX - 3.5, cellY - 3.5);
        const isPore = poreDist < 1.35;
        const poreDepth = isPore ? Math.cos((poreDist / 1.35) * Math.PI * 0.5) : 0.0;

        // 3. Variación cromática subdérmica (Hemoglobina rojiza + Melanina cálida + Pátina táctica de sudor/polvo)
        const vascularWave =
          Math.sin(x * 0.022 + y * 0.018) * 6.5 +
          Math.cos(x * 0.036 - y * 0.029) * 5.0;
        const melaninMottle =
          Math.sin(x * 0.085 + y * 0.072) * Math.cos(x * 0.064 - y * 0.091) * 7.5 +
          (rand() - 0.5) * 8.0;

        const poreShadow = 1.0 - poreDepth * 0.18;
        const rCol = (196 + vascularWave * 1.15 + melaninMottle * 0.65 + cristae * 3.5) * poreShadow;
        const gCol = (138 + vascularWave * 0.55 + melaninMottle * 0.72 + cristae * 3.0) * poreShadow;
        const bCol = (106 + vascularWave * 0.40 + melaninMottle * 0.68 + cristae * 2.6) * poreShadow;

        sd[idx]     = Math.min(255, Math.max(0, Math.round(rCol)));
        sd[idx + 1] = Math.min(255, Math.max(0, Math.round(gCol)));
        sd[idx + 2] = Math.min(255, Math.max(0, Math.round(bCol)));
        sd[idx + 3] = 255;

        // 4. Mapa de Normales Tangencial Epidérmico (Poros + Surcos Cutáneos)
        const pGradX = isPore ? ((cellX - 3.5) / 1.35) * 0.52 : 0.0;
        const pGradY = isPore ? ((cellY - 3.5) / 1.35) * 0.52 : 0.0;
        const sGradX = Math.cos(x * 0.42 + y * 0.34) * 0.22 + Math.cos(x * 0.36 - y * 0.44) * 0.18;
        const sGradY = Math.cos(x * 0.42 + y * 0.34) * 0.18 - Math.cos(x * 0.36 - y * 0.44) * 0.22;
        const nx = pGradX + sGradX + (rand() - 0.5) * 0.08;
        const ny = pGradY + sGradY + (rand() - 0.5) * 0.08;
        const nLen = Math.hypot(nx, ny, 1.0);
        sn[idx]     = Math.min(255, Math.max(0, Math.round(((nx / nLen) * 0.5 + 0.5) * 255)));
        sn[idx + 1] = Math.min(255, Math.max(0, Math.round(((ny / nLen) * 0.5 + 0.5) * 255)));
        sn[idx + 2] = Math.min(255, Math.max(128, Math.round(((1.0 / nLen) * 0.5 + 0.5) * 255)));
        sn[idx + 3] = 255;

        // 5. Rugosidad Epidérmica Dual (Crestas con película lipídica ~0.42, poros y surcos ~0.68)
        const rough = Math.min(230, Math.max(98, Math.round(136 - cristae * 18 + poreDepth * 48 + (rand() - 0.5) * 10)));
        sr[idx] = sr[idx + 1] = sr[idx + 2] = rough;
        sr[idx + 3] = 255;
      }
    }

    sdCtx.putImageData(sdImg, 0, 0);
    snCtx.putImageData(snImg, 0, 0);
    srCtx.putImageData(srImg, 0, 0);

    // 6. IRIS ANATÓMICO DE ALTA DEFINICIÓN (Estroma Radial, Collarette, Criptas de Fuchs y Anillo Limbal)
    const irisCanvas = document.createElement('canvas');
    irisCanvas.width = irisCanvas.height = 256;
    const iCtx = irisCanvas.getContext('2d')!;
    const cx = 128;
    const cy = 128;

    const baseGrad = iCtx.createRadialGradient(cx, cy, 18, cx, cy, 124);
    baseGrad.addColorStop(0.0, '#050608');   // Pupila
    baseGrad.addColorStop(0.24, '#090b0e');  // Borde pupilar
    baseGrad.addColorStop(0.28, '#5c4328');  // Collarette ámbar-avellana peripupilar
    baseGrad.addColorStop(0.56, '#3b4f3d');  // Estroma verde-oliva táctico
    baseGrad.addColorStop(0.84, '#27382b');  // Estroma periférico profundo
    baseGrad.addColorStop(0.95, '#111814');  // Anillo limbal oscuro
    baseGrad.addColorStop(1.0, '#0d1310');
    iCtx.fillStyle = baseGrad;
    iCtx.fillRect(0, 0, 256, 256);

    // Fibras de colágeno radiales del estroma del iris
    for (let f = 0; f < 320; f++) {
      const ang = (f / 320) * Math.PI * 2 + (rand() - 0.5) * 0.02;
      const rIn = 30 + rand() * 14;
      const rOut = 92 + rand() * 26;
      iCtx.strokeStyle = f % 3 === 0
        ? 'rgba(138, 118, 76, 0.28)'
        : f % 2 === 0
          ? 'rgba(78, 106, 78, 0.26)'
          : 'rgba(22, 32, 24, 0.32)';
      iCtx.lineWidth = 0.8 + rand() * 1.1;
      iCtx.beginPath();
      iCtx.moveTo(cx + Math.cos(ang) * rIn, cy + Math.sin(ang) * rIn);
      iCtx.lineTo(
        cx + Math.cos(ang + (rand() - 0.5) * 0.06) * rOut,
        cy + Math.sin(ang + (rand() - 0.5) * 0.06) * rOut
      );
      iCtx.stroke();
    }

    // Pupila central nítida
    iCtx.fillStyle = '#030406';
    iCtx.beginPath();
    iCtx.arc(cx, cy, 30, 0, Math.PI * 2);
    iCtx.fill();

    // 7. ESCLERÓTICA HÚMEDA CON MICRO-CAPILARES EPISCLERALES
    const scleraCanvas = document.createElement('canvas');
    scleraCanvas.width = scleraCanvas.height = 256;
    const scCtx = scleraCanvas.getContext('2d')!;
    const scGrad = scCtx.createRadialGradient(128, 128, 30, 128, 128, 128);
    scGrad.addColorStop(0.0, '#edeae4');
    scGrad.addColorStop(0.72, '#e5dfd7');
    scGrad.addColorStop(1.0, '#d6c7be');
    scCtx.fillStyle = scGrad;
    scCtx.fillRect(0, 0, 256, 256);

    scCtx.strokeStyle = 'rgba(185, 68, 62, 0.22)';
    scCtx.lineWidth = 0.7;
    for (let v = 0; v < 28; v++) {
      let vx = rand() * 256;
      let vy = rand() * 256;
      scCtx.beginPath();
      scCtx.moveTo(vx, vy);
      for (let s = 0; s < 6; s++) {
        vx += (rand() - 0.5) * 18;
        vy += (rand() - 0.5) * 18;
        scCtx.lineTo(vx, vy);
      }
      scCtx.stroke();
    }

    const makeTex = (c: HTMLCanvasElement, isColor: boolean, rep: number) => {
      const t = new THREE.CanvasTexture(c);
      if (isColor) t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rep, rep);
      t.anisotropy = 16;
      return t;
    };

    return {
      skinMap: makeTex(sDiff, true, 4),
      skinNormalMap: makeTex(sNorm, false, 6),
      skinRoughnessMap: makeTex(sRough, false, 4),
      irisMap: makeTex(irisCanvas, true, 1),
      scleraMap: makeTex(scleraCanvas, true, 1)
    };
  }
}

