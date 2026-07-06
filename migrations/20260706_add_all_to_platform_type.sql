-- ============================================================
-- Migration: Add 'all' to platform_type enum
-- Chạy trong Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TYPE platform_type ADD VALUE IF NOT EXISTS 'all';
