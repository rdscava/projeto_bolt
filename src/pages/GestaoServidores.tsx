import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Upload, Loader2, FileDown, FileUp, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { fetchServidoresPage, saveServidor, deleteServidor, bulkImportServidores, fetchAllServidores } from '../services/servidorService';
import { formatRFMask, formatRFFromNumber } from '../lib/format';
import { parseCSVFile, generateCSV, downloadCSV } from '../lib/csvParser';
import { toast } from 'sonner';
import type { Servidor } from '../types';

interface ServidorForm {
  rf: string;
  nome: string;
  cargo: string;
  referencia: string;
  relacaoJurAdm: string;
  jornada: string;
  nomeSetor: string;
}

const EMPTY_FORM: ServidorForm = { rf: '', nome: '', cargo: '', referencia: '', relacaoJurAdm: '', jornada: '', nomeSetor: '' };

const COLUMN_MAP: Record<string, keyof ServidorForm> = {
  'reg. completo': 'rf',
  'reg.completo': 'rf',
  'nome': 'nome',
  'cargo': 'cargo',
  'cargo/função': 'cargo',
  'cargo/funcao': 'cargo',
  'ref': 'referencia',
  'referência': 'referencia',
  'referencia': 'referencia',
  'tipo': 'relacaoJurAdm',
  'relação jur-adm': 'relacaoJurAdm',
  'relacao jur-adm': 'relacaoJurAdm',
  'jornada': 'jornada',
  'setor': 'nomeSetor',
  'nome do setor': 'nomeSetor',
};

const EXPORT_HEADERS = ['REG. COMPLETO', 'NOME', 'CARGO', 'REF', 'TIPO', 'JORNADA', 'SETOR'];
const TEMPLATE_ROWS: string[][] = [
  ['000.000.0 V0', 'Nome Exemplo', 'Cargo Exemplo', 'Referência Exemplo', 'EFETIVO', '40H', 'Setor Exemplo'],
];

interface PreviewData {
  headers: string[];
  rows: string[][];
  records: Omit<Servidor, 'id'>[];
  errors: { line: number; reason: string }[];
  separator: string;
  encoding: string;
  fileName: string;
}

interface ImportSummary {
  total: number;
  imported: number;
  rejected: number;
  errors: { line: number; reason: string }[];
}

type SortField = 'rf' | 'nome' | 'cargo' | 'referencia' | 'relacao_jur_adm' | 'jornada' | 'nome_setor';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 50;

export default function GestaoServidores() {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Servidor | null>(null);
  const [form, setForm] = useState<ServidorForm>(EMPTY_FORM);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseProgress, setParseProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchServidoresPage({
        search: debouncedSearch || undefined,
        sortField,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      });
      setServidores(result.data);
      setTotalCount(result.count);
    } catch {
      toast.error('Erro ao carregar servidores');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sortField, sortDir, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadPage(); }, [loadPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (s: Servidor) => {
    setEditing(s);
    setForm({ rf: s.rf, nome: s.nome, cargo: s.cargo, referencia: s.referencia, relacaoJurAdm: s.relacaoJurAdm, jornada: s.jornada, nomeSetor: s.nomeSetor });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.rf || !form.nome) { toast.error('Preencha RF e Nome'); return; }
    try {
      await saveServidor({ id: editing?.id, ...form });
      toast.success(editing ? 'Servidor atualizado!' : 'Servidor cadastrado!');
      setDialogOpen(false);
      loadPage();
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteServidor(id);
      toast.success('Servidor excluído!');
      loadPage();
    } catch { toast.error('Erro ao excluir'); }
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Selecione um arquivo .csv');
      return;
    }
    setParseProgress(true);
    setImportSummary(null);
    try {
      const parsed = await parseCSVFile(file);
      if (parsed.rows.length === 0 && parsed.headers.length === 0) {
        toast.error('Arquivo vazio ou inválido');
        setParseProgress(false);
        return;
      }
      const { records, errors } = validateAndMap(parsed.headers, parsed.rows);
      setPreview({
        headers: parsed.headers,
        rows: parsed.rows,
        records,
        errors,
        separator: parsed.separator,
        encoding: parsed.encoding,
        fileName: file.name,
      });
    } catch {
      toast.error('Erro ao ler arquivo CSV');
    } finally {
      setParseProgress(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    if (preview.records.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }
    setImporting(true);
    setImportProgress(0);
    try {
      const imported = await bulkImportServidores(preview.records, (current, total) => {
        setImportProgress(Math.round((current / total) * 100));
      });
      setImportSummary({
        total: preview.records.length + preview.errors.length,
        imported,
        rejected: preview.errors.length,
        errors: preview.errors,
      });
      toast.success(`${imported} servidores importados!`);
      loadPage();
    } catch {
      toast.error('Erro ao importar servidores');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const all = await fetchAllServidores();
      const rows = all.map(s => [s.rf, s.nome, s.cargo, s.referencia, s.relacaoJurAdm, s.jornada, s.nomeSetor]);
      const csv = generateCSV(EXPORT_HEADERS, rows);
      downloadCSV('servidores.csv', csv);
      toast.success(`${all.length} servidores exportados!`);
    } catch {
      toast.error('Erro ao exportar');
    }
  };

  const handleDownloadTemplate = () => {
    const csv = generateCSV(EXPORT_HEADERS, TEMPLATE_ROWS);
    downloadCSV('modelo_servidores.csv', csv);
  };

  const closeImport = () => {
    setImportOpen(false);
    setPreview(null);
    setImportSummary(null);
    setImportProgress(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Gestão de Servidores</h2>
          <p className="text-sm text-muted-foreground">Cadastro de servidores para cálculo de aposentadoria.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2"><Upload className="w-4 h-4" /> Importar CSV</Button>
          <Button variant="outline" onClick={handleExport} className="gap-2"><FileDown className="w-4 h-4" /> Exportar CSV</Button>
          <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2"><FileUp className="w-4 h-4" /> Modelo CSV</Button>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Novo Servidor</Button>
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por RF ou Nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <span className="text-sm text-muted-foreground">{totalCount.toLocaleString('pt-BR')} servidores</span>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('rf')}>RF<SortIcon field="rf" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('nome')}>Nome<SortIcon field="nome" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('cargo')}>Cargo/Função<SortIcon field="cargo" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('referencia')}>Referência<SortIcon field="referencia" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('relacao_jur_adm')}>Relação Jur-Adm<SortIcon field="relacao_jur_adm" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('jornada')}>Jornada<SortIcon field="jornada" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('nome_setor')}>Nome do Setor<SortIcon field="nome_setor" /></TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando...</TableCell></TableRow>
            ) : servidores.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum servidor encontrado.</TableCell></TableRow>
            ) : servidores.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-mono">{s.rf}</TableCell>
                <TableCell className="font-semibold">{s.nome}</TableCell>
                <TableCell>{s.cargo}</TableCell>
                <TableCell>{s.referencia}</TableCell>
                <TableCell>{s.relacaoJurAdm}</TableCell>
                <TableCell>{s.jornada}</TableCell>
                <TableCell>{s.nomeSetor}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Excluir Servidor?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(s.id!)}>Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(0)}>Primeira</Button>
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>Última</Button>
        </div>
      )}

      {/* Edit/New Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar Servidor' : 'Novo Servidor'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>RF (000.000.0 V0)</Label><Input value={form.rf} onChange={e => setForm(f => ({ ...f, rf: formatRFMask(e.target.value) }))} className="font-mono" /></div>
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Cargo/Função</Label><Input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} /></div>
              <div><Label>Referência</Label><Input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} /></div>
              <div><Label>Relação Jur-Adm</Label><Input value={form.relacaoJurAdm} onChange={e => setForm(f => ({ ...f, relacaoJurAdm: e.target.value }))} /></div>
              <div><Label>Jornada</Label><Input value={form.jornada} onChange={e => setForm(f => ({ ...f, jornada: e.target.value }))} /></div>
            </div>
            <div><Label>Nome do Setor</Label><Input value={form.nomeSetor} onChange={e => setForm(f => ({ ...f, nomeSetor: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? 'Salvar' : 'Cadastrar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) closeImport(); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar Servidores — CSV</DialogTitle></DialogHeader>

          {!preview && !importSummary && (
            <>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {parseProgress ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Lendo arquivo...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <FileUp className="w-10 h-10 text-muted-foreground" />
                    <p className="text-sm font-medium">Arraste e solte um arquivo CSV aqui</p>
                    <p className="text-xs text-muted-foreground">ou</p>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                      <Upload className="w-4 h-4" /> Selecionar Arquivo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Formatos aceitos: UTF-8 e ANSI (Windows-1252) · Separadores: ; ou , · Cabeçalho obrigatório
                    </p>
                    <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="gap-1 text-xs mt-1">
                      <FileDown className="w-3 h-3" /> Baixar modelo CSV
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {preview && !importSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Arquivo</p>
                  <p className="font-medium truncate">{preview.fileName}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Encoding</p>
                  <p className="font-medium">{preview.encoding}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Separador</p>
                  <p className="font-medium">{preview.separator === ';' ? ';' : ','}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Colunas</p>
                  <p className="font-medium">{preview.headers.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Total de registros</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{preview.records.length + preview.errors.length}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
                  <p className="text-xs text-green-600 dark:text-green-400">Válidos</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{preview.records.length}</p>
                </div>
                <div className={`rounded-lg p-3 border ${preview.errors.length > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'bg-muted/30 border-border'}`}>
                  <p className={`text-xs ${preview.errors.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>Inválidos</p>
                  <p className={`text-xl font-bold ${preview.errors.length > 0 ? 'text-red-700 dark:text-red-300' : ''}`}>{preview.errors.length}</p>
                </div>
              </div>

              {preview.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Registros inválidos:</p>
                  {preview.errors.slice(0, 20).map((e, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-500">Linha {e.line}: {e.reason}</p>
                  ))}
                  {preview.errors.length > 20 && <p className="text-xs text-red-500 mt-1">... e mais {preview.errors.length - 20} erro(s)</p>}
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Pré-visualização (primeiras 10 linhas):</p>
                <div className="rounded-lg border border-border overflow-auto max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview.headers.map((h, i) => <TableHead key={i} className="text-xs">{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.slice(0, 10).map((row, ri) => (
                        <TableRow key={ri}>
                          {preview.headers.map((_, ci) => <TableCell key={ci} className="text-xs">{row[ci] || ''}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreview(null)}>Voltar</Button>
                <Button onClick={handleConfirmImport} disabled={importing || preview.records.length === 0} className="gap-2">
                  {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {importing ? 'Importando...' : `Confirmar Importação (${preview.records.length})`}
                </Button>
              </div>

              {importing && (
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">{importProgress}%</p>
                </div>
              )}
            </div>
          )}

          {importSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Total de registros</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{importSummary.total}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                  <p className="text-xs text-green-600 dark:text-green-400">Importados</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{importSummary.imported}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-center">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
                  <p className="text-xs text-red-600 dark:text-red-400">Rejeitados</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{importSummary.rejected}</p>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Motivos dos erros:</p>
                  {importSummary.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-500">Linha {e.line}: {e.reason}</p>
                  ))}
                </div>
              )}

              {importSummary.rejected === 0 && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Todos os registros foram importados com sucesso!
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={closeImport}>Concluir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function validateAndMap(headers: string[], rows: string[][]): { records: Omit<Servidor, 'id'>[]; errors: { line: number; reason: string }[] } {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const fieldIndices: Partial<Record<keyof ServidorForm, number>> = {};
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const field = COLUMN_MAP[normalizedHeaders[i]];
    if (field && fieldIndices[field] === undefined) {
      fieldIndices[field] = i;
    }
  }

  const records: Omit<Servidor, 'id'>[] = [];
  const errors: { line: number; reason: string }[] = [];

  if (fieldIndices.rf === undefined) {
    errors.push({ line: 1, reason: 'Coluna "REG. COMPLETO" não encontrada no cabeçalho' });
    return { records, errors };
  }
  if (fieldIndices.nome === undefined) {
    errors.push({ line: 1, reason: 'Coluna "NOME" não encontrada no cabeçalho' });
    return { records, errors };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2;

    if (row.every(c => c.trim() === '')) continue;

    const rfRaw = row[fieldIndices.rf]?.trim() || '';
    const nome = row[fieldIndices.nome]?.trim() || '';

    if (!rfRaw && !nome) continue;

    if (!rfRaw) {
      errors.push({ line: lineNum, reason: 'RF é obrigatório' });
      continue;
    }
    if (!nome) {
      errors.push({ line: lineNum, reason: 'Nome é obrigatório' });
      continue;
    }

    const rf = /^\d+$/.test(rfRaw) ? formatRFFromNumber(rfRaw) : rfRaw;
    records.push({
      rf,
      nome,
      cargo: row[fieldIndices.cargo ?? -1]?.trim() || '',
      referencia: row[fieldIndices.referencia ?? -1]?.trim() || '',
      relacaoJurAdm: row[fieldIndices.relacaoJurAdm ?? -1]?.trim() || '',
      jornada: row[fieldIndices.jornada ?? -1]?.trim() || '',
      nomeSetor: row[fieldIndices.nomeSetor ?? -1]?.trim() || '',
    });
  }

  return { records, errors };
}
