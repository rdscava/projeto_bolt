import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import PasteImport from '../components/PasteImport';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { convertDateMMYYYY, isMMYYYYFormat, competToSortKey } from '../lib/format';

export default function Averbacao() {
  const { averbacaoData, setAverbacaoData } = useAppContext();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  const toggleSort = () => {
    if (sortDir === null) setSortDir('asc');
    else if (sortDir === 'asc') setSortDir('desc');
    else setSortDir(null);
  };

  const displayData = useMemo(() => {
    if (!sortDir) return averbacaoData;
    return [...averbacaoData].sort((a, b) => {
      const ka = competToSortKey(a.compet);
      const kb = competToSortKey(b.compet);
      return sortDir === 'asc' ? ka - kb : kb - ka;
    });
  }, [averbacaoData, sortDir]);

  const handleImport = (rows: string[][]) => {
    const newRows = rows.map((cols, i) => ({
      id: `av_${Date.now()}_${i}`,
      compet: cols[0]?.trim() || '',
      valor: cols[1]?.trim() || '',
    }));
    setAverbacaoData([...averbacaoData, ...newRows]);
    toast.success(`${newRows.length} linhas importadas!`);
  };

  const handleConvertDates = () => {
    let converted = 0;
    const updated = averbacaoData.map(r => {
      let compet = r.compet;
      if (isMMYYYYFormat(compet)) { compet = convertDateMMYYYY(compet); converted++; }
      return { ...r, compet };
    });
    setAverbacaoData(updated);
    toast.success(converted > 0 ? `${converted} datas convertidas!` : 'Nenhuma data no formato mm/aaaa encontrada.');
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === averbacaoData.length) setSelected(new Set());
    else setSelected(new Set(averbacaoData.map(r => r.id)));
  };

  const deleteSelected = () => {
    setAverbacaoData(averbacaoData.filter(r => !selected.has(r.id)));
    setSelected(new Set());
    toast.success('Linhas excluídas!');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Averbação</h2>
        <p className="text-sm text-muted-foreground">Cole os dados de averbação (competência e valor).</p>
      </div>

      <PasteImport onImport={handleImport} onConvertDates={handleConvertDates} placeholder="Cole os dados aqui (Competência TAB Valor)..." />

      {averbacaoData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected} className="gap-2"><Trash2 className="w-4 h-4" /> Excluir ({selected.size})</Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 ml-auto"><Trash2 className="w-4 h-4" /> Limpar Dados</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Limpar dados de Averbação?</AlertDialogTitle><AlertDialogDescription>Todos os dados importados serão removidos.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { setAverbacaoData([]); toast.success('Dados limpos!'); }}>Limpar</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selected.size === averbacaoData.length && averbacaoData.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={toggleSort}>
                    <div className="flex items-center">
                      COMPET
                      {sortDir === null && <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />}
                      {sortDir === 'asc' && <ArrowUp className="w-3 h-3 ml-1" />}
                      {sortDir === 'desc' && <ArrowDown className="w-3 h-3 ml-1" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">VALOR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map(row => (
                  <TableRow key={row.id} className="font-mono text-sm">
                    <TableCell><Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} /></TableCell>
                    <TableCell>{row.compet}</TableCell>
                    <TableCell className="text-right">{row.valor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">{averbacaoData.length} registros</p>
        </div>
      )}
    </div>
  );
}
