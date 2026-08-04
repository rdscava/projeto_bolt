/*
# Fix find_servidor_by_rf_normalized to return JSON instead of a composite text

When called via Supabase rpc(), a function returning a composite type (servidores)
serializes as a single text string like "(id,rf,nome,...)", not a JSON object.
The frontend cannot parse field names from that.

This version returns jsonb so supabase-js decodes it into a proper object.
*/

DROP FUNCTION IF EXISTS find_servidor_by_rf_normalized(p_rf text);

CREATE OR REPLACE FUNCTION find_servidor_by_rf_normalized(p_rf text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT to_jsonb(s)
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
