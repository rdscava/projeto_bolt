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
  cpf: string;
  matricula: string;
  tipo: string;
  status: string;
  media: number;
  valorFinal: number;
}

export interface FetchSimulacoesParams {
  search?: string;
  searchField?: 'all' | 'rf' | 'nome' | 'cpf' | 'matricula' | 'data' | 'status';
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface PaginatedSimulacoes {
  data: SimulacaoListItem[];
  count: number;
}

const SORTABLE_COLUMNS = new Set(['numero', 'nome', 'data_hora', 'data_ultima_alteracao', 'rf', 'servidor_nome', 'tipo', 'media', 'valor_final', 'status']);

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
    cpf: (r.cpf as string) || '',
    matricula: (r.matricula as string) || '',
    tipo: (r.tipo as string) || '',
    status: (r.status as string) || '',
    media: Number(r.media) || 0,
    valorFinal: Number(r.valor_final) || 0,
  };
}

export async function fetchSimulacoes(params: FetchSimulacoesParams): Promise<PaginatedSimulacoes> {
  const { search, searchField = 'all', sortField = 'data_ultima_alteracao', sortDir = 'desc', page, pageSize } = params;
  let query = supabase.from('simulacoes_sms').select('*', { count: 'exact' });

  if (search) {
    const s = search.trim();
    if (searchField === 'rf') {
      query = query.ilike('rf', `%${s}%`);
    } else if (searchField === 'nome') {
      query = query.ilike('servidor_nome', `%${s}%`);
    } else if (searchField === 'cpf') {
      query = query.ilike('cpf', `%${s}%`);
    } else if (searchField === 'matricula') {
      query = query.ilike('matricula', `%${s}%`);
    } else if (searchField === 'status') {
      query = query.ilike('status', `%${s}%`);
    } else if (searchField === 'data') {
      query = query.ilike('data_hora', `%${s}%`);
    } else {
      query = query.or(`rf.ilike.%${s}%,servidor_nome.ilike.%${s}%,cpf.ilike.%${s}%,matricula.ilike.%${s}%,nome.ilike.%${s}%`);
    }
  }

  if (SORTABLE_COLUMNS.has(sortField)) {
    query = query.order(sortField, { ascending: sortDir === 'asc' });
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error) throw error;
  return { data: (data || []).map((r) => rowToListItem(r as unknown as Record<string, unknown>)), count: count || 0 };
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
    .from('simulacoes_sms')
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
    .from('simulacoes_sms')
    .insert(toInsert)
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateSimulation(id: string, sim: Simulation, media: number, valorFinal: number): Promise<void> {
  const { error } = await supabase
    .from('simulacoes_sms')
    .update(simulationToDb(sim, media, valorFinal))
    .eq('id', id);
  if (error) throw error;
}

export async function renameSimulation(id: string, nome: string): Promise<void> {
  const { error } = await supabase
    .from('simulacoes_sms')
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
    .from('simulacoes_sms')
    .select('media, valor_final')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return { media: 0, valorFinal: 0 };
  return { media: Number(data.media) || 0, valorFinal: Number(data.valor_final) || 0 };
}

export async function deleteSimulacao(id: string): Promise<void> {
  const { error } = await supabase.from('simulacoes_sms').delete().eq('id', id);
  if (error) throw error;
}
