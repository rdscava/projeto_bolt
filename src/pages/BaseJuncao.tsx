import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getTetoINSS, isInTetoRange } from '../data/teto-inss';
import { parseDecimalBR, extractMMYYYY, competToSortKey, formatBRL, generateCompetencias, formatCompetAsDate, buildIndexMap, getFatorAtualizacao } from '../lib/format';
import type { BaseJuncaoRow, VinculoConfig } from '../types';

export default function BaseJuncao() {
  const { tipoCalculo, setTipoCalculo, sigpecData, sigpecFilter, admrhData, admrhFilter, averbacaoData, indices, vinculoConfig, setVinculoConfig } = useAppContext();
  const [showVinculo, setShowVinculo] = useState(false);
  const [tempVinculo, setTempVinculo] = useState<VinculoConfig>(vinculoConfig);

  const endCompet = tipoCalculo === '80' ? '03/2022' : (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  })();
  const endSortKey = competToSortKey(endCompet);
  const startSortKey = competToSortKey('07/1994');

  const consolidatedRows = useMemo(() => {
    const valueMap = new Map<string, number>();

    const sigFiltered = sigpecFilter.length > 0 ? sigpecData.filter(r => sigpecFilter.includes(r.nomeAbreviado)) : sigpecData;
    for (const row of sigFiltered) {
      const compet = extractMMYYYY(row.compet);
      if (!compet) continue;
      const sk = competToSortKey(compet);
      if (sk >= startSortKey && sk <= endSortKey) {
        const val = parseDecimalBR(row.valor);
        if (val !== 0) valueMap.set(compet, (valueMap.get(compet) || 0) + val);
      }
    }

    const admFiltered = admrhFilter.length > 0 ? admrhData.filter(r => admrhFilter.includes(r.evento)) : admrhData;
    for (const row of admFiltered) {
      const compet = extractMMYYYY(row.referencia);
      if (!compet) continue;
      const sk = competToSortKey(compet);
      if (sk >= startSortKey && sk <= endSortKey) {
        const val = parseDecimalBR(row.valor);
        if (val !== 0) valueMap.set(compet, (valueMap.get(compet) || 0) + val);
      }
    }

    for (const row of averbacaoData) {
      const compet = extractMMYYYY(row.compet);
      if (!compet) continue;
      const sk = competToSortKey(compet);
      if (sk >= startSortKey && sk <= endSortKey) {
        const val = parseDecimalBR(row.valor);
        if (val !== 0) valueMap.set(compet, (valueMap.get(compet) || 0) + val);
      }
    }

    const allCompets = generateCompetencias(7, 1994, parseInt(endCompet.split('/')[0]), parseInt(endCompet.split('/')[1]));

    const isRppsPeriod = (compet: string): boolean => {
      if (!vinculoConfig.rppsEnabled) return false;
      const sk = competToSortKey(compet);
      return vinculoConfig.rppsPeriodos.some(p => {
        if (!p.de || !p.ate) return false;
        return sk >= competToSortKey(p.de) && sk <= competToSortKey(p.ate);
      });
    };

    const { map: indexMap, lastCompetSortKey } = buildIndexMap(indices);

    const rows: BaseJuncaoRow[] = allCompets.map((compet, i) => {
      const valor = valueMap.get(compet) || 0;
      const isRpps = isRppsPeriod(compet);
      const inTetoRange = isInTetoRange(compet);
      const teto = inTetoRange ? getTetoINSS(compet) : null;

      let valorFinal = valor;
      let isTeto = false;

      if (inTetoRange && teto && !isRpps && vinculoConfig.rgpsEnabled) {
        if (valor > teto) {
          valorFinal = teto;
          isTeto = true;
        }
      }

      const fator = getFatorAtualizacao(compet, indexMap, lastCompetSortKey);
      const valorAtualizado = valorFinal * fator;

      return { seq: i + 1, compet, valorOriginal: valor, tetoRef: teto, isTeto, isRpps, valorFinal, fatorAtualizacao: fator, valorAtualizado };
    });

    return rows;
  }, [sigpecData, sigpecFilter, admrhData, admrhFilter, averbacaoData, indices, tipoCalculo, vinculoConfig, endCompet]);

  const rowsWithValue = consolidatedRows.filter(r => r.valorFinal > 0);
  const totalCompets = consolidatedRows.length;

  // Cálculo especial 80%: BASE CALCULO FUNFIN de 03/2022 ÷ 31 × 18
  const funfinValue = useMemo(() => {
    if (tipoCalculo !== '80') return 0;
    const sigFiltered = sigpecFilter.length > 0 ? sigpecData.filter(r => sigpecFilter.includes(r.nomeAbreviado)) : sigpecData;
    const funfinRows = sigFiltered.filter(r => {
      const compet = extractMMYYYY(r.compet);
      return compet === '03/2022' && r.nomeAbreviado.toUpperCase().includes('BASE') && r.nomeAbreviado.toUpperCase().includes('FUNFIN');
    });
    return funfinRows.reduce((sum, r) => sum + parseDecimalBR(r.valor), 0);
  }, [sigpecData, sigpecFilter, tipoCalculo]);

  const funfinAdjusted = funfinValue > 0 ? (funfinValue / 31) * 18 : 0;

  const addPeriodo = (type: 'rgps' | 'rpps') => {
    const key = type === 'rgps' ? 'rgpsPeriodos' : 'rppsPeriodos';
    setTempVinculo({ ...tempVinculo, [key]: [...tempVinculo[key], { de: '', ate: '' }] });
  };

  const removePeriodo = (type: 'rgps' | 'rpps', idx: number) => {
    const key = type === 'rgps' ? 'rgpsPeriodos' : 'rppsPeriodos';
    setTempVinculo({ ...tempVinculo, [key]: tempVinculo[key].filter((_, i) => i !== idx) });
  };

  const updatePeriodo = (type: 'rgps' | 'rpps', idx: number, field: 'de' | 'ate', val: string) => {
    const key = type === 'rgps' ? 'rgpsPeriodos' : 'rppsPeriodos';
    const updated = [...tempVinculo[key]];
    updated[idx] = { ...updated[idx], [field]: val };
    setTempVinculo({ ...tempVinculo, [key]: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">BASE JUNÇÃO</h2>
          <p className="text-sm text-muted-foreground">Consolidação dos dados de Averbação, ADMRH e SIGPEC.</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Configurações</h3>
          <Button variant="outline" size="sm" onClick={() => { setTempVinculo(vinculoConfig); setShowVinculo(true); }} className="gap-2">
            <Settings className="w-4 h-4" /> Configurar Tipo de Vínculo
          </Button>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <Label className="text-xs text-muted-foreground">Competência Final</Label>
            <Select value={tipoCalculo} onValueChange={v => setTipoCalculo(v as '80' | '100')}>
              <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="80">01/03/2022 (80% maiores)</SelectItem>
                <SelectItem value="100">Até mês atual (100%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground mt-5">
            Meses com contribuição: <strong>{rowsWithValue.length}</strong>
            {tipoCalculo === '80' && <> — 80% = <strong>{Math.floor(rowsWithValue.length * 0.8)}</strong> meses</>}
          </div>
        </div>
        {tipoCalculo === '80' && funfinValue > 0 && (
          <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
            <strong>BASE CALCULO FUNFIN (03/2022):</strong> {formatBRL(funfinValue)} ÷ 31 × 18 = <strong>{formatBRL(funfinAdjusted)}</strong>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-auto max-h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead className="text-right">Teto Máx. INSS</TableHead>
              <TableHead></TableHead>
              <TableHead className="text-right">Valor Final</TableHead>
              <TableHead className="text-right">Fator Atualização</TableHead>
              <TableHead className="text-right">Valor Atualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consolidatedRows.map(row => (
              <TableRow key={row.compet} className={row.valorFinal === 0 ? 'text-muted-foreground' : ''}>
                <TableCell className="text-xs">{row.seq}</TableCell>
                <TableCell className="font-mono text-sm">{formatCompetAsDate(row.compet)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {row.tetoRef ? formatBRL(row.tetoRef) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {row.isTeto && <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">Teto</Badge>}
                    {row.isRpps && <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">RPPS</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{formatBRL(row.valorFinal)}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${row.fatorAtualizacao === 1 && indices.length > 0 ? 'text-orange-500' : ''}`}>{row.fatorAtualizacao.toFixed(6)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatBRL(row.valorAtualizado)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{totalCompets} competências — {rowsWithValue.length} com valor</p>

      <Dialog open={showVinculo} onOpenChange={setShowVinculo}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Configurar Tipo de Vínculo</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Informe os períodos RGPS (INSS) e/ou RPPS (Tempo Público) para o intervalo 07/1994 a 01/2015.</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <Checkbox checked={tempVinculo.rgpsEnabled} onCheckedChange={c => setTempVinculo({ ...tempVinculo, rgpsEnabled: !!c })} />
                <span className="text-sm font-medium">RGPS (INSS) — comparar com teto máximo</span>
              </label>
              {tempVinculo.rgpsEnabled && (
                <div className="pl-6 space-y-2">
                  <p className="text-xs text-muted-foreground">Períodos RGPS:</p>
                  {tempVinculo.rgpsPeriodos.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input placeholder="mm/aaaa" value={p.de} onChange={e => updatePeriodo('rgps', i, 'de', e.target.value)} className="w-28 text-xs" />
                      <span className="text-xs">até</span>
                      <Input placeholder="mm/aaaa" value={p.ate} onChange={e => updatePeriodo('rgps', i, 'ate', e.target.value)} className="w-28 text-xs" />
                      <Button variant="ghost" size="icon" onClick={() => removePeriodo('rgps', i)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addPeriodo('rgps')} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Adicionar período</Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <Checkbox checked={tempVinculo.rppsEnabled} onCheckedChange={c => setTempVinculo({ ...tempVinculo, rppsEnabled: !!c })} />
                <span className="text-sm font-medium">RPPS (Tempo Público) — manter valor informado</span>
              </label>
              {tempVinculo.rppsEnabled && (
                <div className="pl-6 space-y-2">
                  <p className="text-xs text-muted-foreground">Períodos RPPS:</p>
                  {tempVinculo.rppsPeriodos.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input placeholder="mm/aaaa" value={p.de} onChange={e => updatePeriodo('rpps', i, 'de', e.target.value)} className="w-28 text-xs" />
                      <span className="text-xs">até</span>
                      <Input placeholder="mm/aaaa" value={p.ate} onChange={e => updatePeriodo('rpps', i, 'ate', e.target.value)} className="w-28 text-xs" />
                      <Button variant="ghost" size="icon" onClick={() => removePeriodo('rpps', i)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addPeriodo('rpps')} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Adicionar período</Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVinculo(false)}>Cancelar</Button>
            <Button onClick={() => { setVinculoConfig(tempVinculo); setShowVinculo(false); toast.success('Configuração salva!'); }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
