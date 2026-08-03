export interface Servidor {
  id?: string;
  rf: string;
  nome: string;
  cargo: string;
  referencia: string;
  relacaoJurAdm: string;
  jornada: string;
  nomeSetor: string;
}

export interface SigpecRow {
  id: string;
  consol: string;
  rub: string;
  tp: string;
  nomeAbreviado: string;
  complemento: string;
  tipoFolha: string;
  tipoCalc: string;
  folha: string;
  no: string;
  valor: string;
  pens: string;
  compet: string;
}

export interface AdmrhRow {
  id: string;
  cpf: string;
  matricula: string;
  nome: string;
  tipoFolha: string;
  referencia: string;
  tipoPagamento: string;
  tipoEvento: string;
  evento: string;
  qtd: string;
  incidencia: string;
  percentual: string;
  valor: string;
  tipo: string;
  cargo: string;
  funcao: string;
  horasMes: string;
  padrao: string;
  nivel: string;
  admissao: string;
  orgao: string;
  setor: string;
  vinculo: string;
  centroCusto: string;
  situacao: string;
  dtSituacao: string;
  codSigpec: string;
}

export interface AverbacaoRow {
  id: string;
  compet: string;
  valor: string;
}

export interface IndiceRow {
  compet: string; // MM/YYYY
  indice: number;
}

export interface VinculoPeriodo {
  de: string; // MM/YYYY
  ate: string; // MM/YYYY
}

export interface VinculoConfig {
  rgpsEnabled: boolean;
  rppsEnabled: boolean;
  rgpsPeriodos: VinculoPeriodo[];
  rppsPeriodos: VinculoPeriodo[];
}

export interface BaseJuncaoRow {
  seq: number;
  compet: string; // MM/YYYY
  valorOriginal: number;
  tetoRef: number | null;
  isTeto: boolean;
  isRpps: boolean;
  valorFinal: number;
}

export interface MediaRow {
  seq: number;
  mes: number;
  ano: number;
  valor: number;
  fatorAtualizacao: number;
  vantagemAtualizada: number;
}

export interface RubricaOption {
  codigo: string;
  descricao: string;
}

export interface DemonstrativoRubrica {
  id: string;
  codigo: string;
  descricao: string;
  valor: number;
}

export type TipoCalculo = '100' | '80';

export type TipoAposentadoria =
  | 'APOSENTADORIA POR INCAPACIDADE'
  | 'APOSENTADORIA REGRA PERMANENTE'
  | 'APOSENTADORIA REGRAS DE TRANSIÇÃO - PEDÁGIO'
  | 'APOSENTADORIA REGRAS DE TRANSIÇÃO - PONTOS';

export interface Simulation {
  id: string;
  nome: string;
  dataCriacao: string;
  dataUltimaAlteracao: string;
  servidor: Servidor | null;
  tipoCalculo: TipoCalculo;
  indices: IndiceRow[];
  sigpecBase: { data: SigpecRow[]; filter: string[] };
  admrh: { data: AdmrhRow[]; filter: string[] };
  averbacao: { data: AverbacaoRow[] };
  vinculoConfig: VinculoConfig;
  demonstrativo: {
    sexo: 'HOMEM' | 'MULHER';
    tempoExcedente: number;
    rubricas80: DemonstrativoRubrica[];
    porcentagemBase: number;
    tipoAposentadoria: string;
  };
}

export function createEmptySimulation(): Simulation {
  return {
    id: '',
    nome: 'Nova Simulação',
    dataCriacao: new Date().toISOString(),
    dataUltimaAlteracao: new Date().toISOString(),
    servidor: null,
    tipoCalculo: '80',
    indices: [],
    sigpecBase: { data: [], filter: [] },
    admrh: { data: [], filter: [] },
    averbacao: { data: [] },
    vinculoConfig: { rgpsEnabled: true, rppsEnabled: true, rgpsPeriodos: [], rppsPeriodos: [] },
    demonstrativo: {
      sexo: 'MULHER',
      tempoExcedente: 0,
      rubricas80: [],
      porcentagemBase: 0,
      tipoAposentadoria: '',
    },
  };
}
