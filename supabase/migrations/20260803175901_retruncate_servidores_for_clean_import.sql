/*
# Re-truncate servidores to remove duplicate test records

1. Purpose
- 5 test records were inserted via execute_sql before the bulk import began,
  creating duplicates. This re-truncates to start clean before the final import.
*/

TRUNCATE TABLE servidores;