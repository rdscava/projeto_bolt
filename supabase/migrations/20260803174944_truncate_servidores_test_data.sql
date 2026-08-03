/*
# Truncate servidores table — remove all test data

1. Purpose
- The current servidores table contains 63,315 test rows that were used only
  for development/testing. The user has declared this data is no longer needed.
- This migration clears all rows while preserving the table structure, indexes,
  RLS policies, and column defaults.

2. Changes
- TRUNCATE servidores (removes all rows, keeps structure + indexes + policies)
- Does NOT drop the table or any columns.
- Does NOT affect the simulacoes table.

3. Notes
- No backup is performed (per user's explicit request).
- The table is immediately ready to receive the new official CSV import.
*/

TRUNCATE TABLE servidores;