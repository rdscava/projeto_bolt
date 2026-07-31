import { supabase } from '../lib/supabase';
import type { Simulation } from '../types';
import { createEmptySimulation } from '../types';

export interface SimulacaoListItem {
  id: string;
  numero: number;
  nome: string;
  dataHora: string;
  dataUltimaAlteracao: string;
  servidorNome: string;
  servidorCargo: string;
  rf: string;
  tipo: string;
  media: number;
  valorFinal: number;
}

function rowToListItem(r: Record<string, unknown>): SimulacaoListItem {
  return {
    id: r.id as string,
    numero: (r.numero as number) || 0,
    nome: (r.nome as string) || '',
    dataHora: (r.data_hora as string) || '',
    dataUltimaAlteracao: (r.data_ultima_alteracao as string) || (r.data_hora as string) || '',
    servidorNome: (r.servidor_nome as string) || '',
    servidorCargo: (r.servidor_cargo as string) || '',
    rf: (r.rf as string) || '',
    tipo: (r.tipo as string) || '',
    media: Number(r.media) || 0,
    valorFinal: Number(r.valor_final) || 0,
  };
}

export async function fetchSimulacoes(): Promise<SimulacaoListItem[]> {
  const { data, error } = await supabase
    .from('simulacoes')
    .select('id, numero, nome, data_hora, data_ultima_alteracao, servidor_nome, servidor_cargo, rf, tipo, media, valor_final')
    .order('data_ultima_alteracao', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []).map(rowToListItem);
}

function parseSimulationData(dadosJson: string | null, row: Record<string, unknown>): Simulation {
  const base = createEmptySimulation();
  if (!dadosJson) return base;
  try {
    const parsed = JSON.parse(dadosJson) as Partial<Simulation>;
    return {
      ...base,
      ...parsed,
      id: (row.id as string) || '',
      nome: (row.nome as string) || parsed.nome || 'Sem nome',
      dataCriacao: (row.data_hora as string) || parsed.dataCriacao || new Date().toISOString(),
      dataUltimaAlteracao: (row.data_ultima_alteracao as string) || parsed.dataUltimaAlteracao || new Date().toISOString(),
    };
  } catch {
    return base;
  }
}

export async function fetchSimulation(id: string): Promise<Simulation | null> {
  const { data, error } = await supabase
    .from('simulacoes')
    .select('id, nome, data_hora, data_ultima_alteracao, dados_json')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return parseSimulationData(data.dados_json as string, data as unknown as Record<string, unknown>);
}

function simulationToDb(sim: Simulation, media: number, valorFinal: number) {
  return {
    nome: sim.nome,
    data_hora: sim.dataCriacao,
    data_ultima_alteracao: new Date().toISOString(),
    servidor_nome: sim.servidor?.nome || '',
    servidor_cargo: sim.servidor?.cargo || '',
    rf: sim.servidor?.rf || '',
    tipo: sim.tipoCalculo === '80' ? '80%' : '100%',
    media,
    valor_final: valorFinal,
    dados_json: JSON.stringify(sim),
  };
}

export async function createSimulation(sim: Simulation, media: number, valorFinal: number): Promise<string> {
  const now = new Date().toISOString();
  const toInsert = {
    ...simulationToDb({ ...sim, dataCriacao: now, dataUltimaAlteracao: now }, media, valorFinal),
    data_hora: now,
  };
  const { data, error } = await supabase
    .from('simulacoes')
    .insert(toInsert)
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateSimulation(id: string, sim: Simulation, media: number, valorFinal: number): Promise<void> {
  const { error } = await supabase
    .from('simulacoes')
    .update(simulationToDb(sim, media, valorFinal))
    .eq('id', id);
  if (error) throw error;
}

export async function renameSimulation(id: string, nome: string): Promise<void> {
  const { error } = await supabase
    .from('simulacoes')
    .update({ nome, data_ultima_alteracao: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function duplicateSimulation(id: string, novoNome: string): Promise<string | null> {
  const original = await fetchSimulation(id);
  if (!original) return null;
  const copy: Simulation = {
    ...original,
    id: '',
    nome: novoNome,
    dataCriacao: new Date().toISOString(),
    dataUltimaAlteracao: new Date().toISOString(),
  };
  const { media, valorFinal } = await getSimulationSummary(id);
  return createSimulation(copy, media, valorFinal);
}

async function getSimulationSummary(id: string): Promise<{ media: number; valorFinal: number }> {
  const { data, error } = await supabase
    .from('simulacoes')
    .select('media, valor_final')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return { media: 0, valorFinal: 0 };
  return { media: Number(data.media) || 0, valorFinal: Number(data.valor_final) || 0 };
}

export async function deleteSimulacao(id: string): Promise<void> {
  const { error } = await supabase.from('simulacoes').delete().eq('id', id);
  if (error) throw error;
}
