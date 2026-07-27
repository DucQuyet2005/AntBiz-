-- Migration: Harden Landing Configuration identity and rollback
-- Description: Deduplicates live entries, enforces (section, key) uniqueness,
--              and replaces live configuration atomically from a history snapshot.

BEGIN;

WITH ranked_config AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY section, key
      ORDER BY updated_at DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM public.landing_page_config
)
DELETE FROM public.landing_page_config AS config
USING ranked_config
WHERE config.id = ranked_config.id
  AND ranked_config.duplicate_rank > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'landing_page_config_section_key_key'
      AND conrelid = 'public.landing_page_config'::regclass
  ) THEN
    ALTER TABLE public.landing_page_config
      ADD CONSTRAINT landing_page_config_section_key_key UNIQUE (section, key);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.replace_landing_page_config(p_snapshot JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  section_entry RECORD;
  config_entry RECORD;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'Snapshot must be a JSON object' USING ERRCODE = '22023';
  END IF;

  FOR section_entry IN SELECT key, value FROM jsonb_each(p_snapshot)
  LOOP
    IF length(btrim(section_entry.key)) = 0 OR length(section_entry.key) > 255 THEN
      RAISE EXCEPTION 'Invalid configuration section' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(section_entry.value) <> 'object' THEN
      RAISE EXCEPTION 'Snapshot sections must be JSON objects' USING ERRCODE = '22023';
    END IF;

    FOR config_entry IN SELECT key FROM jsonb_each(section_entry.value)
    LOOP
      IF length(btrim(config_entry.key)) = 0 OR length(config_entry.key) > 255 THEN
        RAISE EXCEPTION 'Invalid configuration key' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END LOOP;

  DELETE FROM public.landing_page_config;

  INSERT INTO public.landing_page_config (section, key, value, updated_by, updated_at)
  SELECT
    section_entry.key,
    config_entry.key,
    config_entry.value,
    auth.uid(),
    timezone('utc'::text, now())
  FROM jsonb_each(p_snapshot) AS section_entry
  CROSS JOIN LATERAL jsonb_each(section_entry.value) AS config_entry;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_landing_page_config(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_landing_page_config(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.replace_landing_page_config(JSONB) TO authenticated;

COMMIT;
