/*
# Fix find_servidor_by_rf_normalized — return SETOF for PostgREST compatibility

Previous versions returned either a composite type (serialized as text string)
or jsonb (scalar return, not handled well by supabase-js .maybeSingle()).

Returning SETOF servidores makes PostgREST treat this as a set-returning function,
serializing each row as a proper JSON object. .maybeSingle() then works correctly.
Also sets a fixed search_path to satisfy the database linter.
*/

DROP FUNCTION IF EXISTS find_servidor_by_rf_normalized(p_rf text);

CREATE OR REPLACE FUNCTION find_servidor_by_rf_normalized(p_rf text)
RETURNS SETOF servidores
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.*
  FROM servidores s
  WHERE UPPER(
    BTRIM(
      REGEXP_REPLACE(
        REPLACE(REPLACE(REPLACE(UPPER(s.rf), '.', ''), ' ', ''), '-', ''),
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
