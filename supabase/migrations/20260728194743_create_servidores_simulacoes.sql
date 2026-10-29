/*
# Create Servidores and Simulacoes tables

1. New Tables
- `servidores`: Cadastro de servidores para cálculo de aposentadoria
  - id (uuid, PK)
  - rf (text) — Registro Funcional
  - nome (text)
  - cargo (text)
  - referencia (text)
  - created_at (timestamptz)
- `simulacoes`: Simulações de aposentadoria salvas
  - id (uuid, PK)
  - numero (integer, auto-increment) — número sequencial da simulação
  - data_hora (timestamptz) — data e hora da simulação
  - servidor_nome (text)
  - servidor_cargo (text)
  - rf (text)
  - tipo (text) — "80%" ou "100%"
  - media (numeric, 2 decimais)
  - valor_final (numeric, 2 decimais)
  - dados_json (text) — dados completos em JSON
  - created_at (timestamptz)

2. Security
- RLS enabled on both tables.
- Single-tenant (no auth): policies allow anon + authenticated full CRUD.
*/

CREATE TABLE IF NOT EXISTS servidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rf text NOT NULL,
  nome text NOT NULL,
  cargo text DEFAULT '',
  referencia text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS simulacoes_numero_seq START 1;

CREATE TABLE IF NOT EXISTS simulacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL DEFAULT nextval('simulacoes_numero_seq'),
  data_hora timestamptz DEFAULT now(),
  servidor_nome text DEFAULT '',
  servidor_cargo text DEFAULT '',
  rf text DEFAULT '',
  tipo text DEFAULT '',
  media numeric(12,2) DEFAULT 0,
  valor_final numeric(12,2) DEFAULT 0,
  dados_json text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacoes ENABLE ROW LEVEL SECURITY;

-- Servidores: full CRUD for anon + authenticated (single-tenant, no auth)
DROP POLICY IF EXISTS "anon_select_servidores" ON servidores;
CREATE POLICY "anon_select_servidores" ON servidores FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_servidores" ON servidores;
CREATE POLICY "anon_insert_servidores" ON servidores FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_servidores" ON servidores;
CREATE POLICY "anon_update_servidores" ON servidores FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_servidores" ON servidores;
CREATE POLICY "anon_delete_servidores" ON servidores FOR DELETE
  TO anon, authenticated USING (true);

-- Simulacoes: full CRUD for anon + authenticated
DROP POLICY IF EXISTS "anon_select_simulacoes" ON simulacoes;
CREATE POLICY "anon_select_simulacoes" ON simulacoes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_simulacoes" ON simulacoes;
CREATE POLICY "anon_insert_simulacoes" ON simulacoes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_simulacoes" ON simulacoes;
CREATE POLICY "anon_update_simulacoes" ON simulacoes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_simulacoes" ON simulacoes;
CREATE POLICY "anon_delete_simulacoes" ON simulacoes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_servidores_rf ON servidores(rf);
CREATE INDEX IF NOT EXISTS idx_simulacoes_data_hora ON simulacoes(data_hora DESC);
