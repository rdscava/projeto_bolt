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

export async function fetchServidoresPage(params: FetchPageParams): Promise<PaginatedServidores> {
  const { search, sortField = 'nome', sortDir = 'asc', page, pageSize } = params;
  let query = supabase.from('servidores').select('*', { count: 'exact' });

  if (search) {
    query = query.or(`rf.ilike.%${search}%,nome.ilike.%${search}%`);
  }

  query = query.order(sortField, { ascending: sortDir === 'asc' });

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
      .from('servidores')
      .select('*')
      .order('nome')
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
  return data ? mapServidor(data) : null;
}

export async function saveServidor(servidor: Servidor): Promise<Servidor> {
  const payload = {
    rf: servidor.rf,
    nome: servidor.nome,
    cargo: servidor.cargo,
    referencia: servidor.referencia,
    relacao_jur_adm: servidor.relacaoJurAdm || '',
    jornada: servidor.jornada || '',
    nome_setor: servidor.nomeSetor || '',
  };
  if (servidor.id) {
    const { data, error } = await supabase
      .from('servidores')
      .update(payload)
      .eq('id', servidor.id)
      .select()
      .single();
    if (error) throw error;
    return mapServidor(data);
  }
  const { data, error } = await supabase
    .from('servidores')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapServidor(data);
}

export async function deleteServidor(id: string): Promise<void> {
  const { error } = await supabase.from('servidores').delete().eq('id', id);
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
      rf: r.rf,
      nome: r.nome,
      cargo: r.cargo || '',
      referencia: r.referencia || '',
      relacao_jur_adm: r.relacaoJurAdm || '',
      jornada: r.jornada || '',
      nome_setor: r.nomeSetor || '',
    }));
    const { error } = await supabase.from('servidores').insert(chunk);
    if (error) {
      const failedRecord = chunk[0];
      const columnMatch = error.message.match(/column "([^"]+)"/i);
      const columnName = columnMatch ? columnMatch[1] : undefined;
      const recordMap: Record<string, string> = { ...failedRecord };
      const detail: ImportErrorDetail = {
        batchIndex: Math.floor(i / chunkSize),
        recordIndex: i,
        record: failedRecord,
        table: 'servidores',
        column: columnName,
        value: columnName ? recordMap[columnName] : undefined,
        message: error.message,
        details: error.details || undefined,
        hint: error.hint || undefined,
        code: error.code || undefined,
        operation: 'INSERT INTO servidores (rf, nome, cargo, referencia, relacao_jur_adm, jornada, nome_setor) VALUES (...)',
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
    rf: (row.rf as string) || '',
    nome: (row.nome as string) || '',
    cargo: (row.cargo as string) || '',
    referencia: (row.referencia as string) || '',
    relacaoJurAdm: (row.relacao_jur_adm as string) || '',
    jornada: (row.jornada as string) || '',
    nomeSetor: (row.nome_setor as string) || '',
  };
}
