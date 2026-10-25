-- =========================================================
-- Hexacore Email Studio - Supabase Campaigns Schema
-- Project URL: https://poggfmbfvdvobsbsdiqs.supabase.co
-- SQL Editor: https://supabase.com/dashboard/project/poggfmbfvdvobsbsdiqs/sql
-- =========================================================

-- 1. Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'All Users',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 3. Row Level Security Policies (Idempotent)
DROP POLICY IF EXISTS "Allow public select on campaigns" ON public.campaigns;
CREATE POLICY "Allow public select on campaigns" 
ON public.campaigns FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public insert on campaigns" ON public.campaigns;
CREATE POLICY "Allow public insert on campaigns" 
ON public.campaigns FOR INSERT 
TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on campaigns" ON public.campaigns;
CREATE POLICY "Allow public update on campaigns" 
ON public.campaigns FOR UPDATE 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public delete on campaigns" ON public.campaigns;
CREATE POLICY "Allow public delete on campaigns" 
ON public.campaigns FOR DELETE 
TO public 
USING (true);

-- 4. Ready for production campaigns
-- Campaigns will be logged automatically as they are dispatched from the Email Studio dashboard.

