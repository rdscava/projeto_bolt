import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, FileSpreadsheet, Loader2, Plus, Copy, Pencil, FolderOpen, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  fetchSimulacoes, deleteSimulacao, fetchSimulation,
  renameSimulation, duplicateSimulation,
  type SimulacaoListItem,
} from '../services/simulacaoService';
import { formatBRL } from '../lib/format';
import { toast } from 'sonner';

type SearchField = 'all' | 'rf' | 'nome' | 'cpf' | 'matricula' | 'data' | 'status';
type SortField = 'numero' | 'nome' | 'data_ultima_alteracao' | 'rf' | 'servidor_nome' | 'tipo' | 'media' | 'valor_final';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

export default function Simulacoes() {
  const { loadSimulation, newSimulation, activeSimulation } = useAppContext();
  const [sims, setSims] = useState<SimulacaoListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<SimulacaoListItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [duplicateTarget, setDuplicateTarget] = useState<SimulacaoListItem | null>(null);
  const [duplicateValue, setDuplicateValue] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [sortField, setSortField] = useState<SortField>('data_ultima_alteracao');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSimulacoes({
        search: debouncedSearch || undefined,
        searchField,
        sortField,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      });
      setSims(result.data);
      setTotalCount(result.count);
    } catch { toast.error('Erro ao carregar simulações'); }
    finally { setLoading(false); }
  }, [debouncedSearch, searchField, sortField, sortDir, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  };

  const handleOpen = async (id: string) => {
    setLoadingId(id);
    try {
      const sim = await fetchSimulation(id);
      if (!sim) { toast.error('Dados da simulação não encontrados'); return; }
      loadSimulation(sim);
      toast.success('Simulação carregada! Todas as telas foram restauradas.');
    } catch { toast.error('Erro ao carregar simulação'); }
    finally { setLoadingId(null); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSimulacao(id);
      toast.success('Simulação excluída!');
      load();
    } catch { toast.error('Erro ao excluir'); }
  };

  const handleNew = () => {
    newSimulation();
    toast.success('Nova simulação criada. Edite os dados nas outras telas.');
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await renameSimulation(renameTarget.id, renameValue.trim());
      toast.success('Simulação renomeada!');
      setRenameTarget(null);
      load();
    } catch { toast.error('Erro ao renomear'); }
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget || !duplicateValue.trim()) return;
    setLoadingId(duplicateTarget.id);
    try {
      const newId = await duplicateSimulation(duplicateTarget.id, duplicateValue.trim());
      if (!newId) { toast.error('Erro ao duplicar: simulação original não encontrada'); return; }
      toast.success('Simulação duplicada!');
      setDuplicateTarget(null);
      load();
    } catch { toast.error('Erro ao duplicar'); }
    finally { setLoadingId(null); }
  };

  const handleExportExcel = () => {
    const header = 'Nome\tData/Hora\tServidor\tRF\tTipo\tMédia (R$)\tValor Final (R$)\n';
    const rows = sims.map(s => {
      const dt = s.dataHora ? new Date(s.dataHora).toLocaleString('pt-BR') : '';
      return `${s.nome}\t${dt}\t${s.servidorNome}\t${s.rf}\t${s.tipo}\t${s.media.toFixed(2)}\t${s.valorFinal.toFixed(2)}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'simulacoes.tsv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado!');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Simulações</h2>
          <p className="text-sm text-muted-foreground">
            {totalCount.toLocaleString('pt-BR')} simulações salvas.
            {activeSimulation && <span className="ml-2">· Simulação ativa: <strong>{activeSimulation.nome}</strong></span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNew} className="gap-2"><Plus className="w-4 h-4" /> Nova Simulação</Button>
          {sims.length > 0 && (
            <Button variant="outline" onClick={handleExportExcel} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Exportar Excel</Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar simulações..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={searchField} onValueChange={(v) => { setSearchField(v as SearchField); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os campos</SelectItem>
            <SelectItem value="rf">RF</SelectItem>
            <SelectItem value="nome">Nome</SelectItem>
            <SelectItem value="cpf">CPF</SelectItem>
            <SelectItem value="matricula">Matrícula</SelectItem>
            <SelectItem value="data">Data</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('numero')}>Nº<SortIcon field="numero" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('nome')}>Nome<SortIcon field="nome" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('data_ultima_alteracao')}>Data/Hora<SortIcon field="data_ultima_alteracao" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('servidor_nome')}>Servidor<SortIcon field="servidor_nome" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('rf')}>RF<SortIcon field="rf" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('tipo')}>Tipo<SortIcon field="tipo" /></TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('media')}>Média (R$)<SortIcon field="media" /></TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('valor_final')}>Valor Final (R$)<SortIcon field="valor_final" /></TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando...</TableCell></TableRow>
            ) : sims.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma simulação salva. Clique em "Nova Simulação" para começar.</TableCell></TableRow>
            ) : sims.map(s => (
              <TableRow key={s.id} className={activeSimulation?.id === s.id ? 'bg-primary/5' : ''}>
                <TableCell className="text-muted-foreground">{s.numero}</TableCell>
                <TableCell className="font-semibold">{s.nome || `Simulação #${s.numero}`}</TableCell>
                <TableCell className="text-sm">{s.dataHora ? new Date(s.dataHora).toLocaleString('pt-BR') : ''}</TableCell>
                <TableCell>
                  <div><span className="font-semibold text-primary">{s.servidorNome}</span></div>
                  <div className="text-xs text-muted-foreground">{s.servidorCargo}</div>
                </TableCell>
                <TableCell className="font-mono text-sm">{s.rf}</TableCell>
                <TableCell><Badge variant={s.tipo === '80%' ? 'default' : 'secondary'}>{s.tipo}</Badge></TableCell>
                <TableCell className="text-right font-mono">{formatBRL(s.media)}</TableCell>
                <TableCell className="text-right font-mono font-bold text-primary">{formatBRL(s.valorFinal)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" onClick={() => handleOpen(s.id)} disabled={loadingId === s.id} title="Abrir Simulação">
                      {loadingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setRenameTarget(s); setRenameValue(s.nome || `Simulação #${s.numero}`); }} title="Renomear">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDuplicateTarget(s); setDuplicateValue(`${s.nome || `Simulação #${s.numero}`} (cópia)`); }} title="Duplicar">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" title="Excluir"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Excluir simulação?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(s.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
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

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(v) => !v && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renomear Simulação</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="Nome da simulação" onKeyDown={e => { if (e.key === 'Enter') handleRename(); }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancelar</Button>
            <Button onClick={handleRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate dialog */}
      <Dialog open={!!duplicateTarget} onOpenChange={(v) => !v && setDuplicateTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Duplicar Simulação</DialogTitle></DialogHeader>
          <Input value={duplicateValue} onChange={e => setDuplicateValue(e.target.value)} placeholder="Nome da nova simulação" onKeyDown={e => { if (e.key === 'Enter') handleDuplicate(); }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateTarget(null)}>Cancelar</Button>
            <Button onClick={handleDuplicate}>Duplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
