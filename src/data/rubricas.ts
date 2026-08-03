import type { RubricaOption } from '../types';

export const RUBRICAS_80: RubricaOption[] = [
  { codigo: '24', descricao: 'Auxílio Acidentário' },
  { codigo: '254', descricao: 'Subsídio Aposentado' },
  { codigo: '255', descricao: 'Subsídio Complementar' },
  { codigo: '259', descricao: 'Média Remuneração Cargo em Comissão' },
  { codigo: '260', descricao: 'Média Difícil Acesso Subsídio' },
  { codigo: '261', descricao: 'Média Insalubridade Subsídio' },
  { codigo: '262', descricao: 'Média Periculosidade/Penosidade Subsídio' },
  { codigo: '263', descricao: 'Média Gratificação Plantão Extra Subsídio' },
  { codigo: '264', descricao: 'Insalubridade Incorporada Subsídio' },
  { codigo: '265', descricao: 'Média Jornada Incorporada' },
  { codigo: '266', descricao: 'Adicional de Insalubridade - Ação Judicial' },
  { codigo: '290', descricao: 'Média Gratificação Serviço Noturno Optantes QMB' },
  { codigo: '291', descricao: 'Média Função Gratificada Optantes QMB' },
  { codigo: '294', descricao: 'Média Remuneração Cargo em Comissão Optantes QMB' },
  { codigo: '295', descricao: 'Média Gratificação de Atendimento ao Público Optantes Subsídio' },
  { codigo: '314', descricao: 'Média Gratificação Local de Trabalho - GLT' },
];

export const TIPOS_APOSENTADORIA = [
  'APOSENTADORIA POR INCAPACIDADE',
  'APOSENTADORIA REGRA PERMANENTE',
  'APOSENTADORIA REGRAS DE TRANSIÇÃO - PEDÁGIO',
  'APOSENTADORIA REGRAS DE TRANSIÇÃO - PONTOS',
  'APOSENTADORIA COMPULSÓRIA',
] as const;
