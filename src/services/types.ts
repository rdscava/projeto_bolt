export interface Servidor {
  id: string;
  rf: string;
  nome: string;
  cargo: string;
  referencia: string;
  relacao_jur_adm: string;
  jornada: string;
  nome_setor: string;
  created_at?: string;
}

export interface ImportErrorDetail {
  batchIndex: number;
  recordIndex: number;
  record: Record<string, unknown>;
  table: string;
  column?: string;
  value?: unknown;
  message: string;
  details?: string;
  hint?: string;
  code?: string;
  operation: string;
  stack?: string;
}

export interface Simulacao {
  id: string;
  numero: number;
  data_hora: string;
  servidor_nome: string;
  servidor_cargo: string;
  rf: string;
  tipo: string;
  media: number;
  valor_final: number;
  dados_json: string;
  created_at: string;
  nome: string;
  data_ultima_alteracao: string;
}
