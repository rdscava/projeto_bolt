/*
# Fix find_servidor_by_rf_normalized to handle V-stripped input

The client-side RF mask strips the letter "V" from input (e.g. "135.958.4 V2" → "135.958.4 2").
The previous normalization couldn't remove the V-suffix because the V was already gone,
leaving an extra trailing digit that caused mismatch.

Fix: normalize both sides to the first 7 significant digits (the core RF number),
after removing V[0-9]* suffix if present.
*/

DROP FUNCTION IF EXISTS find_servidor_by_rf_normalized(p_rf text);

CREATE OR REPLACE FUNCTION find_servidor_by_rf_normalized(p_rf text)
RETURNS SETOF servidores_sms
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH norm AS (
    SELECT LEFT(
      REGEXP_REPLACE(
        REPLACE(REPLACE(REPLACE(UPPER($1), '.', ''), ' ', ''), '-', ''),
        'V[0-9]*$',
        ''
      ),
      7
    ) AS rf_key
  )
  SELECT s.*
  FROM servidores_sms s
  CROSS JOIN norm
  WHERE LEFT(
    REGEXP_REPLACE(
      REPLACE(REPLACE(REPLACE(UPPER(s."REG_COMPLETO"), '.', ''), ' ', ''), '-', ''),
      'V[0-9]*$',
      ''
    ),
    7
  ) = norm.rf_key
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION find_servidor_by_rf_normalized(text) TO anon, authenticated;
