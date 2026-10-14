/*
# Create tables for Média de Parcelas Remuneratórias — Proventos Integrais module

## Overview
Creates two new tables for the integral retirement media calculation module:
1. `referencias_calculo_jornada` — Stores reference values for jornada calculations (J20/J24/J30 × tabela × date range × AS1-AS17)
2. `calculos_medias_remuneratorias` — Stores saved calculation results with full audit trail in JSONB

## New Tables

### referencias_calculo_jornada
- `id` (uuid, PK, default gen_random_uuid())
- `tipo_jornada` (text, not null) — e.g. 'J20', 'J24', 'J30'
- `tabela_referencia` (text, not null) — e.g. 'TRSAS', 'TRSASTS', 'TRSA', etc.
- `data_inicio` (date, not null) — period start date
- `data_fim` (date, not null) — period end date
- `referencia` (text, not null) — e.g. 'AS1' through 'AS17'
- `valor` (numeric(12,2), not null) — reference monetary value
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### calculos_medias_remuneratorias
- `id` (uuid, PK, default gen_random_uuid())
- `titulo` (text, not null) — calculation title
- `tipo_calculo` (text, not null) — e.g. 'ATUALIZACAO_PLUS', 'CONSOLIDACAO'
- `status` (text, not null default 'RASCUNHO') — 'RASCUNHO', 'CONCLUIDO', 'ARQUIVADO'
- `rf_servidor` (text) — server registration number
- `nome_servidor` (text) — server name
- `cargo_servidor` (text) — server position
- `rubrica` (text) — rubric code
- `rubrica_descricao` (text) — rubric description
- `data_referencia` (text) — reference month (MM/YYYY)
- `periodo_apuracao` (text) — calculation period description
- `tipo_jornada` (text) — jornada type if applicable
- `referencia_remuneratoria` (text) — reference if applicable
- `qtd_total_lancamentos` (integer, default 0)
- `qtd_lancamentos_selecionados` (integer, default 0)
- `soma_valores_originais` (numeric(14,2), default 0)
- `soma_valores_atualizados` (numeric(14,2), default 0)
- `soma_valores_selecionados` (numeric(14,2), default 0)
- `media_final` (numeric(14,2), default 0)
- `lancamentos_detalhados` (jsonb) — full detail of all calculation lines
- `memoria_calculo` (jsonb) — calculation audit trail / memory
- `observacoes` (text) — legal observations text
- `dados_servidor` (jsonb) — full server data snapshot
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security
- Both tables have RLS enabled.
- Single-tenant no-auth app: policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` since data is intentionally shared.
- 4 separate policies per table (SELECT, INSERT, UPDATE, DELETE).

## Notes
1. The existing `servidores_sms` table is reused for server management — no new server table created.
2. The existing proportional retirement module (simulacoes_sms, demonstrativo, etc.) is completely untouched.
3. JSONB columns store full calculation audit trails for history/replay.
*/
CREATE TABLE IF NOT EXISTS referencias_calculo_jornada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_jornada text NOT NULL,
  tabela_referencia text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  referencia text NOT NULL,
  valor numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE referencias_calculo_jornada ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_referencias_jornada" ON referencias_calculo_jornada;
CREATE POLICY "anon_select_referencias_jornada" ON referencias_calculo_jornada
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_referencias_jornada" ON referencias_calculo_jornada;
CREATE POLICY "anon_insert_referencias_jornada" ON referencias_calculo_jornada
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_referencias_jornada" ON referencias_calculo_jornada;
CREATE POLICY "anon_update_referencias_jornada" ON referencias_calculo_jornada
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_referencias_jornada" ON referencias_calculo_jornada;
CREATE POLICY "anon_delete_referencias_jornada" ON referencias_calculo_jornada
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_referencias_jornada_lookup
  ON referencias_calculo_jornada (tipo_jornada, tabela_referencia, data_inicio, data_fim);

CREATE TABLE IF NOT EXISTS calculos_medias_remuneratorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo_calculo text NOT NULL,
  status text NOT NULL DEFAULT 'RASCUNHO',
  rf_servidor text,
  nome_servidor text,
  cargo_servidor text,
  rubrica text,
  rubrica_descricao text,
  data_referencia text,
  periodo_apuracao text,
  tipo_jornada text,
  referencia_remuneratoria text,
  qtd_total_lancamentos integer DEFAULT 0,
  qtd_lancamentos_selecionados integer DEFAULT 0,
  soma_valores_originais numeric(14,2) DEFAULT 0,
  soma_valores_atualizados numeric(14,2) DEFAULT 0,
  soma_valores_selecionados numeric(14,2) DEFAULT 0,
  media_final numeric(14,2) DEFAULT 0,
  lancamentos_detalhados jsonb,
  memoria_calculo jsonb,
  observacoes text,
  dados_servidor jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calculos_medias_remuneratorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_calculos_medias" ON calculos_medias_remuneratorias;
CREATE POLICY "anon_select_calculos_medias" ON calculos_medias_remuneratorias
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_calculos_medias" ON calculos_medias_remuneratorias;
CREATE POLICY "anon_insert_calculos_medias" ON calculos_medias_remuneratorias
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_calculos_medias" ON calculos_medias_remuneratorias;
CREATE POLICY "anon_update_calculos_medias" ON calculos_medias_remuneratorias
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_calculos_medias" ON calculos_medias_remuneratorias;
CREATE POLICY "anon_delete_calculos_medias" ON calculos_medias_remuneratorias
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_calculos_medias_rf
  ON calculos_medias_remuneratorias (rf_servidor);

CREATE INDEX IF NOT EXISTS idx_calculos_medias_created
  ON calculos_medias_remuneratorias (created_at DESC);
