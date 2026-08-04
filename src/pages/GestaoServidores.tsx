import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, Upload, Download, X, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Loader as Loader2, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchServidoresPage,
  saveServidor,
  deleteServidor,
  bulkImportServidores,
  BulkImportError,
  type Servidor,
  type ImportErrorDetail,
} from '../services/servidorService';
import { parseCSVFile, generateCSV, downloadCSV } from '../lib/csvParser';
import { cn } from '../App';

const PAGE_SIZE = 15;

export default function GestaoServidores() {
  const [data, setData] = useState<Servidor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Servidor | null>(null);
  const [formData, setFormData] = useState({
    rf: '',
    nome: '',
    cargo: '',
    referencia: '',
    relacao_jur_adm: '',
    jornada: '',
    nome_setor: '',
  });
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<{ headers: string[]; records: Omit<Servidor, 'id' | 'created_at'>[]; errors: { line: number; reason: string }[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{ total: number; imported: number; rejected: number; errors: { line: number; reason: string }[] } | null>(null);
  const [importError, setImportError] = useState<ImportErrorDetail | null>(null);
  const [parseProgress, setParseProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const { data, total } = await fetchServidoresPage(page, PAGE_SIZE, search, sortBy, sortDir);
      setData(data);
      setTotal(total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar servidores';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortDir]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const handleEdit = (servidor: Servidor | null) => {
    setEditing(servidor);
    setFormData(
      servidor
        ? {
            rf: servidor.rf,
            nome: servidor.nome,
            cargo: servidor.cargo,
            referencia: servidor.referencia,
            relacao_jur_adm: servidor.relacao_jur_adm,
            jornada: servidor.jornada,
            nome_setor: servidor.nome_setor,
          }
        : { rf: '', nome: '', cargo: '', referencia: '', relacao_jur_adm: '', jornada: '', nome_setor: '' },
    );
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!formData.rf.trim() || !formData.nome.trim()) {
      toast.error('Registro Funcional e Nome são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      await saveServidor({ ...formData, id: editing?.id });
      toast.success(editing ? 'Servidor atualizado!' : 'Servidor cadastrado!');
      setEditOpen(false);
      loadPage();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Excluir o servidor ${nome}?`)) return;
    try {
      await deleteServidor(id);
      toast.success('Servidor excluído');
      loadPage();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir';
      toast.error(msg);
    }
  };

  const handleFileSelect = async (file: File) => {
    setParseProgress(true);
    setImportError(null);
    try {
      const parsed = await parseCSVFile(file);
      const colMap: Record<string, number> = {};
      parsed.headers.forEach((h, i) => {
        const hl = h.toLowerCase().trim();
        if (hl === 'reg. completo' || hl === 'reg.completo' || hl === 'rf') colMap.rf = i;
        else if (hl === 'nome') colMap.nome = i;
        else if (hl === 'cargo') colMap.cargo = i;
        else if (hl === 'ref' || hl === 'referencia' || hl === 'referência') colMap.referencia = i;
        else if (hl === 'tipo' || hl === 'relacao jur-adm' || hl === 'relação jur-adm') colMap.relacao_jur_adm = i;
        else if (hl === 'jornada') colMap.jornada = i;
        else if (hl === 'setor' || hl === 'nome do setor') colMap.nome_setor = i;
      });

      const records: Omit<Servidor, 'id' | 'created_at'>[] = [];
      const errors: { line: number; reason: string }[] = [];

      parsed.rows.forEach((row, idx) => {
        const rf = (row[colMap.rf] ?? '').trim();
        const nome = (row[colMap.nome] ?? '').trim();
        if (!rf || !nome) {
          errors.push({ line: idx + 2, reason: 'RF ou Nome vazio' });
          return;
        }
        records.push({
          rf,
          nome,
          cargo: (row[colMap.cargo] ?? '').trim(),
          referencia: (row[colMap.referencia] ?? '').trim(),
          relacao_jur_adm: (row[colMap.relacao_jur_adm] ?? '').trim(),
          jornada: (row[colMap.jornada] ?? '').trim(),
          nome_setor: (row[colMap.nome_setor] ?? '').trim(),
        });
      });

      setPreview({ headers: parsed.headers, records, errors });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar CSV';
      toast.error(msg);
    } finally {
      setParseProgress(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setImportProgress(0);
    setImportError(null);
    try {
      const imported = await bulkImportServidores(preview.records, (current, t) => {
        setImportProgress(Math.round((current / t) * 100));
      });
      setImportSummary({
        total: preview.records.length + preview.errors.length,
        imported,
        rejected: preview.errors.length,
        errors: preview.errors,
      });
      toast.success(`${imported} servidores importados!`);
      loadPage();
    } catch (err) {
      if (err instanceof BulkImportError) {
        setImportError(err.detail);
        console.error('[Import Error] Detalhes completos:', err.detail);
      } else {
        const e = err as Error;
        setImportError({
          batchIndex: -1,
          recordIndex: -1,
          record: {},
          table: 'servidores',
          message: e.message,
          operation: 'INSERT INTO servidores',
          stack: e.stack,
        });
      }
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = ['REG. COMPLETO', 'NOME', 'CARGO', 'REF', 'TIPO', 'JORNADA', 'SETOR'];
    const rows = data.map((s) => [s.rf, s.nome, s.cargo, s.referencia, s.relacao_jur_adm, s.jornada, s.nome_setor]);
    downloadCSV('servidores_export.csv', generateCSV(headers, rows));
  };

  const closeImport = () => {
    setImportOpen(false);
    setPreview(null);
    setImportSummary(null);
    setImportError(null);
    setImportProgress(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const columns: { key: string; label: string }[] = [
    { key: 'rf', label: 'Registro Funcional' },
    { key: 'nome', label: 'Nome' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'referencia', label: 'Ref' },
    { key: 'relacao_jur_adm', label: 'Tipo' },
    { key: 'jornada', label: 'Jornada' },
    { key: 'nome_setor', label: 'Setor' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gestão de Servidores</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{total} registros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setImportOpen(true)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={() => handleEdit(null)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por RF, nome, cargo..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left font-medium cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400">
                    Nenhum servidor encontrado
                  </td>
                </tr>
              ) : (
                data.map((servidor) => (
                  <tr key={servidor.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {servidor[col.key as keyof Servidor]}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => handleEdit(servidor)} className="p-1.5 text-slate-400 hover:text-primary-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(servidor.id, servidor.nome)} className="p-1.5 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-sm text-slate-500">
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold">{editing ? 'Editar Servidor' : 'Novo Servidor'}</h3>
              <button onClick={() => setEditOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Registro Funcional" value={formData.rf} onChange={(v) => setFormData({ ...formData, rf: v })} />
              <InputField label="Nome" value={formData.nome} onChange={(v) => setFormData({ ...formData, nome: v })} />
              <InputField label="Cargo" value={formData.cargo} onChange={(v) => setFormData({ ...formData, cargo: v })} />
              <InputField label="Referência" value={formData.referencia} onChange={(v) => setFormData({ ...formData, referencia: v })} />
              <InputField label="Tipo / Relação Jur-Adm" value={formData.relacao_jur_adm} onChange={(v) => setFormData({ ...formData, relacao_jur_adm: v })} />
              <InputField label="Jornada" value={formData.jornada} onChange={(v) => setFormData({ ...formData, jornada: v })} />
              <InputField label="Setor" value={formData.nome_setor} onChange={(v) => setFormData({ ...formData, nome_setor: v })} fullWidth />
            </div>
            <div className="flex justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import dialog */}
      {importOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeImport}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold">Importar CSV</h3>
              <button onClick={closeImport}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {!preview && !importSummary && !importError && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500"
                  >
                    {parseProgress ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                        <p className="text-sm text-slate-500">Processando arquivo...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-slate-400" />
                        <p className="text-sm font-medium">Clique para selecionar um arquivo CSV</p>
                        <p className="text-xs text-slate-400">Encoding e delimitador detectados automaticamente</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </div>
                </div>
              )}

              {preview && !importSummary && (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm">
                    <p><strong>Colunas detectadas:</strong> {preview.headers.join(', ')}</p>
                    <p className="mt-1"><strong>Registros válidos:</strong> {preview.records.length}</p>
                    {preview.errors.length > 0 && (
                      <p className="mt-1 text-amber-600"><strong>Registros rejeitados:</strong> {preview.errors.length}</p>
                    )}
                  </div>
                  {importing && (
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }} />
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setPreview(null)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg">Voltar</button>
                    <button onClick={handleImport} disabled={importing} className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50">
                      {importing ? `Importando ${importProgress}%` : 'Importar'}
                    </button>
                  </div>
                </div>
              )}

              {importSummary && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                    <CheckCircle className="w-5 h-5" /> Importação concluída
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm space-y-1">
                    <p>Total no arquivo: {importSummary.total}</p>
                    <p>Importados: {importSummary.imported}</p>
                    <p>Rejeitados: {importSummary.rejected}</p>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={closeImport} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Fechar</button>
                  </div>
                </div>
              )}

              {importError && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                    <AlertCircle className="w-5 h-5" /> Erro durante a importação
                  </div>
                  <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4 space-y-2 text-sm overflow-x-auto">
                    <div><span className="font-semibold">Tabela:</span> {importError.table}</div>
                    {importError.column && <div><span className="font-semibold">Coluna:</span> {importError.column}</div>}
                    {importError.value !== undefined && <div><span className="font-semibold">Valor:</span> <code className="bg-red-100 dark:bg-red-900/30 px-1 rounded">{String(importError.value)}</code></div>}
                    {importError.recordIndex >= 0 && <div><span className="font-semibold">Registro (índice):</span> {importError.recordIndex}</div>}
                    <div><span className="font-semibold">Mensagem:</span> {importError.message}</div>
                    {importError.details && <div><span className="font-semibold">Detalhes:</span> {importError.details}</div>}
                    {importError.hint && <div><span className="font-semibold">Dica:</span> {importError.hint}</div>}
                    {importError.code && <div><span className="font-semibold">Código:</span> {importError.code}</div>}
                    <div><span className="font-semibold">Operação:</span> <code className="bg-red-100 dark:bg-red-900/30 px-1 rounded text-xs">{importError.operation}</code></div>
                    {importError.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold">Stack trace</summary>
                        <pre className="text-xs mt-1 whitespace-pre-wrap break-all">{importError.stack}</pre>
                      </details>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setImportError(null)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg">Voltar</button>
                    <button onClick={closeImport} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Fechar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, fullWidth }: { label: string; value: string; onChange: (v: string) => void; fullWidth?: boolean }) {
  return (
    <div className={cn(fullWidth && 'md:col-span-2')}>
      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      />
    </div>
  );
}
