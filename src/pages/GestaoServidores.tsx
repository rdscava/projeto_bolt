import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Upload, Loader2 } from 'lucide-react';
import { fetchServidores, saveServidor, deleteServidor, bulkImportServidores } from '../services/servidorService';
import { formatRFMask, formatRFFromNumber } from '../lib/format';
import { toast } from 'sonner';
import type { Servidor } from '../types';

export default function GestaoServidores() {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Servidor | null>(null);
  const [form, setForm] = useState({ rf: '', nome: '', cargo: '', referencia: '' });
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchServidores();
      setServidores(data);
    } catch { toast.error('Erro ao carregar servidores'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = servidores.filter(s =>
    !search || s.rf.includes(search) || s.nome.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const openNew = () => { setEditing(null); setForm({ rf: '', nome: '', cargo: '', referencia: '' }); setDialogOpen(true); };
  const openEdit = (s: Servidor) => { setEditing(s); setForm({ rf: s.rf, nome: s.nome, cargo: s.cargo, referencia: s.referencia }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.rf || !form.nome) { toast.error('Preencha RF e Nome'); return; }
    try {
      await saveServidor({ id: editing?.id, ...form });
      toast.success(editing ? 'Servidor atualizado!' : 'Servidor cadastrado!');
      setDialogOpen(false);
      load();
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteServidor(id);
      toast.success('Servidor excluído!');
      load();
    } catch { toast.error('Erro ao excluir'); }
  };

  const handleBulkImport = async () => {
    if (!pasteText.trim()) { toast.error('Cole os dados na área de texto'); return; }
    setImporting(true);
    try {
      const lines = pasteText.trim().split('\n').filter(l => l.trim());
      const records: Omit<Servidor, 'id'>[] = [];
      for (const line of lines) {
        const cols = line.split('\t');
        if (cols.length < 2) continue;
        const rfRaw = cols[0]?.trim() || '';
        const nome = cols[1]?.trim() || '';
        const cargo = cols[2]?.trim() || '';
        const referencia = cols[3]?.trim() || '';
        if (!rfRaw || !nome) continue;
        const rf = /^\d+$/.test(rfRaw) ? formatRFFromNumber(rfRaw) : rfRaw;
        records.push({ rf, nome, cargo, referencia });
      }
      if (records.length === 0) { toast.error('Nenhum registro válido encontrado'); setImporting(false); return; }
      const total = await bulkImportServidores(records);
      toast.success(`${total} servidores importados!`);
      setPasteText('');
      setImportOpen(false);
      load();
    } catch { toast.error('Erro ao importar servidores'); }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Gestão de Servidores</h2>
          <p className="text-sm text-muted-foreground">Cadastro de servidores para cálculo de aposentadoria.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2"><Upload className="w-4 h-4" /> Importar</Button>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Novo Servidor</Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por RF ou Nome..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-10" />
        </div>
        <span className="text-sm text-muted-foreground self-center">{filtered.length} servidores</span>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>RF</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo/Função</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum servidor encontrado.</TableCell></TableRow>
            ) : paged.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-mono">{s.rf}</TableCell>
                <TableCell className="font-semibold">{s.nome}</TableCell>
                <TableCell>{s.cargo}</TableCell>
                <TableCell>{s.referencia}</TableCell>
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
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Servidor' : 'Novo Servidor'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>RF (000.000.0 V0)</Label><Input value={form.rf} onChange={e => setForm(f => ({ ...f, rf: formatRFMask(e.target.value) }))} className="font-mono" /></div>
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><Label>Cargo/Função</Label><Input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} /></div>
            <div><Label>Referência</Label><Input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? 'Salvar' : 'Cadastrar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Importar Servidores</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cole os dados do Excel (RF, Nome, Cargo, Referência separados por TAB).</p>
          <Textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Cole os dados aqui..." className="min-h-[200px] font-mono text-xs" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkImport} disabled={importing} className="gap-2">
              {importing && <Loader2 className="w-4 h-4 animate-spin" />}
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
