import { supabase } from '../lib/supabase';
import type { Servidor } from '../types';

export interface PaginatedServidores {
  data: Servidor[];
  count: number;
}

export interface FetchPageParams {
  search?: string;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

const DB_COLUMN_MAP: Record<string, string> = {
  rf: 'REG_COMPLETO',
  nome: 'NOME',
  cargo: 'CARGO',
  referencia: 'REF',
  relacaoJurAdm: 'TIPO',
  relacao_jur_adm: 'TIPO',
  jornada: 'JORNADA',
  nomeSetor: 'SETOR',
  nome_setor: 'SETOR',
};

const SORTABLE_COLUMNS = new Set(['REG_COMPLETO', 'NOME', 'CARGO', 'REF', 'TIPO', 'JORNADA', 'SETOR']);

function toDbColumn(field: string): string {
  return DB_COLUMN_MAP[field] || field;
}

export async function fetchServidoresPage(params: FetchPageParams): Promise<PaginatedServidores> {
  const { search, sortField = 'nome', sortDir = 'asc', page, pageSize } = params;
  let query = supabase.from('servidores_sms').select('*', { count: 'exact' });

  if (search) {
    query = query.or(`"REG_COMPLETO".ilike.%${search}%,NOME.ilike.%${search}%`);
  }

  const dbSortField = toDbColumn(sortField);
  if (SORTABLE_COLUMNS.has(dbSortField)) {
    query = query.order(dbSortField, { ascending: sortDir === 'asc' });
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error) throw error;
  return { data: (data || []).map(mapServidor), count: count || 0 };
}

export async function fetchAllServidores(): Promise<Servidor[]> {
  const all: Servidor[] = [];
  const chunkSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('servidores_sms')
      .select('*')
      .order('NOME')
      .range(from, from + chunkSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data.map(mapServidor));
    if (data.length < chunkSize) break;
    from += chunkSize;
  }
  return all;
}

export async function searchServidorByRF(rf: string): Promise<Servidor | null> {
  const { data, error } = await supabase
    .rpc('find_servidor_by_rf_normalized', { p_rf: rf })
    .maybeSingle();
  if (error) throw error;
  return data ? mapServidor(data as unknown as Record<string, unknown>) : null;
}

export async function saveServidor(servidor: Servidor): Promise<Servidor> {
  const payload = {
    'REG_COMPLETO': servidor.rf,
    'NOME': servidor.nome,
    'CARGO': servidor.cargo,
    'REF': servidor.referencia,
    'TIPO': servidor.relacaoJurAdm || '',
    'JORNADA': servidor.jornada || '',
    'SETOR': servidor.nomeSetor || '',
  };
  if (servidor.id) {
    const { data, error } = await supabase
      .from('servidores_sms')
      .update(payload)
      .eq('id', servidor.id)
      .select()
      .single();
    if (error) throw error;
    return mapServidor(data as unknown as Record<string, unknown>);
  }
  const { data, error } = await supabase
    .from('servidores_sms')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapServidor(data as unknown as Record<string, unknown>);
}

export async function deleteServidor(id: string): Promise<void> {
  const { error } = await supabase.from('servidores_sms').delete().eq('id', id);
  if (error) throw error;
}

export interface ImportErrorDetail {
  batchIndex: number;
  recordIndex: number;
  record: Record<string, unknown>;
  table: string;
  column?: string;
  value?: unknown;
  message: string;
  details?: string;
  hint?: string;
  code?: string;
  operation: string;
  stack?: string;
}

export class BulkImportError extends Error {
  detail: ImportErrorDetail;
  constructor(detail: ImportErrorDetail) {
    super(detail.message);
    this.name = 'BulkImportError';
    this.detail = detail;
  }
}

export async function bulkImportServidores(
  records: Omit<Servidor, 'id'>[],
  onProgress?: (current: number, total: number) => void,
): Promise<number> {
  let total = 0;
  const chunkSize = 500;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize).map(r => ({
      'REG_COMPLETO': r.rf,
      'NOME': r.nome,
      'CARGO': r.cargo || '',
      'REF': r.referencia || '',
      'TIPO': r.relacaoJurAdm || '',
      'JORNADA': r.jornada || '',
      'SETOR': r.nomeSetor || '',
    }));
    const { error } = await supabase.from('servidores_sms').insert(chunk);
    if (error) {
      const failedRecord = chunk[0];
      const columnMatch = error.message.match(/column "([^"]+)"/i);
      const columnName = columnMatch ? columnMatch[1] : undefined;
      const recordMap: Record<string, string> = { ...failedRecord };
      const detail: ImportErrorDetail = {
        batchIndex: Math.floor(i / chunkSize),
        recordIndex: i,
        record: failedRecord as Record<string, unknown>,
        table: 'servidores_sms',
        column: columnName,
        value: columnName ? recordMap[columnName] : undefined,
        message: error.message,
        details: error.details || undefined,
        hint: error.hint || undefined,
        code: error.code || undefined,
        operation: 'INSERT INTO servidores_sms',
        stack: new Error().stack,
      };
      throw new BulkImportError(detail);
    }
    total += chunk.length;
    if (onProgress) onProgress(Math.min(i + chunkSize, records.length), records.length);
  }
  return total;
}

function mapServidor(row: Record<string, unknown>): Servidor {
  return {
    id: row.id as string,
    rf: (row['REG_COMPLETO'] as string) || (row.rf as string) || '',
    nome: (row['NOME'] as string) || (row.nome as string) || '',
    cargo: (row['CARGO'] as string) || (row.cargo as string) || '',
    referencia: (row['REF'] as string) || (row.referencia as string) || '',
    relacaoJurAdm: (row['TIPO'] as string) || (row.relacao_jur_adm as string) || '',
    jornada: (row['JORNADA'] as string) || (row.jornada as string) || '',
    nomeSetor: (row['SETOR'] as string) || (row.nome_setor as string) || '',
  };
}
