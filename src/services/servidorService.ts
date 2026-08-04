import { createClient } from '@supabase/supabase-js';
import type { Servidor, ImportErrorDetail } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchServidoresPage(
  page: number,
  pageSize: number,
  search: string,
  sortBy: string,
  sortDir: 'asc' | 'desc',
): Promise<{ data: Servidor[]; total: number }> {
  let query = supabase.from('servidores').select('*', { count: 'exact' });

  if (search) {
    query = query.or(
      `rf.ilike.%${search}%,nome.ilike.%${search}%,cargo.ilike.%${search}%,referencia.ilike.%${search}%,relacao_jur_adm.ilike.%${search}%,jornada.ilike.%${search}%,nome_setor.ilike.%${search}%`,
    );
  }

  if (sortBy) {
    query = query.order(sortBy, { ascending: sortDir === 'asc' });
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as Servidor[], total: count || 0 };
}

export async function fetchAllServidores(): Promise<Servidor[]> {
  const { data, error } = await supabase
    .from('servidores')
    .select('*')
    .order('nome', { ascending: true });
  if (error) throw error;
  return data as Servidor[];
}

export async function findServidorByRfNormalized(rf: string): Promise<Servidor | null> {
  const { data, error } = await supabase.rpc('find_servidor_by_rf_normalized', { p_rf: rf });
  if (error) throw error;
  return (data as Servidor) || null;
}

export async function saveServidor(
  servidor: Omit<Servidor, 'id' | 'created_at'> & { id?: string },
): Promise<Servidor> {
  if (servidor.id) {
    const { data, error } = await supabase
      .from('servidores')
      .update({
        rf: servidor.rf,
        nome: servidor.nome,
        cargo: servidor.cargo,
        referencia: servidor.referencia,
        relacao_jur_adm: servidor.relacao_jur_adm,
        jornada: servidor.jornada,
        nome_setor: servidor.nome_setor,
      })
      .eq('id', servidor.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as Servidor;
  }
  const { data, error } = await supabase
    .from('servidores')
    .insert({
      rf: servidor.rf,
      nome: servidor.nome,
      cargo: servidor.cargo,
      referencia: servidor.referencia,
      relacao_jur_adm: servidor.relacao_jur_adm,
      jornada: servidor.jornada,
      nome_setor: servidor.nome_setor,
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Servidor;
}

export async function deleteServidor(id: string): Promise<void> {
  const { error } = await supabase.from('servidores').delete().eq('id', id);
  if (error) throw error;
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
  records: Omit<Servidor, 'id' | 'created_at'>[],
  onProgress?: (current: number, total: number) => void,
): Promise<number> {
  let total = 0;
  const chunkSize = 500;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize).map((r) => ({
      rf: r.rf,
      nome: r.nome,
      cargo: r.cargo || '',
      referencia: r.referencia || '',
      relacao_jur_adm: r.relacao_jur_adm || '',
      jornada: r.jornada || '',
      nome_setor: r.nome_setor || '',
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
        operation:
          'INSERT INTO servidores (rf, nome, cargo, referencia, relacao_jur_adm, jornada, nome_setor) VALUES (...)',
        stack: new Error().stack,
      };
      throw new BulkImportError(detail);
    }
    total += chunk.length;
    if (onProgress) onProgress(Math.min(i + chunkSize, records.length), records.length);
  }
  return total;
}

export type { Servidor, ImportErrorDetail };
