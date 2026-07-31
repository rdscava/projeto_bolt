import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import ServidorHeader from '../components/ServidorHeader';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBRL, formatNumber, parseDecimalBR, extractMMYYYY, competToSortKey, generateCompetencias } from '../lib/format';
import { getTetoINSS, isInTetoRange } from '../data/teto-inss';
import type { MediaRow } from '../types';

export default function MediaAposentadoria() {
  const { tipoCalculo, setTipoCalculo, sigpecData, sigpecFilter, admrhData, admrhFilter, averbacaoData, indices, vinculoConfig } = useAppContext();

  const endCompet = tipoCalculo === '80' ? '03/2022' : (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  })();

  const mediaRows = useMemo(() => {
    const startSortKey = competToSortKey('07/1994');
    const endSortKey = competToSortKey(endCompet);
    const valueMap = new Map<string, number>();

    const sigFiltered = sigpecFilter.length > 0 ? sigpecData.filter(r => sigpecFilter.includes(r.nomeAbreviado)) : sigpecData;
    for (const row of sigFiltered) {
      const compet = extractMMYYYY(row.compet);
      const sk = competToSortKey(compet);
      if (sk >= startSortKey && sk <= endSortKey) {
        valueMap.set(compet, (valueMap.get(compet) || 0) + parseDecimalBR(row.valor));
      }
    }
    const admFiltered = admrhFilter.length > 0 ? admrhData.filter(r => admrhFilter.includes(r.evento)) : admrhData;
    for (const row of admFiltered) {
      const compet = extractMMYYYY(row.referencia);
      if (!compet) continue;
      const sk = competToSortKey(compet);
      if (sk >= startSortKey && sk <= endSortKey) {
        valueMap.set(compet, (valueMap.get(compet) || 0) + parseDecimalBR(row.valor));
      }
    }
    for (const row of averbacaoData) {
      const compet = extractMMYYYY(row.compet);
      const sk = competToSortKey(compet);
      if (sk >= startSortKey && sk <= endSortKey) {
        valueMap.set(compet, (valueMap.get(compet) || 0) + parseDecimalBR(row.valor));
      }
    }

    const isRppsPeriod = (compet: string): boolean => {
      if (!vinculoConfig.rppsEnabled) return false;
      const sk = competToSortKey(compet);
      return vinculoConfig.rppsPeriodos.some(p => p.de && p.ate && sk >= competToSortKey(p.de) && sk <= competToSortKey(p.ate));
    };

    const indexMap = new Map<string, number>();
    for (const idx of indices) {
      const normalizedCompet = extractMMYYYY(idx.compet);
      indexMap.set(normalizedCompet, idx.indice);
    }

    const allCompets = generateCompetencias(7, 1994, parseInt(endCompet.split('/')[0]), parseInt(endCompet.split('/')[1]));
    const withValues: { compet: string; valor: number }[] = [];

    for (const compet of allCompets) {
      let valor = valueMap.get(compet) || 0;
      if (valor <= 0) continue;
      const isRpps = isRppsPeriod(compet);
      if (isInTetoRange(compet) && !isRpps && vinculoConfig.rgpsEnabled) {
        const teto = getTetoINSS(compet);
        if (teto && valor > teto) valor = teto;
      }
      withValues.push({ compet, valor });
    }

    const rows: MediaRow[] = withValues.map((item, i) => {
      const [mm, yyyy] = item.compet.split('/');
      const fator = indexMap.get(item.compet) || 1;
      return {
        seq: i + 1, mes: parseInt(mm), ano: parseInt(yyyy),
        valor: item.valor, fatorAtualizacao: fator,
        vantagemAtualizada: item.valor * fator,
      };
    });

    return rows;
  }, [sigpecData, sigpecFilter, admrhData, admrhFilter, averbacaoData, indices, tipoCalculo, vinculoConfig, endCompet]);

  const totalContrib = mediaRows.length;
  const numMeses = tipoCalculo === '80' ? Math.floor(totalContrib * 0.8) : totalContrib;

  const sortedRows = useMemo(() => {
    const sorted = [...mediaRows].sort((a, b) => b.vantagemAtualizada - a.vantagemAtualizada);
    return tipoCalculo === '80' ? sorted.slice(0, numMeses) : sorted;
  }, [mediaRows, tipoCalculo, numMeses]);

  const displayRows = useMemo(() => {
    return [...sortedRows].sort((a, b) => (a.ano * 100 + a.mes) - (b.ano * 100 + b.mes)).map((r, i) => ({ ...r, seq: i + 1 }));
  }, [sortedRows]);

  const somaMaiores = sortedRows.reduce((s, r) => s + r.vantagemAtualizada, 0);
  const media = numMeses > 0 ? somaMaiores / numMeses : 0;

  const dataInicio = displayRows.length > 0 ? `${String(displayRows[0].mes).padStart(2, '0')}/${displayRows[0].ano}` : '-';
  const dataFim = displayRows.length > 0 ? `${String(displayRows[displayRows.length - 1].mes).padStart(2, '0')}/${displayRows[displayRows.length - 1].ano}` : '-';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Média Aposentadoria</h2>
        <p className="text-sm text-muted-foreground">Cálculo final com índices de atualização aplicados.</p>
      </div>

      <ServidorHeader />

      <div className="rounded-lg border border-border bg-card p-4">
        <RadioGroup value={tipoCalculo} onValueChange={v => setTipoCalculo(v as '80' | '100')} className="flex gap-6">
          <div className="flex items-center gap-2"><RadioGroupItem value="100" id="t100" /><Label htmlFor="t100">100% (Competência Atual)</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="80" id="t80" /><Label htmlFor="t80">80% (até 01/03/2022)</Label></div>
        </RadioGroup>
      </div>

      {indices.length === 0 && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-4 text-sm text-orange-700 dark:text-orange-400">
          Nenhum índice de atualização carregado. Importe os índices na tela <strong>Índices</strong> para que os fatores de atualização sejam aplicados.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Seq</TableHead>
              <TableHead>Mês</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Fator Atualização</TableHead>
              <TableHead className="text-right">Vantagem Atualizada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map(row => (
              <TableRow key={`${row.mes}-${row.ano}`}>
                <TableCell>{row.seq}</TableCell>
                <TableCell>{row.mes}</TableCell>
                <TableCell>{row.ano}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(row.valor)}</TableCell>
                <TableCell className={`text-right font-mono ${row.fatorAtualizacao === 1 && indices.length > 0 ? 'text-orange-500' : ''}`}>{row.fatorAtualizacao.toFixed(6)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(row.vantagemAtualizada)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h3 className="font-bold">RESUMO — MÉDIA APOSENTADORIA {tipoCalculo === '80' ? '80%' : '100%'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Tempo de contribuição total (meses)</span>
            <strong>{totalContrib}</strong>
          </div>
          {tipoCalculo === '80' && (
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Fração de 80% (meses)</span>
              <strong>{totalContrib}</strong>
            </div>
          )}
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Número de meses a considerar</span>
            <strong>{numMeses}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-muted-foreground">Soma dos {numMeses} maiores salários atualizados</span>
            <strong>{formatBRL(somaMaiores)}</strong>
          </div>
        </div>
        <div className="bg-primary/5 p-4 rounded-lg flex justify-between items-center">
          <span className="font-bold">Média aritmética dos {numMeses} maiores salários de contribuição atualizados</span>
          <span className="text-xl font-bold text-primary">{formatBRL(media)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between py-1"><span className="text-muted-foreground">Data Início</span><strong>{dataInicio}</strong></div>
          <div className="flex justify-between py-1"><span className="text-muted-foreground">Data Fim</span><strong>{dataFim}</strong></div>
        </div>
      </div>
    </div>
  );
}
