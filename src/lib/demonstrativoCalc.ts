import type { Simulation, MediaRow } from '../types';
import { parseDecimalBR, extractMMYYYY, competToSortKey, generateCompetencias } from './format';
import { getTetoINSS, isInTetoRange } from '../data/teto-inss';

export interface DemonstrativoResult {
  media: number;
  numMeses: number;
  totalContrib: number;
  somaMaiores: number;
  displayRows: MediaRow[];
  dataInicio: string;
  dataFim: string;
  coeficiente: number;
  percentual: number;
  totalRubricas: number;
  totalProporcional: number;
  mediaProporcional: number;
  mediaTimesBase: number;
  valorFinal: number;
}

export function calcDemonstrativo(sim: Simulation): DemonstrativoResult {
  const { tipoCalculo, indices, sigpecBase, admrh, averbacao, vinculoConfig, demonstrativo } = sim;

  const endCompet = tipoCalculo === '80' ? '03/2022' : (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  })();
  const startSortKey = competToSortKey('07/1994');
  const endSortKey = competToSortKey(endCompet);
  const valueMap = new Map<string, number>();

  const sigFiltered = sigpecBase.filter.length > 0
    ? sigpecBase.data.filter(r => sigpecBase.filter.includes(r.nomeAbreviado))
    : sigpecBase.data;
  for (const row of sigFiltered) {
    const c = extractMMYYYY(row.compet);
    const sk = competToSortKey(c);
    if (sk >= startSortKey && sk <= endSortKey) valueMap.set(c, (valueMap.get(c) || 0) + parseDecimalBR(row.valor));
  }

  const admFiltered = admrh.filter.length > 0
    ? admrh.data.filter(r => admrh.filter.includes(r.evento))
    : admrh.data;
  for (const row of admFiltered) {
    const c = extractMMYYYY(row.referencia);
    if (!c) continue;
    const sk = competToSortKey(c);
    if (sk >= startSortKey && sk <= endSortKey) valueMap.set(c, (valueMap.get(c) || 0) + parseDecimalBR(row.valor));
  }
  for (const row of averbacao.data) {
    const c = extractMMYYYY(row.compet);
    const sk = competToSortKey(c);
    if (sk >= startSortKey && sk <= endSortKey) valueMap.set(c, (valueMap.get(c) || 0) + parseDecimalBR(row.valor));
  }

  const isRppsPeriod = (compet: string) => {
    if (!vinculoConfig.rppsEnabled) return false;
    const sk = competToSortKey(compet);
    return vinculoConfig.rppsPeriodos.some(p => p.de && p.ate && sk >= competToSortKey(p.de) && sk <= competToSortKey(p.ate));
  };

  const indexMap = new Map(indices.map(i => [extractMMYYYY(i.compet), i.indice]));
  const allCompets = generateCompetencias(7, 1994, parseInt(endCompet.split('/')[0]), parseInt(endCompet.split('/')[1]));
  const withValues: { compet: string; valor: number }[] = [];
  for (const compet of allCompets) {
    let valor = valueMap.get(compet) || 0;
    if (valor <= 0) continue;
    if (isInTetoRange(compet) && !isRppsPeriod(compet) && vinculoConfig.rgpsEnabled) {
      const teto = getTetoINSS(compet);
      if (teto && valor > teto) valor = teto;
    }
    withValues.push({ compet, valor });
  }

  const rows: MediaRow[] = withValues.map((item, i) => {
    const [mm, yyyy] = item.compet.split('/');
    const fator = indexMap.get(item.compet) || 1;
    return { seq: i + 1, mes: parseInt(mm), ano: parseInt(yyyy), valor: item.valor, fatorAtualizacao: fator, vantagemAtualizada: item.valor * fator };
  });

  const tc = rows.length;
  const nm = tipoCalculo === '80' ? Math.floor(tc * 0.8) : tc;
  const sorted = [...rows].sort((a, b) => b.vantagemAtualizada - a.vantagemAtualizada);
  const top = tipoCalculo === '80' ? sorted.slice(0, nm) : sorted;
  const display = [...top].sort((a, b) => (a.ano * 100 + a.mes) - (b.ano * 100 + b.mes)).map((r, i) => ({ ...r, seq: i + 1 }));
  const sm = top.reduce((s, r) => s + r.vantagemAtualizada, 0);
  const m = nm > 0 ? sm / nm : 0;
  const di = display.length > 0 ? `${String(display[0].mes).padStart(2, '0')}/${display[0].ano}` : '-';
  const df = display.length > 0 ? `${String(display[display.length - 1].mes).padStart(2, '0')}/${display[display.length - 1].ano}` : '-';

  const coeficiente = demonstrativo.sexo === 'MULHER' ? 0.0091324 : 0.0087671;
  const percentual = demonstrativo.tempoExcedente * coeficiente;
  const totalRubricas = demonstrativo.rubricas80.reduce((s, r) => s + r.valor, 0);
  const percFraction = percentual / 100;
  const totalProporcional = demonstrativo.rubricas80.reduce((s, r) => s + r.valor * percFraction, 0);
  const mediaProporcional = m * percFraction;
  const valorFinal80 = Math.min(totalProporcional, mediaProporcional);
  const mediaTimesBase = m * (demonstrativo.porcentagemBase / 100);
  const valorFinal100 = mediaTimesBase;
  const valorFinal = tipoCalculo === '80' ? valorFinal80 : valorFinal100;

  return {
    media: m, numMeses: nm, totalContrib: tc, somaMaiores: sm,
    displayRows: display, dataInicio: di, dataFim: df,
    coeficiente, percentual, totalRubricas, totalProporcional,
    mediaProporcional, mediaTimesBase, valorFinal,
  };
}
