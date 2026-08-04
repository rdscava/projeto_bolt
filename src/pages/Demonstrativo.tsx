import { useState, useCallback } from 'react';
import { Search, FileText, CircleAlert as AlertCircle, Loader as Loader2 } from 'lucide-react';
import {
  findServidorByRfNormalized,
  type Servidor,
} from '../services/servidorService';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { cn } from '../App';

export default function Demonstrativo() {
  const [rfInput, setRfInput] = useState('');
  const [servidor, setServidor] = useState<Servidor | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Calculation fields
  const [tipoAposentadoria, setTipoAposentadoria] = useState<'80%' | '100%'>('100%');
  const [media, setMedia] = useState('');
  const [valorFinal, setValorFinal] = useState('');

  const handleSearch = useCallback(async () => {
    const trimmed = rfInput.trim();
    if (!trimmed) return;
    setLoading(true);
    setNotFound(false);
    setServidor(null);
    try {
      // Use server-side normalized search — ignores dots, spaces, case, and vinculo (V#)
      const result = await findServidorByRfNormalized(trimmed);

      if (result) {
        setServidor(result);
        setNotFound(false);
        toast.success(`Servidor localizado: ${result.nome}`);
      } else {
        setNotFound(true);
        toast.error('Servidor não encontrado para o Registro Funcional informado.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao consultar servidor';
      toast.error(msg);
      console.error('[Demonstrativo] Erro na consulta:', err);
    } finally {
      setLoading(false);
    }
  }, [rfInput]);

  const handleSaveSimulacao = async () => {
    if (!servidor) return;
    try {
      const { error } = await supabase.from('simulacoes').insert({
        servidor_nome: servidor.nome,
        servidor_cargo: servidor.cargo,
        rf: servidor.rf,
        tipo: tipoAposentadoria,
        media: parseFloat(media) || 0,
        valor_final: parseFloat(valorFinal) || 0,
        dados_json: JSON.stringify({
          servidor,
          tipoAposentadoria,
          media,
          valorFinal,
        }),
        nome: servidor.nome,
      });
      if (error) throw error;
      toast.success('Simulação salva com sucesso!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar simulação';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Demonstrativo de Aposentadoria</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Informe o Registro Funcional para preencher automaticamente os dados do servidor.
        </p>
      </div>

      {/* RF Search */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Registro Funcional
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={rfInput}
              onChange={(e) => setRfInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ex: 134.080.8 V7 ou 1340808"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !rfInput.trim()}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Consultar
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          A busca ignora pontos, espaços, letras maiúsculas/minúsculas e o vínculo (V1, V2, etc.).
        </p>
      </div>

      {/* Not found */}
      {notFound && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Servidor não encontrado</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Nenhum registro foi localizado para o Registro Funcional informado. Verifique se o valor
              foi digitado corretamente.
            </p>
          </div>
        </div>
      )}

      {/* Server data */}
      {servidor && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <FileText className="w-5 h-5" />
              <h3 className="font-semibold">Dados do Servidor</h3>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Registro Funcional" value={servidor.rf} />
            <Field label="Nome" value={servidor.nome} />
            <Field label="Cargo" value={servidor.cargo} />
            <Field label="Referência" value={servidor.referencia} />
            <Field label="Tipo / Relação Jur-Adm" value={servidor.relacao_jur_adm} />
            <Field label="Jornada" value={servidor.jornada} />
            <Field label="Setor" value={servidor.nome_setor} fullWidth />
          </div>
        </div>
      )}

      {/* Calculation section */}
      {servidor && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-300">Cálculo de Aposentadoria</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Tipo
              </label>
              <select
                value={tipoAposentadoria}
                onChange={(e) => setTipoAposentadoria(e.target.value as '80%' | '100%')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="80%">80%</option>
                <option value="100%">100%</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Média
              </label>
              <input
                type="number"
                value={media}
                onChange={(e) => setMedia(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Valor Final
              </label>
              <input
                type="number"
                value={valorFinal}
                onChange={(e) => setValorFinal(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <button
            onClick={handleSaveSimulacao}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Salvar Simulação
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={cn(fullWidth && 'md:col-span-2')}>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm">
        {value || '—'}
      </div>
    </div>
  );
}
