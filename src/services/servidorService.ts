import { supabase } from '../lib/supabase';
import type { Servidor } from '../types';

export async function fetchServidores(search?: string): Promise<Servidor[]> {
  let query = supabase.from('servidores').select('*').order('nome');
  if (search) {
    query = query.ilike('rf', `%${search}%`);
  }
  const { data, error } = await query.limit(2000);
  if (error) throw error;
  return (data || []).map(mapServidor);
}

export async function saveServidor(servidor: Servidor): Promise<Servidor> {
  const payload = {
    rf: servidor.rf,
    nome: servidor.nome,
    cargo: servidor.cargo,
    referencia: servidor.referencia,
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

export async function bulkImportServidores(records: Omit<Servidor, 'id'>[]): Promise<number> {
  let total = 0;
  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100);
    const { error } = await supabase.from('servidores').insert(chunk);
    if (error) throw error;
    total += chunk.length;
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
  };
}
