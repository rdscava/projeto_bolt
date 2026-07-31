import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { IndiceRow } from '../types';

export default function Indices() {
  const { indices, setIndices } = useAppContext();
  const [text, setText] = useState('');

  const handleImport = () => {
    if (!text.trim()) { toast.error('Cole os dados primeiro'); return; }
    const lines = text.trim().split('\n');
    const newIndices: IndiceRow[] = [];
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const compet = parts[0].trim();
        const indice = parseFloat(parts[1].trim().replace(',', '.'));
        if (compet && !isNaN(indice)) newIndices.push({ compet, indice });
      }
    }
    if (newIndices.length === 0) { toast.error('Nenhum índice válido encontrado'); return; }
    setIndices(newIndices);
    setText('');
    toast.success(`${newIndices.length} índices importados!`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Índices de Atualização</h2>
        <p className="text-sm text-muted-foreground">Índices de atualização do Regime Geral de Previdência Social (RGPS).</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-medium">Cole os índices (Competência TAB Índice):</p>
        <Textarea value={text} onChange={e => setText(e.target.value)} placeholder={'07/1994\t2.273274\n08/1994\t2.273274\n...'} className="min-h-[150px] font-mono text-xs" />
        <div className="flex gap-2">
          <Button onClick={handleImport} className="gap-2"><Upload className="w-4 h-4" /> Atualizar Índices</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" className="gap-2 text-destructive border-destructive/30"><Trash2 className="w-4 h-4" /> Limpar</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Limpar Índices?</AlertDialogTitle><AlertDialogDescription>Todos os índices serão removidos.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { setIndices([]); toast.success('Índices limpos!'); }}>Limpar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {indices.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="p-4 border-b border-border">
            <p className="text-sm font-medium">{indices.length} índices carregados — {indices[0]?.compet} a {indices[indices.length - 1]?.compet}</p>
          </div>
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead className="text-right">Índice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indices.map((row, i) => (
                  <TableRow key={row.compet}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono">{row.compet}</TableCell>
                    <TableCell className="text-right font-mono">{row.indice.toFixed(6)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
