-- Migration: Harden Gemini Capacity and add atomic key claims
-- Apply before deploying the Gemini Capacity backend module.

BEGIN;

UPDATE public.gemini_api_keys
SET status = 'invalid'
WHERE status NOT IN ('active', 'rate_limited', 'invalid');

UPDATE public.gemini_api_keys
SET error_count = 0
WHERE error_count < 0;

ALTER TABLE public.gemini_api_keys
  ADD COLUMN IF NOT EXISTS key_hint TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN length(key_value) <= 12 THEN repeat('•', length(key_value))
      ELSE left(key_value, 6) || '...' || right(key_value, 6)
    END
  ) STORED;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gemini_api_keys_status_check'
      AND conrelid = 'public.gemini_api_keys'::regclass
  ) THEN
    ALTER TABLE public.gemini_api_keys
      ADD CONSTRAINT gemini_api_keys_status_check
      CHECK (status IN ('active', 'rate_limited', 'invalid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gemini_api_keys_error_count_check'
      AND conrelid = 'public.gemini_api_keys'::regclass
  ) THEN
    ALTER TABLE public.gemini_api_keys
      ADD CONSTRAINT gemini_api_keys_error_count_check
      CHECK (error_count >= 0);
  END IF;
END
$$;

DROP POLICY IF EXISTS "gemini_api_keys: authenticated read"
  ON public.gemini_api_keys;

REVOKE SELECT ON TABLE public.gemini_api_keys FROM authenticated;
GRANT SELECT (
  id,
  label,
  status,
  rate_limited_until,
  error_count,
  last_used_at,
  created_at,
  updated_at,
  key_hint
) ON public.gemini_api_keys TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_gemini_capacity_key(
  p_excluded_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
  id UUID,
  key_value TEXT,
  status TEXT,
  rate_limited_until TIMESTAMPTZ,
  error_count INTEGER,
  last_used_at TIMESTAMPTZ
)
LANGUAGE SQL
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH candidate AS (
    SELECT keys.id
    FROM public.gemini_api_keys AS keys
    WHERE NOT (keys.id = ANY(COALESCE(p_excluded_ids, ARRAY[]::UUID[])))
      AND (
        keys.status = 'active'
        OR (
          keys.status = 'rate_limited'
          AND (
            keys.rate_limited_until IS NULL
            OR keys.rate_limited_until <= now()
          )
        )
      )
    ORDER BY keys.last_used_at ASC NULLS FIRST, keys.id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  ), claimed AS (
    UPDATE public.gemini_api_keys AS keys
    SET
      last_used_at = now(),
      updated_at = now()
    FROM candidate
    WHERE keys.id = candidate.id
    RETURNING
      keys.id,
      keys.key_value,
      keys.status,
      keys.rate_limited_until,
      keys.error_count,
      keys.last_used_at
  )
  SELECT
    claimed.id,
    claimed.key_value,
    claimed.status,
    claimed.rate_limited_until,
    claimed.error_count,
    claimed.last_used_at
  FROM claimed;
$$;

REVOKE ALL ON FUNCTION public.claim_gemini_capacity_key(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_gemini_capacity_key(UUID[]) FROM anon;
REVOKE ALL ON FUNCTION public.claim_gemini_capacity_key(UUID[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_gemini_capacity_key(UUID[]) TO service_role;

COMMIT;
