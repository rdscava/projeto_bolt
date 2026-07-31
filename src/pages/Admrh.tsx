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
import type { AdmrhRow } from '../types';

type SortField = keyof Omit<AdmrhRow, 'id'>;
type SortDir = 'asc' | 'desc' | null;

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string | null; sortDir: SortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
}

const ADMRH_COLS = [
  { key: 'cpf', label: 'CPF' }, { key: 'matricula', label: 'Matrícula' }, { key: 'nome', label: 'Nome' },
  { key: 'tipoFolha', label: 'Tipo Folha' }, { key: 'referencia', label: 'Referência' }, { key: 'tipoPagamento', label: 'Tipo Pagamento' },
  { key: 'tipoEvento', label: 'Tipo Evento' }, { key: 'evento', label: 'Evento' }, { key: 'qtd', label: 'Qtd' },
  { key: 'incidencia', label: 'Incidência' }, { key: 'percentual', label: 'Percentual' }, { key: 'valor', label: 'Valor' },
  { key: 'tipo', label: 'Tipo' }, { key: 'cargo', label: 'Cargo' }, { key: 'funcao', label: 'Função' },
  { key: 'horasMes', label: 'Horas Mês' }, { key: 'padrao', label: 'Padrão' }, { key: 'nivel', label: 'Nível' },
  { key: 'admissao', label: 'Admissão' }, { key: 'orgao', label: 'Órgão' }, { key: 'setor', label: 'Setor' },
  { key: 'vinculo', label: 'Vínculo' }, { key: 'centroCusto', label: 'Centro Custo' }, { key: 'situacao', label: 'Situação' },
  { key: 'dtSituacao', label: 'Dt Situação' }, { key: 'codSigpec', label: 'Cod SIGPEC' },
] as const;

export default function Admrh() {
  const { admrhData, setAdmrhData, admrhFilter, setAdmrhFilter } = useAppContext();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const toggleSort = (field: SortField) => {
    if (sortField !== field) { setSortField(field); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortField(null); setSortDir(null); }
  };

  const uniqueEventos = useMemo(() => {
    const names = new Set(admrhData.map(r => r.evento));
    return Array.from(names).filter(Boolean).sort();
  }, [admrhData]);

  const filteredData = useMemo(() => {
    let data = admrhFilter.length > 0 ? admrhData.filter(r => admrhFilter.includes(r.evento)) : admrhData;
    if (sortField && sortDir) {
      data = [...data].sort((a, b) => {
        const va = (a as unknown as Record<string, string>)[sortField] || '';
        const vb = (b as unknown as Record<string, string>)[sortField] || '';
        if (sortField === 'referencia') {
          const ka = competToSortKey(va);
          const kb = competToSortKey(vb);
          if (!isNaN(ka) && !isNaN(kb)) return sortDir === 'asc' ? ka - kb : kb - ka;
        }
        return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return data;
  }, [admrhData, admrhFilter, sortField, sortDir]);

  const handleImport = (rows: string[][]) => {
    const newRows: AdmrhRow[] = rows.map((cols, i) => ({
      id: `adm_${Date.now()}_${i}`,
      cpf: cols[0]?.trim() || '', matricula: cols[1]?.trim() || '', nome: cols[2]?.trim() || '',
      tipoFolha: cols[3]?.trim() || '', referencia: cols[4]?.trim() || '', tipoPagamento: cols[5]?.trim() || '',
      tipoEvento: cols[6]?.trim() || '', evento: cols[7]?.trim() || '', qtd: cols[8]?.trim() || '',
      incidencia: cols[9]?.trim() || '', percentual: cols[10]?.trim() || '', valor: cols[11]?.trim() || '',
      tipo: cols[12]?.trim() || '', cargo: cols[13]?.trim() || '', funcao: cols[14]?.trim() || '',
      horasMes: cols[15]?.trim() || '', padrao: cols[16]?.trim() || '', nivel: cols[17]?.trim() || '',
      admissao: cols[18]?.trim() || '', orgao: cols[19]?.trim() || '', setor: cols[20]?.trim() || '',
      vinculo: cols[21]?.trim() || '', centroCusto: cols[22]?.trim() || '', situacao: cols[23]?.trim() || '',
      dtSituacao: cols[24]?.trim() || '', codSigpec: cols[25]?.trim() || '',
    }));
    setAdmrhData([...admrhData, ...newRows]);
    toast.success(`${newRows.length} linhas importadas!`);
  };

  const handleConvertDates = () => {
    let converted = 0;
    const updated = admrhData.map(r => {
      let referencia = r.referencia;
      let admissao = r.admissao;
      if (isMMYYYYFormat(referencia)) { referencia = convertDateMMYYYY(referencia); converted++; }
      if (isMMYYYYFormat(admissao)) { admissao = convertDateMMYYYY(admissao); converted++; }
      return { ...r, referencia, admissao };
    });
    setAdmrhData(updated);
    toast.success(converted > 0 ? `${converted} datas convertidas!` : 'Nenhuma data no formato mm/aaaa encontrada.');
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filteredData.length) setSelected(new Set());
    else setSelected(new Set(filteredData.map(r => r.id)));
  };

  const deleteSelected = () => {
    setAdmrhData(admrhData.filter(r => !selected.has(r.id)));
    setSelected(new Set());
    toast.success('Linhas excluídas!');
  };

  const toggleFilter = (name: string) => {
    if (admrhFilter.includes(name)) setAdmrhFilter(admrhFilter.filter(n => n !== name));
    else setAdmrhFilter([...admrhFilter, name]);
  };

  const SortableHead = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => toggleSort(field)}>
      <div className="flex items-center">
        {children}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">ADMRH</h2>
        <p className="text-sm text-muted-foreground">Cole os dados do ADMRH (Eventos AHM). Use os botões para converter formatos.</p>
      </div>

      <PasteImport onImport={handleImport} onConvertDates={handleConvertDates} />

      {admrhData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Evento {admrhFilter.length > 0 && `(${admrhFilter.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-h-[400px] overflow-auto">
                <div className="space-y-1">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => setAdmrhFilter([])}>Limpar filtro</Button>
                  {uniqueEventos.map(name => (
                    <label key={name} className="flex items-center gap-2 p-1 text-xs cursor-pointer hover:bg-muted rounded">
                      <Checkbox checked={admrhFilter.includes(name)} onCheckedChange={() => toggleFilter(name)} />
                      {name}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected} className="gap-2"><Trash2 className="w-4 h-4" /> Excluir ({selected.size})</Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 ml-auto"><Trash2 className="w-4 h-4" /> Limpar Dados</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Limpar dados ADMRH?</AlertDialogTitle><AlertDialogDescription>Todos os dados importados serão removidos.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { setAdmrhData([]); setAdmrhFilter([]); toast.success('Dados limpos!'); }}>Limpar</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="rounded-lg border border-border bg-card max-h-[750px] overflow-y-auto">
            <div className="overflow-x-auto">
              <Table className="min-w-[2400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 sticky left-0 bg-card z-10"><Checkbox checked={selected.size === filteredData.length && filteredData.length > 0} onCheckedChange={toggleAll} /></TableHead>
                    {ADMRH_COLS.map(col => (
                      <SortableHead key={col.key} field={col.key as SortField}>{col.label}</SortableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map(row => (
                    <TableRow key={row.id} className="text-[10px] font-mono leading-tight">
                      <TableCell className="sticky left-0 bg-card z-10"><Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} /></TableCell>
                      {ADMRH_COLS.map(col => (
                        <TableCell key={col.key} className="whitespace-nowrap py-1.5 px-2">{(row as unknown as Record<string, string>)[col.key]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{filteredData.length} de {admrhData.length} registros</p>
        </div>
      )}
    </div>
  );
}
