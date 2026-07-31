import { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ServidorHeader from '../components/ServidorHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Info, Lock } from 'lucide-react';
import { formatBRL } from '../lib/format';
import { calcDemonstrativo } from '../lib/demonstrativoCalc';
import { IR_TABLE_2025, calcIRRFNormal, calcRedutor, REDUTOR_PARAMS } from '../data/ir-table';

const SALARIO_MINIMO_DEFAULT = 1620.0;

export default function Pagamento() {
  const ctx = useAppContext();
  const sim = ctx.activeSimulation;

  const [salarioMinimo, setSalarioMinimo] = useState(SALARIO_MINIMO_DEFAULT);

  const demoResult = useMemo(() => {
    if (!sim) return null;
    return calcDemonstrativo(sim);
  }, [sim]);

  const valorProvento = demoResult?.valorFinal ?? 0;
  const temProvento = valorProvento > 0;

  const calculo = useMemo(() => {
    if (!temProvento) return null;

    const basePrevidenciaria = Math.max(0, valorProvento - salarioMinimo);
    const aliquotaPrevidenciaria = 14;
    const descontoPrevidenciario = basePrevidenciaria * (aliquotaPrevidenciaria / 100);
    const valorAposPrevidenciario = valorProvento - descontoPrevidenciario;

    const irNormal = calcIRRFNormal(valorAposPrevidenciario);
    const redutor = calcRedutor(valorProvento, valorAposPrevidenciario, REDUTOR_PARAMS);
    const impostoDevido = Math.max(0, irNormal.irrfNormal - redutor);
    const valorLiquido = valorAposPrevidenciario - impostoDevido;

    return {
      valorProvento,
      salarioMinimo,
      basePrevidenciaria,
      aliquotaPrevidenciaria,
      descontoPrevidenciario,
      valorAposPrevidenciario,
      irAliquota: irNormal.aliquota,
      irrfBruto: irNormal.irrfBruto,
      parcelaDeduzir: irNormal.parcelaDeduzir,
      irrfNormal: irNormal.irrfNormal,
      redutor,
      impostoDevido,
      valorLiquido,
    };
  }, [temProvento, valorProvento, salarioMinimo]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">PAGAMENTO</h2>
        <p className="text-sm text-muted-foreground">
          Cálculo de descontos previdenciário e imposto de renda sobre o valor do Demonstrativo.
        </p>
      </div>

      <ServidorHeader />

      {!sim ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center space-y-2">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Nenhuma simulação ativa. Carregue ou crie uma simulação na tela de Simulações para visualizar o Pagamento.
          </p>
        </div>
      ) : !temProvento ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center space-y-2">
          <Calculator className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            O Demonstrativo desta simulação ainda não possui um valor final calculado. Volte à tela de Demonstrativo e configure os dados para obter o valor dos proventos.
          </p>
        </div>
      ) : (
        <>
          {/* Parâmetros */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Parâmetros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Valor do Provento (Demonstrativo)</Label>
                <Input value={formatBRL(valorProvento)} readOnly className="bg-muted/50 font-mono" />
                <p className="text-xs text-muted-foreground mt-1">
                  Valor final calculado na tela Demonstrativo ({sim.tipoCalculo === '80' ? '80%' : '100%'}).
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Salário Mínimo Vigente</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={salarioMinimo}
                    onChange={e => setSalarioMinimo(parseFloat(e.target.value) || 0)}
                    className="font-mono w-40"
                  />
                  <span className="text-xs text-muted-foreground">Editável — atualize quando o valor mudar.</span>
                </div>
              </div>
            </div>
          </div>

          {calculo && (
            <>
              {/* Cálculo Previdenciário */}
              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                  Cálculo Previdenciário
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Fórmula</TableHead>
                      <TableHead className="text-right">Valor (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Valor do Provento</TableCell>
                      <TableCell className="text-muted-foreground text-xs">Resultado do Demonstrativo</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(calculo.valorProvento)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Salário Mínimo</TableCell>
                      <TableCell className="text-muted-foreground text-xs">Valor vigente</TableCell>
                      <TableCell className="text-right font-mono">– {formatBRL(calculo.salarioMinimo)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Base Previdenciária</TableCell>
                      <TableCell className="text-muted-foreground text-xs">Provento – Salário Mínimo</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(calculo.basePrevidenciaria)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Alíquota Previdenciária</TableCell>
                      <TableCell className="text-muted-foreground text-xs">Fixa</TableCell>
                      <TableCell className="text-right font-mono">{calculo.aliquotaPrevidenciaria}%</TableCell>
                    </TableRow>
                    <TableRow className="font-semibold bg-muted/30">
                      <TableCell>Desconto Previdenciário</TableCell>
                      <TableCell className="text-muted-foreground text-xs">Base × {calculo.aliquotaPrevidenciaria}%</TableCell>
                      <TableCell className="text-right font-mono">– {formatBRL(calculo.descontoPrevidenciario)}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold border-t-2 border-primary/20">
                      <TableCell>Valor após Desconto Previdenciário</TableCell>
                      <TableCell className="text-muted-foreground text-xs">Provento – Desconto</TableCell>
                      <TableCell className="text-right font-mono text-primary">{formatBRL(calculo.valorAposPrevidenciario)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Cálculo Imposto de Renda */}
              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                  Cálculo do Imposto de Renda
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Fórmula</TableHead>
                      <TableHead className="text-right">Valor (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Base de Cálculo do IR</TableCell>
                      <TableCell className="text-muted-foreground text-xs">Valor após desconto previdenciário</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(calculo.valorAposPrevidenciario)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Alíquota Aplicável</TableCell>
                      <TableCell className="text-muted-foreground text-xs">Conforme tabela progressiva</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(calculo.irAliquota).replace('R$', '').trim()}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">IRRF Bruto</TableCell>
                      <TableCell className="text-muted-foreground text-xs">Base × Alíquota</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(calculo.irrfBruto)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Parcela a Deduzir</TableCell>
                      <TableCell className="text-muted-foreground text-xs">Conforme faixa da tabela</TableCell>
                      <TableCell className="text-right font-mono">– {formatBRL(calculo.parcelaDeduzir)}</TableCell>
                    </TableRow>
                    <TableRow className="font-semibold bg-muted/30">
                      <TableCell>IRRF Normal (antes da Lei 15.270/2025)</TableCell>
                      <TableCell className="text-muted-foreground text-xs">IRRF Bruto – Parcela a Deduzir</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(calculo.irrfNormal)}</TableCell>
                    </TableRow>
                    {calculo.redutor > 0 && (
                      <>
                        <TableRow>
                          <TableCell className="font-medium">Faixa de Redução (Lei 15.270/2025)</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            Base entre R$ 5.000,01 e R$ 7.350,00
                          </TableCell>
                          <TableCell className="text-right font-mono">Aplicável</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Redutor</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            R$ 978,62 – (0,133145 × Provento)
                          </TableCell>
                          <TableCell className="text-right font-mono">– {formatBRL(calculo.redutor)}</TableCell>
                        </TableRow>
                      </>
                    )}
                    <TableRow className="font-semibold bg-muted/30">
                      <TableCell>Imposto Devido</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        IRRF Normal {calculo.redutor > 0 ? '– Redutor' : ''}
                      </TableCell>
                      <TableCell className="text-right font-mono">– {formatBRL(calculo.impostoDevido)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Resultado Final */}
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-primary uppercase">Resultado Final</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground">Valor do Provento</p>
                    <p className="text-lg font-bold font-mono">{formatBRL(calculo.valorProvento)}</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total de Descontos</p>
                    <p className="text-lg font-bold font-mono text-destructive">
                      – {formatBRL(calculo.descontoPrevidenciario + calculo.impostoDevido)}
                    </p>
                  </div>
                  <div className="bg-card p-4 rounded-lg border-2 border-primary/30">
                    <p className="text-xs text-primary font-medium">Valor Líquido a Receber</p>
                    <p className="text-xl font-bold text-primary font-mono">{formatBRL(calculo.valorLiquido)}</p>
                  </div>
                </div>
              </div>

              {/* Tabela Progressiva Informativa */}
              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  Tabela Progressiva do Imposto de Renda — 2025
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Base de Cálculo (R$)</TableHead>
                      <TableHead className="text-right">Alíquota (%)</TableHead>
                      <TableHead className="text-right">Parcela a Deduzir (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IR_TABLE_2025.map((b, i) => {
                      const isCurrent = calculo.valorAposPrevidenciario >= b.min && calculo.valorAposPrevidenciario <= b.max;
                      const label = b.max === Infinity
                        ? `Acima de R$ ${b.min.toFixed(2).replace('.', ',')}`
                        : i === 0
                          ? `Até R$ ${b.max.toFixed(2).replace('.', ',')}`
                          : `De R$ ${b.min.toFixed(2).replace('.', ',')} até R$ ${b.max.toFixed(2).replace('.', ',')}`;
                      return (
                        <TableRow key={i} className={isCurrent ? 'bg-primary/10 font-medium' : ''}>
                          <TableCell className={isCurrent ? 'text-primary' : ''}>
                            {label}
                            {isCurrent && <span className="ml-2 text-xs text-primary">(aplicada)</span>}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${isCurrent ? 'text-primary' : ''}`}>
                            {b.aliquota === 0 ? 'Isento' : `${b.aliquota.toString().replace('.', ',')}%`}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${isCurrent ? 'text-primary' : ''}`}>
                            {formatBRL(b.parcelaDeduzir)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
                  <p>
                    <strong>Redutor da Lei 15.270/2025:</strong> aplicável quando a base de cálculo está entre R$ 5.000,01 e R$ 7.350,00.
                  </p>
                  <p>
                    <strong>Fórmula do redutor:</strong> R$ 978,62 – (0,133145 × valor do provento bruto).
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
