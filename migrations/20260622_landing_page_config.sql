-- Migration: Landing Page Editor Config
-- Description: Creates tables for storing and versioning the Landing Page configuration.

CREATE TABLE IF NOT EXISTS public.landing_page_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    section VARCHAR(255) NOT NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index on key and section for fast lookups
CREATE INDEX IF NOT EXISTS idx_landing_page_config_key ON public.landing_page_config(key);
CREATE INDEX IF NOT EXISTS idx_landing_page_config_section ON public.landing_page_config(section);

CREATE TABLE IF NOT EXISTS public.landing_page_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_snapshot JSONB NOT NULL,
    note VARCHAR(500),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.landing_page_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access to config (since landing page is public)
CREATE POLICY "Public profiles are viewable by everyone" ON public.landing_page_config
    FOR SELECT USING (true);

-- Allow full access to authenticated admins only for modifications
CREATE POLICY "Admins have full access to config" ON public.landing_page_config
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Admins have full access to history" ON public.landing_page_history
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );
