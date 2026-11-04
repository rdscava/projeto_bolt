CREATE OR REPLACE FUNCTION public.find_servidores_by_rf_base(p_rf text)
RETURNS SETOF servidores_sms
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
WITH inp AS (
  SELECT LEFT(
    REGEXP_REPLACE(
      REPLACE(REPLACE(REPLACE(UPPER($1), '.', ''), ' ', ''), '-', ''),
      'V[0-9]*$', ''
    ),
    7
  ) AS rf_key
)
SELECT s.*
FROM servidores_sms s
CROSS JOIN inp
WHERE LEFT(
  REGEXP_REPLACE(
    REPLACE(REPLACE(REPLACE(UPPER(s."REG_COMPLETO"), '.', ''), ' ', ''), '-', ''),
    'V[0-9]*$', ''
  ),
  7
) = inp.rf_key
ORDER BY s."REG_COMPLETO";
$function$;
