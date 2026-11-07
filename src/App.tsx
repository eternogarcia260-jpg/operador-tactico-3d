/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { mountTacticalScene } from './three/engine/TacticalSceneEngine';
import { Eye, Shield, Flashlight, Sun, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface TacticalEngineBridge {
  setCameraPreset: (preset: 'helmet' | 'nvg' | 'headset' | 'rear' | 'full') => void;
  toggleNVG: () => boolean;
  toggleStrobe: () => boolean;
  toggleHeadLight: () => boolean;
  toggleIRMode: () => boolean;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loaderOpacity, setLoaderOpacity] = useState<'1' | '0'>('1');
  const [loaderHidden, setLoaderHidden] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [nvgDeployed, setNvgDeployed] = useState(true);
  const [headLightActive, setHeadLightActive] = useState(true);
  const [strobeActive, setStrobeActive] = useState(true);
  const [irModeActive, setIrModeActive] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let fadeTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = mountTacticalScene(container, () => {
      fadeTimer = setTimeout(() => {
        setLoaderOpacity('0');
        hideTimer = setTimeout(() => {
          setLoaderHidden(true);
        }, 280);
      }, 60);
    });

    return () => {
      if (fadeTimer) clearTimeout(fadeTimer);
      if (hideTimer) clearTimeout(hideTimer);
      cleanup();
    };
  }, []);

  const getEngine = (): TacticalEngineBridge | null => {
    return (window as unknown as { __tacticalEngine?: TacticalEngineBridge }).__tacticalEngine ?? null;
  };

  const handleToggleNVG = () => {
    const next = getEngine()?.toggleNVG() ?? !nvgDeployed;
    setNvgDeployed(next);
  };

  const handleToggleHeadLight = () => {
    const next = getEngine()?.toggleHeadLight() ?? !headLightActive;
    setHeadLightActive(next);
  };

  const handleToggleStrobe = () => {
    const next = getEngine()?.toggleStrobe() ?? !strobeActive;
    setStrobeActive(next);
  };

  const handleToggleIRMode = () => {
    const next = getEngine()?.toggleIRMode() ?? !irModeActive;
    setIrModeActive(next);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-slate-200 select-none">
      {/* Contenedor del Canvas 3D (Solo Modelo, Sin Suelo ni Fondo) */}
      <div
        id="canvas-container"
        ref={containerRef}
        className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
      />

      {/* Badge Minimalista Superior: Pipeline PBR & Shaders GLSL */}
      <div className="absolute top-4 left-4 z-40 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2 bg-[#0a0d12]/85 border border-amber-500/30 px-3 py-1.5 rounded-sm shadow-lg backdrop-blur-sm">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-xs font-semibold tracking-wider text-amber-300 uppercase">
            Operador Tier-1 • Shaders PBR Avanzados
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/40">
            Hyperrealistic GLSL
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 pl-1">
          <span>Anisotropic NYCO & Cordura 1000D</span>
          <span>•</span>
          <span>Pre-Integrated SSS Skin</span>
          <span>•</span>
          <span>Curvature Edge-Wear Kydex</span>
        </div>
      </div>

      {/* Dock de Control Táctico Inferior (Sin Selectores de Vista, Solo Controles Activos) */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-auto max-w-[95vw] transition-transform duration-300 ease-out ${
          dockCollapsed ? 'translate-y-[calc(100%-32px)]' : 'translate-y-0'
        }`}
      >
        {/* Pestaña para Colapsar / Expandir Dock */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="flex items-center gap-1.5 px-4 py-1 bg-[#0c1017]/90 hover:bg-[#151c28] border-t border-x border-slate-700/60 rounded-t-md text-[11px] font-mono text-slate-300 hover:text-amber-400 transition-colors shadow-md cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Controles Ópticos y Luz</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Ocultar Controles</span>
              </>
            )}
          </button>
        </div>

        {/* Panel Principal de Activación de Sistemas del Casco */}
        <div className="bg-[#0b0e14]/92 border border-slate-700/60 rounded-b-md rounded-t-sm px-3 py-2 shadow-2xl backdrop-blur-md grid grid-cols-2 gap-2">
          <button
            onClick={handleToggleNVG}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all cursor-pointer ${
              nvgDeployed
                ? 'bg-emerald-950/85 text-emerald-300 border-emerald-500/60 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800/75 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Eye className={`w-3.5 h-3.5 ${nvgDeployed ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Visor IR GPNVG-18: {nvgDeployed ? 'Activo' : 'Replegado'}</span>
          </button>

          <button
            onClick={handleToggleHeadLight}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all cursor-pointer ${
              headLightActive
                ? 'bg-amber-950/85 text-amber-200 border-amber-400/60 shadow-sm shadow-amber-500/20'
                : 'bg-slate-800/75 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
          >
            <Flashlight className={`w-3.5 h-3.5 ${headLightActive ? 'text-amber-300' : 'text-slate-500'}`} />
            <span>Luz SureFire M340V: {headLightActive ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleToggleStrobe}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all cursor-pointer ${
              strobeActive
                ? 'bg-green-950/85 text-green-300 border-green-500/60 shadow-sm shadow-green-500/20'
                : 'bg-slate-800/75 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
          >
            <Sun className={`w-3.5 h-3.5 ${strobeActive ? 'text-green-400' : 'text-slate-500'}`} />
            <span>Baliza Hel-Star 6: {strobeActive ? 'Pulsando' : 'OFF'}</span>
          </button>

          <button
            onClick={handleToggleIRMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all cursor-pointer ${
              irModeActive
                ? 'bg-teal-950/90 text-teal-200 border-teal-400/70 shadow-sm shadow-teal-500/25'
                : 'bg-slate-800/75 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${irModeActive ? 'text-teal-300' : 'text-slate-400'}`} />
            <span>Efectos IR: {irModeActive ? 'Fósforo Activo' : 'Normal'}</span>
          </button>
        </div>
      </div>

      {/* Pantalla de Carga mientras se compilan texturas PBR, IBL y Shaders de Post-Procesado */}
      {!loaderHidden && (
        <div
          id="loading-screen"
          style={{ opacity: loaderOpacity }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#05070a] transition-opacity duration-700"
        >
          <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-6"></div>
          <h2 className="text-lg font-bold tracking-widest uppercase text-amber-400 font-mono-tech">
            Compilando Sistema Balístico FAST SF + GPNVG-18
          </h2>
          <p id="loading-status" className="text-xs text-slate-400 mt-2 font-mono-tech">
            Generando micro-texturas PBR 1K, ópticas dicroicas y geometría de alta densidad...
          </p>
        </div>
      )}
    </div>
  );
}
