/*
# Add nome and data_ultima_alteracao columns to simulacoes

1. Modified Tables
- `simulacoes`
  - `nome` (text, default '') — human-friendly name for the simulation
  - `data_ultima_alteracao` (timestamptz, default now()) — timestamp of last update

2. Backfill
- Existing rows get nome = 'Simulação #' || numero and data_ultima_alteracao = data_hora

3. Security
- No changes to RLS policies. Existing anon + authenticated full CRUD remains in place.

4. Notes
- The columns are additive (no data loss).
- data_ultima_alteracao is updated by the application on every save.
*/

ALTER TABLE simulacoes
  ADD COLUMN IF NOT EXISTS nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_ultima_alteracao timestamptz DEFAULT now();

UPDATE simulacoes
  SET nome = COALESCE(nome, 'Simulação #' || numero),
      data_ultima_alteracao = COALESCE(data_ultima_alteracao, data_hora)
  WHERE nome = '' OR data_ultima_alteracao IS NULL;
