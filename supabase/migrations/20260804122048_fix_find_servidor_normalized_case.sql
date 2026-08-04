/*
# Fix find_servidor_by_rf_normalized — case-insensitive vinculo removal

1. Purpose
- The previous version used REGEXP_REPLACE with 'V[0-9]+$' which only matched uppercase V.
- Users may type lowercase 'v7' or 'V7' — both must be stripped.
- Updated regex to 'V[0-9]+$' with case-insensitive flag via UPPER() applied before regex.

2. Changes
- Replaces the function with a version that uppercases the input BEFORE regex replacement,
  so both 'v7' and 'V7' are correctly stripped.
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
        REPLACE(REPLACE(REPLACE(UPPER(rf), '.', ''), ' ', ''), '-', ''),
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
