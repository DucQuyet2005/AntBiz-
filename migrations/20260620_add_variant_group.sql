-- ============================================================
-- T-1.18 Migration: Add variant_group_id and variant_index to captions
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE public.captions 
  ADD COLUMN IF NOT EXISTS variant_group_id UUID,
  ADD COLUMN IF NOT EXISTS variant_index    INTEGER DEFAULT 0;

COMMENT ON COLUMN public.captions.variant_group_id IS 
  'Groups multiple caption variants generated together from the same article+prompt. NULL = standalone caption (not part of a multi-variant batch).';
COMMENT ON COLUMN public.captions.variant_index IS 
  'Index within the variant group (0=A, 1=B, 2=C). Default 0 for standalone captions.';

CREATE INDEX IF NOT EXISTS captions_variant_group_id_idx ON public.captions(variant_group_id)
  WHERE variant_group_id IS NOT NULL;
