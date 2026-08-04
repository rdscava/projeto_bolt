import { useState, useEffect, useCallback } from 'react';
import { History, Trash2, Loader as Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { Simulacao } from '../services/types';

const PAGE_SIZE = 10;

export default function Simulacoes() {
  const [data, setData] = useState<Simulacao[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from('simulacoes')
        .select('*', { count: 'exact' })
        .order('data_hora', { ascending: false })
        .range(from, to);
      if (error) throw error;
      setData(data as Simulacao[]);
      setTotal(count || 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar simulações';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta simulação?')) return;
    try {
      const { error } = await supabase.from('simulacoes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Simulação excluída');
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir';
      toast.error(msg);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Simulações</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{total} simulações registradas</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nº</th>
                <th className="px-4 py-3 text-left font-medium">Data/Hora</th>
                <th className="px-4 py-3 text-left font-medium">Servidor</th>
                <th className="px-4 py-3 text-left font-medium">RF</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Média</th>
                <th className="px-4 py-3 text-left font-medium">Valor Final</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhuma simulação registrada
                  </td>
                </tr>
              ) : (
                data.map((sim) => (
                  <tr key={sim.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-500">{sim.numero}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(sim.data_hora).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{sim.servidor_nome || sim.nome}</td>
                    <td className="px-4 py-3 text-slate-500">{sim.rf}</td>
                    <td className="px-4 py-3 text-slate-500">{sim.tipo}</td>
                    <td className="px-4 py-3 text-slate-500">{sim.media}</td>
                    <td className="px-4 py-3 text-slate-500">{sim.valor_final}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(sim.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-sm text-slate-500">Página {page + 1} de {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded disabled:opacity-50">Anterior</button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded disabled:opacity-50">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
