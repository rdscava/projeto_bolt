/*
# Add servidor fields: Relação Jur-Adm, Jornada, Nome do Setor

1. Modified Tables
- `servidores`: Added 3 new text columns with empty string defaults:
  - `relacao_jur_adm` — Relação Jurídico-Administrativa (coluna TIPO na importação)
  - `jornada` — Jornada de trabalho (coluna JORNADA na importação)
  - `nome_setor` — Nome do setor (coluna SETOR na importação)

2. Security
- No RLS policy changes. Existing anon/authenticated CRUD policies remain unchanged.

3. Notes
- All columns are nullable with empty string defaults, so existing rows and
  saved simulations are not affected. New columns are populated via the
  Gestão de Servidores import or manual editing.
*/

ALTER TABLE servidores
  ADD COLUMN IF NOT EXISTS relacao_jur_adm text DEFAULT '',
  ADD COLUMN IF NOT EXISTS jornada text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nome_setor text DEFAULT '';