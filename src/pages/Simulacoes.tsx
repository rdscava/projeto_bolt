import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, FileSpreadsheet, Upload, Loader2, Plus, Copy, Pencil, FolderOpen } from 'lucide-react';
import {
  fetchSimulacoes, deleteSimulacao, fetchSimulation,
  renameSimulation, duplicateSimulation,
  type SimulacaoListItem,
} from '../services/simulacaoService';
import { formatBRL } from '../lib/format';
import { toast } from 'sonner';

export default function Simulacoes() {
  const { loadSimulation, newSimulation, activeSimulation } = useAppContext();
  const [sims, setSims] = useState<SimulacaoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<SimulacaoListItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [duplicateTarget, setDuplicateTarget] = useState<SimulacaoListItem | null>(null);
  const [duplicateValue, setDuplicateValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSimulacoes();
      setSims(data);
    } catch { toast.error('Erro ao carregar simulações'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Simulações</h2>
          <p className="text-sm text-muted-foreground">
            {sims.length} simulações salvas.
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

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Servidor</TableHead>
              <TableHead>RF</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Média (R$)</TableHead>
              <TableHead className="text-right">Valor Final (R$)</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
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
