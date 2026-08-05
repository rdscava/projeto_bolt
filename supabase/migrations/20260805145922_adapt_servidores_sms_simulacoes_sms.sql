/*
# Adapt servidores_sms and simulacoes_sms for app integration

1. servidores_sms — add id column and indexes
   Existing columns: REG_COMPLETO, NOME, CARGO, REF, TIPO, JORNADA, SETOR
   No id column existed — add uuid PK.
   Add indexes on REG_COMPLETO and NOME for search.

2. simulacoes_sms — add missing columns
   Existing: created_at, rf, nome, tipo, media, valor_final
   Add: id (uuid PK), numero (int sequence), data_hora, data_ultima_alteracao,
        servidor_nome, servidor_cargo, cpf, matricula, status, dados_json

3. Functions
   find_servidor_by_rf_normalized(p_rf text) — returns SETOF servidores_sms
   Normalizes RF by stripping dots, spaces, dashes, V# suffix.

4. Security
   RLS enabled on both. anon + authenticated full CRUD (single-tenant, no auth).
*/

-- servidores_sms: add id column
ALTER TABLE servidores_sms ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Make id the primary key (only if no PK exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'servidores_sms' AND constraint_type = 'PRIMARY KEY') THEN
    ALTER TABLE servidores_sms ADD PRIMARY KEY (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_servidores_sms_reg ON servidores_sms ("REG_COMPLETO");
CREATE INDEX IF NOT EXISTS idx_servidores_sms_nome ON servidores_sms ("NOME");
CREATE INDEX IF NOT EXISTS idx_servidores_sms_reg_lower ON servidores_sms (lower("REG_COMPLETO"));
CREATE INDEX IF NOT EXISTS idx_servidores_sms_nome_lower ON servidores_sms (lower("NOME"));

ALTER TABLE servidores_sms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_servidores_sms" ON servidores_sms;
CREATE POLICY "anon_select_servidores_sms" ON servidores_sms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_servidores_sms" ON servidores_sms;
CREATE POLICY "anon_insert_servidores_sms" ON servidores_sms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_servidores_sms" ON servidores_sms;
CREATE POLICY "anon_update_servidores_sms" ON servidores_sms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_servidores_sms" ON servidores_sms;
CREATE POLICY "anon_delete_servidores_sms" ON servidores_sms FOR DELETE
  TO anon, authenticated USING (true);

-- simulacoes_sms: add missing columns
ALTER TABLE simulacoes_sms ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE simulacoes_sms ADD COLUMN IF NOT EXISTS numero int;
ALTER TABLE simulacoes_sms ADD COLUMN IF NOT EXISTS data_hora timestamptz DEFAULT now();
ALTER TABLE simulacoes_sms ADD COLUMN IF NOT EXISTS data_ultima_alteracao timestamptz DEFAULT now();
ALTER TABLE simulacoes_sms ADD COLUMN IF NOT EXISTS servidor_nome text DEFAULT '';
ALTER TABLE simulacoes_sms ADD COLUMN IF NOT EXISTS servidor_cargo text DEFAULT '';
ALTER TABLE simulacoes_sms ADD COLUMN IF NOT EXISTS cpf text DEFAULT '';
ALTER TABLE simulacoes_sms ADD COLUMN IF NOT EXISTS matricula text DEFAULT '';
ALTER TABLE simulacoes_sms ADD COLUMN IF NOT EXISTS status text DEFAULT '';
ALTER TABLE simulacoes_sms ADD COLUMN IF NOT EXISTS dados_json jsonb;

-- Add sequence for numero
CREATE SEQUENCE IF NOT EXISTS simulacoes_sms_numero_seq;

-- Backfill numero for existing rows that have NULL
UPDATE simulacoes_sms SET numero = nextval('simulacoes_sms_numero_seq') WHERE numero IS NULL;

-- Set default for future inserts
ALTER TABLE simulacoes_sms ALTER COLUMN numero SET DEFAULT nextval('simulacoes_sms_numero_seq');

-- Make id the primary key
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'simulacoes_sms' AND constraint_type = 'PRIMARY KEY') THEN
    ALTER TABLE simulacoes_sms ADD PRIMARY KEY (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_simulacoes_sms_rf ON simulacoes_sms (rf);
CREATE INDEX IF NOT EXISTS idx_simulacoes_sms_servidor_nome ON simulacoes_sms (servidor_nome);
CREATE INDEX IF NOT EXISTS idx_simulacoes_sms_cpf ON simulacoes_sms (cpf);
CREATE INDEX IF NOT EXISTS idx_simulacoes_sms_matricula ON simulacoes_sms (matricula);
CREATE INDEX IF NOT EXISTS idx_simulacoes_sms_data_hora ON simulacoes_sms (data_hora);
CREATE INDEX IF NOT EXISTS idx_simulacoes_sms_status ON simulacoes_sms (status);

ALTER TABLE simulacoes_sms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_simulacoes_sms" ON simulacoes_sms;
CREATE POLICY "anon_select_simulacoes_sms" ON simulacoes_sms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_simulacoes_sms" ON simulacoes_sms;
CREATE POLICY "anon_insert_simulacoes_sms" ON simulacoes_sms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_simulacoes_sms" ON simulacoes_sms;
CREATE POLICY "anon_update_simulacoes_sms" ON simulacoes_sms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_simulacoes_sms" ON simulacoes_sms;
CREATE POLICY "anon_delete_simulacoes_sms" ON simulacoes_sms FOR DELETE
  TO anon, authenticated USING (true);

-- find_servidor_by_rf_normalized function (matches against REG_COMPLETO)
DROP FUNCTION IF EXISTS find_servidor_by_rf_normalized(p_rf text);

CREATE OR REPLACE FUNCTION find_servidor_by_rf_normalized(p_rf text)
RETURNS SETOF servidores_sms
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.*
  FROM servidores_sms s
  WHERE UPPER(
    BTRIM(
      REGEXP_REPLACE(
        REPLACE(REPLACE(REPLACE(UPPER(s."REG_COMPLETO"), '.', ''), ' ', ''), '-', ''),
        'V[0-9]+$',
        ''
      )
    )
  ) = UPPER(
    BTRIM(
      REGEXP_REPLACE(
        REPLACE(REPLACE(REPLACE(UPPER(p_rf), '.', ''), ' ', ''), '-', ''),
        'V[0-9]+$',
        ''
      )
    )
  )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION find_servidor_by_rf_normalized(text) TO anon, authenticated;
