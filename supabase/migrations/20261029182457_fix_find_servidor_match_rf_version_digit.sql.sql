CREATE OR REPLACE FUNCTION public.find_servidor_by_rf_normalized(p_rf text)
RETURNS SETOF servidores_sms
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
WITH inp AS (
  SELECT REPLACE(REPLACE(REPLACE(UPPER($1), '.', ''), ' ', ''), '-', '') AS k
),
inp2 AS (
  SELECT
    LEFT(REGEXP_REPLACE(k, 'V[0-9]*$', ''), 7) AS base,
    COALESCE(SUBSTRING(k FROM 'V[0-9]+$'), '') AS vpart
  FROM inp
)
SELECT s.*
FROM servidores_sms s
CROSS JOIN inp2
CROSS JOIN LATERAL (
  SELECT REPLACE(REPLACE(REPLACE(UPPER(s."REG_COMPLETO"), '.', ''), ' ', ''), '-', '') AS k
) r
WHERE LEFT(REGEXP_REPLACE(r.k, 'V[0-9]*$', ''), 7) = inp2.base
  AND (inp2.vpart = '' OR COALESCE(SUBSTRING(r.k FROM 'V[0-9]+$'), '') = inp2.vpart)
ORDER BY (COALESCE(SUBSTRING(r.k FROM 'V[0-9]+$'), '') = inp2.vpart) DESC
LIMIT 1;
$function$;
