import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import PasteImport from '../components/PasteImport';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { convertDateMMYYYY, isMMYYYYFormat, competToSortKey } from '../lib/format';
import type { SigpecRow } from '../types';

type SortField = 'consol' | 'rub' | 'tp' | 'nomeAbreviado' | 'complemento' | 'tipoFolha' | 'tipoCalc' | 'folha' | 'no' | 'valor' | 'pens' | 'compet';
type SortDir = 'asc' | 'desc' | null;

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string | null; sortDir: SortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
}

export default function SigpecBase() {
  const { sigpecData, setSigpecData, sigpecFilter, setSigpecFilter } = useAppContext();
  const [complementoFilter, setComplementoFilter] = useState<string[]>([]);
  const [tipoFolhaFilter, setTipoFolhaFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const toggleSort = (field: SortField) => {
    if (sortField !== field) { setSortField(field); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortField(null); setSortDir(null); }
  };

  const uniqueNames = useMemo(() => Array.from(new Set(sigpecData.map(r => r.nomeAbreviado))).sort(), [sigpecData]);
  const uniqueComplementos = useMemo(() => Array.from(new Set(sigpecData.map(r => r.complemento))).filter(Boolean).sort(), [sigpecData]);
  const uniqueTipoFolhas = useMemo(() => Array.from(new Set(sigpecData.map(r => r.tipoFolha))).filter(Boolean).sort(), [sigpecData]);

  const filteredData = useMemo(() => {
    let data = sigpecData;
    if (sigpecFilter.length > 0) data = data.filter(r => sigpecFilter.includes(r.nomeAbreviado));
    if (complementoFilter.length > 0) data = data.filter(r => complementoFilter.includes(r.complemento));
    if (tipoFolhaFilter.length > 0) data = data.filter(r => tipoFolhaFilter.includes(r.tipoFolha));
    if (sortField && sortDir) {
      data = [...data].sort((a, b) => {
        const va = (a as unknown as Record<string, string>)[sortField] || '';
        const vb = (b as unknown as Record<string, string>)[sortField] || '';
        if (sortField === 'compet' || sortField === 'folha') {
          const ka = competToSortKey(va);
          const kb = competToSortKey(vb);
          return sortDir === 'asc' ? ka - kb : kb - ka;
        }
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return data;
  }, [sigpecData, sigpecFilter, complementoFilter, tipoFolhaFilter, sortField, sortDir]);

  const handleImport = (rows: string[][]) => {
    const newRows: SigpecRow[] = rows.map((cols, i) => ({
      id: `sig_${Date.now()}_${i}`,
      consol: cols[0]?.trim() || '',
      rub: cols[1]?.trim() || '',
      tp: cols[2]?.trim() || '',
      nomeAbreviado: cols[3]?.trim() || '',
      complemento: cols[4]?.trim() || '',
      tipoFolha: cols[5]?.trim() || '',
      tipoCalc: cols[6]?.trim() || '',
      folha: cols[7]?.trim() || '',
      no: cols[8]?.trim() || '',
      valor: cols[9]?.trim() || '',
      pens: cols[10]?.trim() || '',
      compet: cols[11]?.trim() || '',
    }));
    setSigpecData([...sigpecData, ...newRows]);
    toast.success(`${newRows.length} linhas importadas!`);
  };

  const handleConvertDates = () => {
    let converted = 0;
    const updated = sigpecData.map(r => {
      let folha = r.folha;
      let compet = r.compet;
      if (isMMYYYYFormat(folha)) { folha = convertDateMMYYYY(folha); converted++; }
      if (isMMYYYYFormat(compet)) { compet = convertDateMMYYYY(compet); converted++; }
      return { ...r, folha, compet };
    });
    setSigpecData(updated);
    toast.success(converted > 0 ? `${converted} datas convertidas!` : 'Nenhuma data no formato mm/aaaa encontrada.');
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filteredData.length) setSelected(new Set());
    else setSelected(new Set(filteredData.map(r => r.id)));
  };

  const deleteSelected = () => {
    setSigpecData(sigpecData.filter(r => !selected.has(r.id)));
    setSelected(new Set());
    toast.success('Linhas excluídas!');
  };

  const toggleFilter = (name: string, filter: string[], setFilter: (f: string[]) => void) => {
    if (filter.includes(name)) setFilter(filter.filter(n => n !== name));
    else setFilter([...filter, name]);
  };

  const SortableHead = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => toggleSort(field)}>
      <div className="flex items-center">
        {children}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </TableHead>
  );

  const FilterPopover = ({ label, values, filter, setFilter }: { label: string; values: string[]; filter: string[]; setFilter: (f: string[]) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          {label} {filter.length > 0 && `(${filter.length})`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[400px] overflow-auto">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => setFilter([])}>Limpar filtro</Button>
          {values.map(name => (
            <label key={name} className="flex items-center gap-2 p-1 text-xs cursor-pointer hover:bg-muted rounded">
              <Checkbox checked={filter.includes(name)} onCheckedChange={() => toggleFilter(name, filter, setFilter)} />
              {name}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">SIGPEC BASE</h2>
        <p className="text-sm text-muted-foreground">Cole os dados do SIGPEC. Use os botões para converter formatos.</p>
      </div>

      <PasteImport onImport={handleImport} onConvertDates={handleConvertDates} />

      {sigpecData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <FilterPopover label="Nome Abreviado" values={uniqueNames} filter={sigpecFilter} setFilter={setSigpecFilter} />
            <FilterPopover label="Complemento" values={uniqueComplementos} filter={complementoFilter} setFilter={setComplementoFilter} />
            <FilterPopover label="Tipo Folha" values={uniqueTipoFolhas} filter={tipoFolhaFilter} setFilter={setTipoFolhaFilter} />

            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected} className="gap-2"><Trash2 className="w-4 h-4" /> Excluir ({selected.size})</Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 ml-auto"><Trash2 className="w-4 h-4" /> Limpar Dados</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Limpar dados SIGPEC?</AlertDialogTitle><AlertDialogDescription>Todos os dados importados serão removidos.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { setSigpecData([]); setSigpecFilter([]); setComplementoFilter([]); setTipoFolhaFilter([]); toast.success('Dados limpos!'); }}>Limpar</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selected.size === filteredData.length && filteredData.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <SortableHead field="consol">Consol.?</SortableHead>
                  <SortableHead field="rub">Rub.</SortableHead>
                  <SortableHead field="tp">Tp</SortableHead>
                  <SortableHead field="nomeAbreviado">Nome Abreviado</SortableHead>
                  <SortableHead field="complemento">Complemento</SortableHead>
                  <SortableHead field="tipoFolha">Tipo Folha</SortableHead>
                  <SortableHead field="tipoCalc">Tipo Cálc.</SortableHead>
                  <SortableHead field="folha">Folha</SortableHead>
                  <SortableHead field="no">No.</SortableHead>
                  <SortableHead field="valor">Valor</SortableHead>
                  <SortableHead field="pens">Pens</SortableHead>
                  <SortableHead field="compet">Compet.</SortableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map(row => (
                  <TableRow key={row.id} className="text-xs font-mono">
                    <TableCell><Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} /></TableCell>
                    <TableCell>{row.consol}</TableCell>
                    <TableCell>{row.rub}</TableCell>
                    <TableCell>{row.tp}</TableCell>
                    <TableCell>{row.nomeAbreviado}</TableCell>
                    <TableCell>{row.complemento}</TableCell>
                    <TableCell>{row.tipoFolha}</TableCell>
                    <TableCell>{row.tipoCalc}</TableCell>
                    <TableCell>{row.folha}</TableCell>
                    <TableCell>{row.no}</TableCell>
                    <TableCell>{row.valor}</TableCell>
                    <TableCell>{row.pens}</TableCell>
                    <TableCell>{row.compet}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">{filteredData.length} de {sigpecData.length} registros</p>
        </div>
      )}
    </div>
  );
}
