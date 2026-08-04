import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import ServidorHeader from '../components/ServidorHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Save, FileDown, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { RUBRICAS_80, TIPOS_APOSENTADORIA } from '../data/rubricas';
import { formatBRL, parseDecimalBR, extractMMYYYY, competToSortKey, generateCompetencias } from '../lib/format';
import { getTetoINSS, isInTetoRange } from '../data/teto-inss';
import { createSimulation, updateSimulation } from '../services/simulacaoService';
import { generatePdfHtml } from '../lib/pdfGenerator';
import type { MediaRow, Simulation } from '../types';

export default function Demonstrativo() {
  const ctx = useAppContext();
  const { servidor, tipoCalculo, setTipoCalculo, sexo, setSexo, tempoExcedente, setTempoExcedente, rubricas80, setRubricas80, porcentagemBase, setPorcentagemBase, tipoAposentadoria, setTipoAposentadoria, indices, sigpecData, sigpecFilter, admrhData, admrhFilter, averbacaoData, vinculoConfig, clearAll, setSimulacaoSalva, simulacaoSalva } = ctx;

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { media, numMeses, totalContrib, somaMaiores, displayRows, dataInicio, dataFim } = useMemo(() => {
    const endCompet = tipoCalculo === '80' ? '03/2022' : (() => { const now = new Date(); return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`; })();
    const startSortKey = competToSortKey('07/1994');
    const endSortKey = competToSortKey(endCompet);
    const valueMap = new Map<string, number>();

    const sigFiltered = sigpecFilter.length > 0 ? sigpecData.filter(r => sigpecFilter.includes(r.nomeAbreviado)) : sigpecData;
    for (const row of sigFiltered) { const c = extractMMYYYY(row.compet); const sk = competToSortKey(c); if (sk >= startSortKey && sk <= endSortKey) valueMap.set(c, (valueMap.get(c) || 0) + parseDecimalBR(row.valor)); }
    const admFiltered = admrhFilter.length > 0 ? admrhData.filter(r => admrhFilter.includes(r.evento)) : admrhData;
    for (const row of admFiltered) { const c = extractMMYYYY(row.referencia); if (!c) continue; const sk = competToSortKey(c); if (sk >= startSortKey && sk <= endSortKey) valueMap.set(c, (valueMap.get(c) || 0) + parseDecimalBR(row.valor)); }
    for (const row of averbacaoData) { const c = extractMMYYYY(row.compet); const sk = competToSortKey(c); if (sk >= startSortKey && sk <= endSortKey) valueMap.set(c, (valueMap.get(c) || 0) + parseDecimalBR(row.valor)); }

    const isRppsPeriod = (compet: string) => { if (!vinculoConfig.rppsEnabled) return false; const sk = competToSortKey(compet); return vinculoConfig.rppsPeriodos.some(p => p.de && p.ate && sk >= competToSortKey(p.de) && sk <= competToSortKey(p.ate)); };
    const indexMap = new Map(indices.map(i => [extractMMYYYY(i.compet), i.indice]));
    const allCompets = generateCompetencias(7, 1994, parseInt(endCompet.split('/')[0]), parseInt(endCompet.split('/')[1]));
    const withValues: { compet: string; valor: number }[] = [];
    for (const compet of allCompets) {
      let valor = valueMap.get(compet) || 0;
      if (valor <= 0) continue;
      if (isInTetoRange(compet) && !isRppsPeriod(compet) && vinculoConfig.rgpsEnabled) { const teto = getTetoINSS(compet); if (teto && valor > teto) valor = teto; }
      withValues.push({ compet, valor });
    }
    const rows: MediaRow[] = withValues.map((item, i) => { const [mm, yyyy] = item.compet.split('/'); const fator = indexMap.get(item.compet) || 1; return { seq: i + 1, mes: parseInt(mm), ano: parseInt(yyyy), valor: item.valor, fatorAtualizacao: fator, vantagemAtualizada: item.valor * fator }; });
    const tc = rows.length;
    const nm = tipoCalculo === '80' ? Math.floor(tc * 0.8) : tc;
    const sorted = [...rows].sort((a, b) => b.vantagemAtualizada - a.vantagemAtualizada);
    const top = tipoCalculo === '80' ? sorted.slice(0, nm) : sorted;
    const display = [...top].sort((a, b) => (a.ano * 100 + a.mes) - (b.ano * 100 + b.mes)).map((r, i) => ({ ...r, seq: i + 1 }));
    const sm = top.reduce((s, r) => s + r.vantagemAtualizada, 0);
    const m = nm > 0 ? sm / nm : 0;
    const di = display.length > 0 ? `${String(display[0].mes).padStart(2, '0')}/${display[0].ano}` : '-';
    const df = display.length > 0 ? `${String(display[display.length - 1].mes).padStart(2, '0')}/${display[display.length - 1].ano}` : '-';
    return { media: m, numMeses: nm, totalContrib: tc, somaMaiores: sm, displayRows: display, dataInicio: di, dataFim: df };
  }, [tipoCalculo, sigpecData, sigpecFilter, admrhData, admrhFilter, averbacaoData, indices, vinculoConfig]);

  // Cálculos 80%
  const coeficiente = sexo === 'MULHER' ? 0.0091324 : 0.0087671;
  const percentual = tempoExcedente * coeficiente;
  const totalRubricas = rubricas80.reduce((s, r) => s + r.valor, 0);
  const percFraction = percentual / 100;
  const totalProporcional = rubricas80.reduce((s, r) => s + r.valor * percFraction, 0);
  const mediaProporcional = media * percFraction;
  const valorFinal80 = Math.min(totalProporcional, mediaProporcional);

  // Cálculos 100%
  const mediaTimesBase = media * (porcentagemBase / 100);
  const valorFinal100 = mediaTimesBase;

  const valorFinal = tipoCalculo === '80' ? valorFinal80 : valorFinal100;

  const addRubrica = () => {
    setRubricas80([...rubricas80, { id: `r_${Date.now()}`, codigo: '', descricao: '', valor: 0 }]);
  };

  const updateRubrica = (id: string, field: string, val: string | number) => {
    setRubricas80(rubricas80.map(r => {
      if (r.id !== id) return r;
      if (field === 'rubrica') {
        const found = RUBRICAS_80.find(o => o.codigo === val);
        return { ...r, codigo: val as string, descricao: found?.descricao || '' };
      }
      return { ...r, [field]: val };
    }));
  };

  const removeRubrica = (id: string) => setRubricas80(rubricas80.filter(r => r.id !== id));

  const handleSave = async () => {
    if (!servidor) { toast.error('Selecione um servidor'); return; }
    const sim = ctx.activeSimulation;
    if (!sim) { toast.error('Nenhuma simulação ativa'); return; }
    setSaving(true);
    try {
      const updated: Simulation = {
        ...sim,
        servidor,
        tipoCalculo,
        indices,
        sigpecBase: { data: sigpecData, filter: sigpecFilter },
        admrh: { data: admrhData, filter: admrhFilter },
        averbacao: { data: averbacaoData },
        vinculoConfig,
        demonstrativo: { sexo, tempoExcedente, rubricas80, porcentagemBase, tipoAposentadoria },
        dataUltimaAlteracao: new Date().toISOString(),
      };
      if (sim.id) {
        await updateSimulation(sim.id, updated, media, valorFinal);
        ctx.updateSimulation(updated);
      } else {
        const newId = await createSimulation(updated, media, valorFinal);
        ctx.updateSimulation({ ...updated, id: newId });
      }
      setSimulacaoSalva(true);
      toast.success('Simulação salva!');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  // Auto-save: when there's an active simulation with an ID and unsaved changes, debounce-save.
  useEffect(() => {
    const sim = ctx.activeSimulation;
    if (!sim || !sim.id || simulacaoSalva) return;
    if (!servidor) return;
    const timer = setTimeout(() => { handleSave(); }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigpecData, sigpecFilter, admrhData, admrhFilter, averbacaoData, indices, vinculoConfig, rubricas80, sexo, tempoExcedente, porcentagemBase, tipoAposentadoria, tipoCalculo, servidor]);

  const handleExport = () => {
    if (!servidor) { toast.error('Selecione um servidor'); return; }
    setExporting(true);
    try {
      const html = generatePdfHtml({
        servidorNome: servidor.nome,
        servidorRf: servidor.rf,
        servidorCargo: servidor.cargo,
        servidorRef: servidor.referencia,
        servidorRelacaoJurAdm: servidor.relacaoJurAdm,
        servidorJornada: servidor.jornada,
        servidorSetor: servidor.nomeSetor,
        tipo: tipoCalculo === '80' ? '80%' : '100%',
        sexo: tipoCalculo === '80' ? sexo : undefined,
        tempoExcedente: tipoCalculo === '80' ? tempoExcedente : undefined,
        coeficiente: tipoCalculo === '80' ? coeficiente : undefined,
        percentual: tipoCalculo === '80' ? percentual : undefined,
        rubricas: tipoCalculo === '80' ? rubricas80.map(r => ({ codigo: r.codigo, descricao: r.descricao, valor: r.valor, proporcional: r.valor * percFraction })) : undefined,
        media,
        mediaProporcional: tipoCalculo === '80' ? mediaProporcional : undefined,
        valorFinal,
        porcentagemBase: tipoCalculo === '100' ? porcentagemBase : undefined,
        tipoAposentadoria: tipoCalculo === '100' ? tipoAposentadoria : undefined,
        mediaTimesBase: tipoCalculo === '100' ? mediaTimesBase : undefined,
        allRows: displayRows.map(r => ({ seq: r.seq, mes: r.mes, ano: r.ano, valor: r.valor, fator: r.fatorAtualizacao, atualizada: r.vantagemAtualizada })),
        totalContrib,
        numMeses,
        somaMaiores,
        dataInicio,
        dataFim,
      });
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) { toast.error('Permita pop-ups para exportar o PDF'); return; }
      toast.success('Abrindo janela de impressão. Use "Salvar como PDF".');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { toast.error('Erro ao exportar PDF'); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">DEMONSTRATIVO</h2>
          <p className="text-sm text-muted-foreground">Demonstrativo de cálculo dos proventos de aposentadoria.</p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-destructive border-destructive/30"><Trash2 className="w-4 h-4" /> Limpar Dados</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Limpar Todos os Dados?</AlertDialogTitle><AlertDialogDescription>Todos os dados de todas as telas (SIGPEC, ADMRH, Averbação, configurações) serão apagados. Os índices de atualização não serão afetados. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { clearAll(); toast.success('Dados limpos!'); }}>Limpar Tudo</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> Salvar Simulação</Button>
          <Button onClick={handleExport} disabled={exporting} className="gap-2"><FileDown className="w-4 h-4" /> Exportar PDF</Button>
        </div>
      </div>

      <ServidorHeader />

      <div className="rounded-lg border border-border bg-card p-4">
        <RadioGroup value={tipoCalculo} onValueChange={v => setTipoCalculo(v as '80' | '100')} className="flex gap-6">
          <div className="flex items-center gap-2"><RadioGroupItem value="100" id="d100" /><Label htmlFor="d100">100% (Competência Atual)</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="80" id="d80" /><Label htmlFor="d80">80% (até 01/03/2022)</Label></div>
        </RadioGroup>
      </div>

      {tipoCalculo === '100' ? (
        <>
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Configurações — 100% (Competência Atual)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Porcentagem Base de Cálculo</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={porcentagemBase || ''} onChange={e => setPorcentagemBase(parseFloat(e.target.value) || 0)} className="w-32" step="0.01" />
                  <span className="text-sm">%</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Tipo de Aposentadoria</Label>
                <Select value={tipoAposentadoria} onValueChange={setTipoAposentadoria}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_APOSENTADORIA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Proventos —</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Rubrica</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Média</TableHead><TableHead className="text-right">Média × % Base</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">167</TableCell>
                  <TableCell>Valor dos Proventos</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(media)}</TableCell>
                  <TableCell className="text-right font-mono">{porcentagemBase > 0 ? formatBRL(mediaTimesBase) : '–'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Configurações — 80% (até 01/03/2022)</h3>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Sexo</Label>
                <RadioGroup value={sexo} onValueChange={v => setSexo(v as 'HOMEM' | 'MULHER')} className="flex gap-4 mt-1">
                  <div className="flex items-center gap-1"><RadioGroupItem value="HOMEM" id="sh" /><Label htmlFor="sh">HOMEM</Label></div>
                  <div className="flex items-center gap-1"><RadioGroupItem value="MULHER" id="sm" /><Label htmlFor="sm">MULHER</Label></div>
                </RadioGroup>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Tempo (em dias)</Label>
                <Input type="number" value={tempoExcedente || ''} onChange={e => setTempoExcedente(parseInt(e.target.value) || 0)} className="w-32" />
              </div>
              <div className="bg-primary/5 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Coeficiente ({sexo.toLowerCase()})</p>
                <p className="text-lg font-bold font-mono">{coeficiente.toFixed(7)}</p>
                <p className="text-xs text-muted-foreground">Percentual calculado</p>
                <p className="text-lg font-bold text-primary">{percentual.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Rubricas e Valores</h3>
              <Button variant="outline" size="sm" onClick={addRubrica} className="gap-1"><Plus className="w-3 h-3" /> Adicionar Rubrica</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rubrica</TableHead>
                  <TableHead className="text-right">Valor (R$)</TableHead>
                  <TableHead className="text-right">Proporcional ({percentual.toFixed(2)}%)</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rubricas80.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Select value={r.codigo} onValueChange={v => updateRubrica(r.id, 'rubrica', v)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{RUBRICAS_80.map(o => <SelectItem key={o.codigo} value={o.codigo}>{o.codigo} — {o.descricao}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" step="0.01" value={r.valor || ''} onChange={e => updateRubrica(r.id, 'valor', parseFloat(e.target.value) || 0)} className="text-right w-32 ml-auto" /></TableCell>
                    <TableCell className="text-right font-mono text-primary">{formatBRL(r.valor * percFraction)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeRubrica(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(totalRubricas)}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(totalProporcional)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Rubrica 167 — Valor dos Proventos</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Rubrica</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Média</TableHead><TableHead className="text-right">Proporcional ({percentual.toFixed(2)}%)</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">167</TableCell>
                  <TableCell>Valor dos Proventos</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(media)}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(mediaProporcional)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Valor a Ser Utilizado (Menor Entre os Dois)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Proporcional (Rubricas)</p>
                <p className="text-lg font-bold font-mono">{formatBRL(totalProporcional)}</p>
              </div>
              <div className="bg-card p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">Proporcional Rubrica 167</p>
                <p className="text-lg font-bold font-mono">{formatBRL(mediaProporcional)}</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary/30">
                <p className="text-xs text-primary font-medium">Valor a Ser Utilizado</p>
                <p className="text-xl font-bold text-primary font-mono">{formatBRL(valorFinal80)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
