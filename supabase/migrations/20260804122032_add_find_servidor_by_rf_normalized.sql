/*
# Add find_servidor_by_rf_normalized function

1. Purpose
- The Demonstrativo screen allows users to search for a server by Registro Funcional (RF).
- Users may type the RF in various formats: with or without dots, spaces, uppercase/lowercase,
  with or without the vinculo suffix (V1, V2, V7, etc.).
- A simple ILIKE query cannot handle this because the stored RF contains dots and spaces
  (e.g., "134.080.8 V7") while the user might type "1340808" or "134.080.8" or "1340808v7".
- This function normalizes both the input and the stored RF before comparison, ensuring
  matches regardless of formatting differences.

2. Changes
- Creates SECURITY INVOKER function `find_servidor_by_rf_normalized(p_rf text)`
  that returns the first matching `servidores` row.
- Normalization: uppercases, removes dots, spaces, hyphens, and the trailing V# vinculo.
- Grants EXECUTE to anon and authenticated roles so the frontend can call it via RPC.

3. Security
- Function is SECURITY INVOKER, runs with caller privileges (respecting RLS).
- No new policies needed; the function respects existing RLS policies on servidores.
*/

CREATE OR REPLACE FUNCTION find_servidor_by_rf_normalized(p_rf text)
RETURNS servidores
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT *
  FROM servidores
  WHERE UPPER(
    BTRIM(
      REGEXP_REPLACE(
        REPLACE(REPLACE(REPLACE(rf, '.', ''), ' ', ''), '-', ''),
        'V[0-9]+$',
        ''
      )
    )
  ) = UPPER(
    BTRIM(
      REGEXP_REPLACE(
        REPLACE(REPLACE(REPLACE(p_rf, '.', ''), ' ', ''), '-', ''),
        'V[0-9]+$',
        ''
      )
    )
  )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION find_servidor_by_rf_normalized(text) TO anon, authenticated;
