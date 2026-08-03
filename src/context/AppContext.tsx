import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import type {
  Servidor, SigpecRow, AdmrhRow, AverbacaoRow, IndiceRow,
  VinculoConfig, TipoCalculo, DemonstrativoRubrica, Simulation,
} from '../types';
import { createEmptySimulation } from '../types';

interface AppState {
  activeSimulation: Simulation | null;
  loadSimulation: (sim: Simulation) => void;
  newSimulation: () => void;
  updateSection: <K extends keyof Simulation>(key: K, value: Simulation[K]) => void;
  updateSimulation: (sim: Simulation) => void;
  hasUnsavedData: boolean;
  simulacaoSalva: boolean;
  setSimulacaoSalva: (s: boolean) => void;
  clearAll: () => void;
  // Backward-compatible accessors (read/write through activeSimulation)
  servidor: Servidor | null;
  setServidor: (s: Servidor | null) => void;
  tipoCalculo: TipoCalculo;
  setTipoCalculo: (t: TipoCalculo) => void;
  indices: IndiceRow[];
  setIndices: (i: IndiceRow[]) => void;
  sigpecData: SigpecRow[];
  setSigpecData: (d: SigpecRow[]) => void;
  sigpecFilter: string[];
  setSigpecFilter: (f: string[]) => void;
  admrhData: AdmrhRow[];
  setAdmrhData: (d: AdmrhRow[]) => void;
  admrhFilter: string[];
  setAdmrhFilter: (f: string[]) => void;
  averbacaoData: AverbacaoRow[];
  setAverbacaoData: (d: AverbacaoRow[]) => void;
  vinculoConfig: VinculoConfig;
  setVinculoConfig: (v: VinculoConfig) => void;
  sexo: 'HOMEM' | 'MULHER';
  setSexo: (s: 'HOMEM' | 'MULHER') => void;
  tempoExcedente: number;
  setTempoExcedente: (t: number) => void;
  rubricas80: DemonstrativoRubrica[];
  setRubricas80: (r: DemonstrativoRubrica[]) => void;
  porcentagemBase: number;
  setPorcentagemBase: (p: number) => void;
  tipoAposentadoria: string;
  setTipoAposentadoria: (t: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const emptySim = createEmptySimulation();

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeSimulation, setActiveSimulation] = useState<Simulation | null>(null);
  const [simulacaoSalva, setSimulacaoSalva] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasUnsavedData = !simulacaoSalva && activeSimulation !== null && (
    activeSimulation.sigpecBase.data.length > 0 ||
    activeSimulation.admrh.data.length > 0 ||
    activeSimulation.averbacao.data.length > 0
  );

  const loadSimulation = useCallback((sim: Simulation) => {
    setActiveSimulation(sim);
    setSimulacaoSalva(true);
  }, []);

  const newSimulation = useCallback(() => {
    setActiveSimulation(createEmptySimulation());
    setSimulacaoSalva(false);
  }, []);

  const updateSimulation = useCallback((sim: Simulation) => {
    setActiveSimulation(sim);
  }, []);

  const updateSection = useCallback(<K extends keyof Simulation>(key: K, value: Simulation[K]) => {
    setActiveSimulation(prev => {
      const base = prev ?? createEmptySimulation();
      return { ...base, [key]: value, dataUltimaAlteracao: new Date().toISOString() };
    });
    setSimulacaoSalva(false);
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
  }, []);

  const clearAll = useCallback(() => {
    setActiveSimulation(prev => {
      const base = createEmptySimulation();
      if (prev) base.indices = prev.indices;
      return base;
    });
    setSimulacaoSalva(false);
  }, []);

  // --- Backward-compatible accessors ---
  // Each getter reads from activeSimulation (or empty default if null).
  // Each setter calls updateSection so the change flows through the single source of truth.

  const sim = activeSimulation ?? emptySim;

  const servidor = sim.servidor;
  const setServidor = useCallback((s: Servidor | null) => updateSection('servidor', s), [updateSection]);

  const tipoCalculo = sim.tipoCalculo;
  const setTipoCalculo = useCallback((t: TipoCalculo) => updateSection('tipoCalculo', t), [updateSection]);

  const indices = sim.indices;
  const setIndices = useCallback((i: IndiceRow[]) => updateSection('indices', i), [updateSection]);

  const sigpecData = sim.sigpecBase.data;
  const setSigpecData = useCallback((d: SigpecRow[]) =>
    updateSection('sigpecBase', { ...sim.sigpecBase, data: d }), [updateSection, sim.sigpecBase]);

  const sigpecFilter = sim.sigpecBase.filter;
  const setSigpecFilter = useCallback((f: string[]) =>
    updateSection('sigpecBase', { ...sim.sigpecBase, filter: f }), [updateSection, sim.sigpecBase]);

  const admrhData = sim.admrh.data;
  const setAdmrhData = useCallback((d: AdmrhRow[]) =>
    updateSection('admrh', { ...sim.admrh, data: d }), [updateSection, sim.admrh]);

  const admrhFilter = sim.admrh.filter;
  const setAdmrhFilter = useCallback((f: string[]) =>
    updateSection('admrh', { ...sim.admrh, filter: f }), [updateSection, sim.admrh]);

  const averbacaoData = sim.averbacao.data;
  const setAverbacaoData = useCallback((d: AverbacaoRow[]) =>
    updateSection('averbacao', { ...sim.averbacao, data: d }), [updateSection, sim.averbacao]);

  const vinculoConfig = sim.vinculoConfig;
  const setVinculoConfig = useCallback((v: VinculoConfig) => updateSection('vinculoConfig', v), [updateSection]);

  const sexo = sim.demonstrativo.sexo;
  const setSexo = useCallback((s: 'HOMEM' | 'MULHER') =>
    updateSection('demonstrativo', { ...sim.demonstrativo, sexo: s }), [updateSection, sim.demonstrativo]);

  const tempoExcedente = sim.demonstrativo.tempoExcedente;
  const setTempoExcedente = useCallback((t: number) =>
    updateSection('demonstrativo', { ...sim.demonstrativo, tempoExcedente: t }), [updateSection, sim.demonstrativo]);

  const rubricas80 = sim.demonstrativo.rubricas80;
  const setRubricas80 = useCallback((r: DemonstrativoRubrica[]) =>
    updateSection('demonstrativo', { ...sim.demonstrativo, rubricas80: r }), [updateSection, sim.demonstrativo]);

  const porcentagemBase = sim.demonstrativo.porcentagemBase;
  const setPorcentagemBase = useCallback((p: number) =>
    updateSection('demonstrativo', { ...sim.demonstrativo, porcentagemBase: p }), [updateSection, sim.demonstrativo]);

  const tipoAposentadoria = sim.demonstrativo.tipoAposentadoria;
  const setTipoAposentadoria = useCallback((t: string) =>
    updateSection('demonstrativo', { ...sim.demonstrativo, tipoAposentadoria: t }), [updateSection, sim.demonstrativo]);

  return (
    <AppContext.Provider value={{
      activeSimulation, loadSimulation, newSimulation, updateSection, updateSimulation,
      hasUnsavedData, simulacaoSalva, setSimulacaoSalva, clearAll,
      servidor, setServidor, tipoCalculo, setTipoCalculo,
      indices, setIndices, sigpecData, setSigpecData, sigpecFilter, setSigpecFilter,
      admrhData, setAdmrhData, admrhFilter, setAdmrhFilter,
      averbacaoData, setAverbacaoData, vinculoConfig, setVinculoConfig,
      sexo, setSexo, tempoExcedente, setTempoExcedente, rubricas80, setRubricas80,
      porcentagemBase, setPorcentagemBase, tipoAposentadoria, setTipoAposentadoria,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be inside AppProvider');
  return ctx;
}
