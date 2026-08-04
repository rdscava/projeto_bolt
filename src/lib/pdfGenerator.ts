interface PdfRow {
  seq: number;
  mes: number;
  ano: number;
  valor: number;
  fator: number;
  atualizada: number;
  excluded?: boolean;
}

interface PdfRubrica {
  codigo: string;
  descricao: string;
  valor: number;
  proporcional: number;
}

interface PdfInput {
  servidorNome: string;
  servidorRf: string;
  servidorCargo: string;
  servidorRef: string;
  servidorRelacaoJurAdm: string;
  servidorJornada: string;
  servidorSetor: string;
  tipo: '80%' | '100%';
  // 80%
  sexo?: string;
  tempoExcedente?: number;
  coeficiente?: number;
  percentual?: number;
  rubricas?: PdfRubrica[];
  mediaProporcional?: number;
  // 100%
  tipoAposentadoria?: string;
  porcentagemBase?: number;
  mediaTimesBase?: number;
  // common
  media: number;
  valorFinal: number;
  allRows: PdfRow[];
  totalContrib: number;
  numMeses: number;
  somaMaiores: number;
  dataInicio: string;
  dataFim: string;
}

const e = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function generatePdfHtml(input: PdfInput): string {
  const is80 = input.tipo === '80%';
  const perc = input.percentual ?? 0;
  const today = new Date().toLocaleDateString('pt-BR');

  const rubricasHtml = is80 && input.rubricas
    ? input.rubricas.map(r =>
        `<tr><td>${e(r.codigo)}</td><td>${e(r.descricao)}</td><td class="r">R$ ${fmt(r.valor)}</td><td class="r">R$ ${fmt(r.proporcional)}</td></tr>`
      ).join('')
    : '';

  const totalValor = input.rubricas?.reduce((s, r) => s + r.valor, 0) ?? 0;
  const totalProp = input.rubricas?.reduce((s, r) => s + r.proporcional, 0) ?? 0;

  const calcRows = [...input.allRows].sort((a, b) => (a.ano * 100 + a.mes) - (b.ano * 100 + b.mes));
  const calcHtml = calcRows.map(r => {
    const cls = r.excluded ? ' class="excl"' : '';
    return `<tr${cls}><td>${r.seq}</td><td>${String(r.mes).padStart(2, '0')}</td><td>${r.ano}</td><td class="r">R$ ${fmt(r.valor)}</td><td class="r">${r.fator.toFixed(6)}</td><td class="r">R$ ${fmt(r.atualizada)}</td></tr>`;
  }).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Demonstrativo do Cálculo de Aposentadoria</title>
<style>
  @page {
    size: A4;
    margin: 18mm 20mm 20mm 20mm;
    @top-left { content: "DEMONSTRATIVO DO CÁLCULO DE APOSENTADORIA"; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 7.5pt; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 100%; padding-bottom: 4px; }
    @bottom-center { content: "Página " counter(page) " de " counter(pages); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 7.5pt; color: #94a3b8; }
  }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; font-size: 9pt; margin: 0; padding: 0; }
  h1 { font-size: 16pt; font-weight: 700; color: #1e4d8c; margin: 0 0 6px; letter-spacing: -0.3px; }
  .subtitle { font-size: 9pt; color: #64748b; margin-bottom: 24px; }
  h2 { font-size: 10.5pt; font-weight: 600; color: #1e4d8c; margin: 22px 0 10px; padding-bottom: 5px; border-bottom: 1.5px solid #1e4d8c; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 32px; margin-bottom: 14px; }
  .info-grid dt { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0; padding-top: 8px; }
  .info-grid dd { font-size: 9.5pt; font-weight: 700; margin: 0 0 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 14px; font-variant-numeric: tabular-nums; }
  th { text-align: left; font-size: 7.5pt; font-weight: 600; color: #475569; border-bottom: 1.5px solid #cbd5e1; padding: 7px 8px 7px 0; }
  td { padding: 5px 8px 5px 0; border-bottom: 1px solid #f1f5f9; }
  .r { text-align: right; }
  tr.total td { font-weight: 700; border-top: 1.5px solid #1e4d8c; border-bottom: none; }
  tr.excl td { color: #94a3b8; }
  .highlight { background: #eff6ff; border-left: 3px solid #1e4d8c; padding: 10px 14px; margin: 10px 0 18px; border-radius: 2px; }
  .highlight strong { color: #1e4d8c; font-size: 10pt; }
</style>
<script>window.onload = () => { window.focus(); window.print(); }</script>
</head>
<body>
<h1>DEMONSTRATIVO DO CÁLCULO DE APOSENTADORIA</h1>
<div class="subtitle">Prefeitura do Município de São Paulo — Emitido em: ${today}</div>

<h2>DADOS DO SERVIDOR</h2>
<dl class="info-grid">
  <div><dt>Nome</dt><dd>${e(input.servidorNome)}</dd></div>
  <div><dt>RF</dt><dd>${e(input.servidorRf)}</dd></div>
  <div><dt>Cargo</dt><dd>${e(input.servidorCargo)}</dd></div>
  <div><dt>Referência</dt><dd>${e(input.servidorRef)}</dd></div>
  <div><dt>Relação Jur-Adm</dt><dd>${e(input.servidorRelacaoJurAdm)}</dd></div>
  <div><dt>Jornada</dt><dd>${e(input.servidorJornada)}</dd></div>
  <div class="col-span-2"><dt>Nome do Setor</dt><dd>${e(input.servidorSetor)}</dd></div>
</dl>

${is80 ? `
<h2>DEMONSTRATIVO — 80%</h2>
<dl class="info-grid">
  <div><dt>Sexo</dt><dd>${e(input.sexo)}</dd></div>
  <div><dt>Tempo (em dias)</dt><dd>${input.tempoExcedente ?? 0}</dd></div>
  <div><dt>Coeficiente</dt><dd>${(input.coeficiente ?? 0).toFixed(7)}</dd></div>
  <div><dt>Percentual</dt><dd>${perc.toFixed(2)}%</dd></div>
</dl>
<table>
  <thead><tr><th>Cód</th><th>Descrição</th><th class="r">Valor</th><th class="r">Proporcional</th></tr></thead>
  <tbody>${rubricasHtml}</tbody>
  <tr class="total"><td colspan="2">TOTAL</td><td class="r">R$ ${fmt(totalValor)}</td><td class="r">R$ ${fmt(totalProp)}</td></tr>
</table>
<table>
  <thead><tr><th>Rubrica</th><th>Descrição</th><th class="r">Média</th><th class="r">Proporcional (${perc.toFixed(2)}%)</th></tr></thead>
  <tbody><tr><td>167</td><td>Valor dos Proventos</td><td class="r">R$ ${fmt(input.media)}</td><td class="r">R$ ${fmt(input.mediaProporcional ?? 0)}</td></tr></tbody>
</table>
<div class="highlight"><strong>Valor a Ser Utilizado: R$ ${fmt(input.valorFinal)}</strong></div>
` : `
<h2>DEMONSTRATIVO — 100%</h2>
<dl class="info-grid">
  <div><dt>Tipo de Aposentadoria</dt><dd>${e(input.tipoAposentadoria)}</dd></div>
  <div><dt>Porcentagem Base</dt><dd>${(input.porcentagemBase ?? 0).toFixed(2)}%</dd></div>
</dl>
<table>
  <thead><tr><th>Rubrica</th><th>Descrição</th><th class="r">Média</th><th class="r">Média × % Base</th></tr></thead>
  <tbody><tr><td>167</td><td>Valor dos Proventos</td><td class="r">R$ ${fmt(input.media)}</td><td class="r">R$ ${fmt(input.mediaTimesBase ?? 0)}</td></tr></tbody>
</table>
<div class="highlight"><strong>Valor Final: R$ ${fmt(input.valorFinal)}</strong></div>
`}

${calcRows.length > 0 ? `
<h2>CÁLCULO</h2>
<table>
  <thead><tr><th>Seq</th><th>Mês</th><th>Ano</th><th class="r">Valor</th><th class="r">Fator</th><th class="r">Atualizada</th></tr></thead>
  <tbody>${calcHtml}</tbody>
</table>

<h2>RESUMO</h2>
<dl class="info-grid">
  <div><dt>Total Meses</dt><dd>${input.totalContrib}</dd></div>
  <div><dt>Meses Considerados</dt><dd>${input.numMeses}</dd></div>
  <div><dt>Soma Maiores</dt><dd>R$ ${fmt(input.somaMaiores)}</dd></div>
</dl>
<div class="highlight"><strong>Média: R$ ${fmt(input.media)}</strong></div>
` : ''}
</body>
</html>`;
}
