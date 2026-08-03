import { roundExcel } from '../lib/format';

export interface IRBracket {
  min: number;
  max: number;
  aliquota: number;
  parcelaDeduzir: number;
}

export const IR_TABLE_2025: IRBracket[] = [
  { min: 0, max: 2428.80, aliquota: 0, parcelaDeduzir: 0 },
  { min: 2428.81, max: 2826.65, aliquota: 7.5, parcelaDeduzir: 182.16 },
  { min: 2826.66, max: 3751.05, aliquota: 15, parcelaDeduzir: 394.16 },
  { min: 3751.06, max: 4664.68, aliquota: 22.5, parcelaDeduzir: 675.49 },
  { min: 4664.69, max: Infinity, aliquota: 27.5, parcelaDeduzir: 908.73 },
];

export interface RedutorParams {
  faixaMin: number;
  faixaMax: number;
  constante: number;
  coeficiente: number;
}

export const REDUTOR_PARAMS: RedutorParams = {
  faixaMin: 5000.01,
  faixaMax: 7350.00,
  constante: 978.62,
  coeficiente: 0.133145,
};

export const LIMITE_ISENCAO_IR = 5000.00;

export function findIRBracket(baseCalculo: number): IRBracket {
  return IR_TABLE_2025.find(b => baseCalculo >= b.min && baseCalculo <= b.max)
    ?? IR_TABLE_2025[IR_TABLE_2025.length - 1];
}

export function calcIRRFNormal(baseCalculo: number): { aliquota: number; irrfBruto: number; parcelaDeduzir: number; irrfNormal: number } {
  const bracket = findIRBracket(baseCalculo);
  const irrfBruto = roundExcel(baseCalculo * (bracket.aliquota / 100));
  const irrfNormal = roundExcel(Math.max(0, irrfBruto - bracket.parcelaDeduzir));
  return { aliquota: bracket.aliquota, irrfBruto, parcelaDeduzir: bracket.parcelaDeduzir, irrfNormal };
}

export function calcRedutor(provento: number, baseCalculo: number, params: RedutorParams): number {
  if (baseCalculo < params.faixaMin || baseCalculo > params.faixaMax) return 0;
  const redutor = params.constante - (params.coeficiente * provento);
  return roundExcel(Math.max(0, redutor));
}
