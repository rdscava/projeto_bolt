import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const input = await req.json();

    const e = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
    const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const is80 = input.tipo === '80%';
    const perc = n(input.percentual);

    let rubricasHtml = '';
    if (is80 && input.rubricas) {
      rubricasHtml = input.rubricas.map((r: { codigo: string; descricao: string; valor: number; proporcional: number }) =>
        `<tr><td>${e(r.codigo)}</td><td>${e(r.descricao)}</td><td class="r">R$ ${fmt(n(r.valor))}</td><td class="r">R$ ${fmt(n(r.proporcional))}</td></tr>`
      ).join('');
    }

    let mediaTableHtml = '';
    if (input.mediaRows && input.mediaRows.length > 0) {
      mediaTableHtml = input.mediaRows.map((r: { seq: number; mes: number; ano: number; valor: number; fator: number; atualizada: number }) =>
        `<tr><td>${r.seq}</td><td>${String(r.mes).padStart(2, '0')}</td><td>${r.ano}</td><td class="r">R$ ${fmt(n(r.valor))}</td><td class="r">${n(r.fator).toFixed(6)}</td><td class="r">R$ ${fmt(n(r.atualizada))}</td></tr>`
      ).join('');
    }

    const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
@page{size:a4;margin:0.6in 0.75in}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;font-size:9pt}
h1{font-size:14pt;margin:0 0 4px;color:#1e3a5f}
h2{font-size:11pt;color:#1e3a5f;margin:20px 0 8px;border-bottom:2px solid #1e3a5f;padding-bottom:4px}
.sub{font-size:9pt;color:#666;margin-bottom:16px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:12px;font-size:9pt}
.info dt{color:#666;font-size:7.5pt;text-transform:uppercase}
.info dd{margin:0;font-weight:600}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:8.5pt;margin-bottom:12px}
th{text-align:left;font-size:7.5pt;color:#475569;border-bottom:1.5px solid #cbd5e1;padding:6px 8px 6px 0;font-weight:600}
td{padding:5px 8px 5px 0;border-bottom:1px solid #f1f5f9}
.r{text-align:right}
.total td{font-weight:700;border-top:1.5px solid #1e3a5f}
.highlight{background:#eef2ff;padding:12px;border-radius:6px;margin:12px 0}
.highlight strong{color:#1e3a5f}
</style></head><body>
<h1>DEMONSTRATIVO DO CÁLCULO DE APOSENTADORIA</h1>
<div class="sub">Prefeitura do Município de São Paulo — Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>

<h2>DADOS DO SERVIDOR</h2>
<dl class="info">
<div><dt>Nome</dt><dd>${e(input.servidorNome)}</dd></div>
<div><dt>RF</dt><dd>${e(input.servidorRf)}</dd></div>
<div><dt>Cargo/Função</dt><dd>${e(input.servidorCargo)}</dd></div>
<div><dt>Referência</dt><dd>${e(input.servidorRef)}</dd></div>
</dl>

${is80 ? `
<h2>DEMONSTRATIVO DE PROVENTOS — 80%</h2>
<dl class="info">
<div><dt>Sexo</dt><dd>${e(input.sexo)}</dd></div>
<div><dt>Tempo Excedente (dias)</dt><dd>${n(input.tempoExcedente)}</dd></div>
<div><dt>Coeficiente</dt><dd>${n(input.coeficiente).toFixed(7)}</dd></div>
<div><dt>Percentual Calculado</dt><dd>${perc.toFixed(2)}%</dd></div>
</dl>
<table><thead><tr><th>Cód</th><th>Descrição</th><th class="r">Valor (R$)</th><th class="r">Proporcional (R$)</th></tr></thead>
<tbody>${rubricasHtml}</tbody>
<tr class="total"><td colspan="2">TOTAL</td><td class="r">R$ ${fmt(input.rubricas?.reduce((s: number, r: { valor: number }) => s + n(r.valor), 0) ?? 0)}</td><td class="r">R$ ${fmt(input.rubricas?.reduce((s: number, r: { proporcional: number }) => s + n(r.proporcional), 0) ?? 0)}</td></tr>
</table>
<table><thead><tr><th>Rubrica</th><th>Descrição</th><th class="r">Média</th><th class="r">Proporcional (${perc.toFixed(2)}%)</th></tr></thead>
<tbody><tr><td>167</td><td>Valor dos Proventos</td><td class="r">R$ ${fmt(n(input.media))}</td><td class="r">R$ ${fmt(n(input.mediaProporcional))}</td></tr></tbody></table>
<div class="highlight"><strong>Valor a Ser Utilizado: R$ ${fmt(n(input.valorFinal))}</strong></div>
` : `
<h2>DEMONSTRATIVO DE PROVENTOS — 100%</h2>
<dl class="info">
<div><dt>Tipo de Aposentadoria</dt><dd>${e(input.tipoAposentadoria)}</dd></div>
<div><dt>Porcentagem Base</dt><dd>${n(input.porcentagemBase).toFixed(2)}%</dd></div>
</dl>
<table><thead><tr><th>Rubrica</th><th>Descrição</th><th class="r">Média</th><th class="r">Média × % Base</th></tr></thead>
<tbody><tr><td>167</td><td>Valor dos Proventos</td><td class="r">R$ ${fmt(n(input.media))}</td><td class="r">R$ ${fmt(n(input.mediaTimesBase))}</td></tr></tbody></table>
<div class="highlight"><strong>Valor Final: R$ ${fmt(n(input.valorFinal))}</strong></div>
`}

${mediaTableHtml ? `
<h2>CÁLCULO: ${is80 ? '80% DOS MAIORES SALÁRIOS (até 01/03/2022)' : '100% (Competência Atual)'}</h2>
<table><thead><tr><th>Seq</th><th>Mês</th><th>Ano</th><th class="r">Valor (R$)</th><th class="r">Fator Atualiz.</th><th class="r">Vant. Atualizada (R$)</th></tr></thead>
<tbody>${mediaTableHtml}</tbody></table>
<h2>RESUMO</h2>
<dl class="info">
<div><dt>Tempo de contribuição total (meses)</dt><dd>${n(input.totalContribuicao)}</dd></div>
<div><dt>Número de meses a considerar</dt><dd>${n(input.numMeses)}</dd></div>
<div><dt>Soma dos maiores salários atualizados</dt><dd>R$ ${fmt(n(input.somaMaiores))}</dd></div>
</dl>
<div class="highlight"><strong>Média aritmética: R$ ${fmt(n(input.media))}</strong></div>
<dl class="info">
<div><dt>Data Início</dt><dd>${e(input.dataInicio)}</dd></div>
<div><dt>Data Fim</dt><dd>${e(input.dataFim)}</dd></div>
</dl>
` : ''}

</body></html>`;

    // Use Gotenberg-style HTML to PDF via a simple approach
    // Since we don't have ZitePdf, we'll return the HTML for client-side printing
    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
