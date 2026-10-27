-- =========================================================
-- Hexacore Email Studio - Supabase Inbound Emails Schema
-- Project URL: https://poggfmbfvdvobsbsdiqs.supabase.co
-- SQL Editor: https://supabase.com/dashboard/project/poggfmbfvdvobsbsdiqs/sql
-- =========================================================

-- 1. Create inbound_emails table
CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id TEXT PRIMARY KEY,
  from_name TEXT,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL DEFAULT 'info@hexacore.ng',
  subject TEXT NOT NULL DEFAULT '(No Subject)',
  preview TEXT,
  body_html TEXT,
  is_unread BOOLEAN NOT NULL DEFAULT true,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for speedy ordering by newest received emails
CREATE INDEX IF NOT EXISTS idx_inbound_emails_created_at 
ON public.inbound_emails (created_at DESC);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

-- 3. Row Level Security Policies (Permissive for Studio Dashboard)
DROP POLICY IF EXISTS "Allow public select on inbound_emails" ON public.inbound_emails;
CREATE POLICY "Allow public select on inbound_emails" 
ON public.inbound_emails FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public insert on inbound_emails" ON public.inbound_emails;
CREATE POLICY "Allow public insert on inbound_emails" 
ON public.inbound_emails FOR INSERT 
TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inbound_emails" ON public.inbound_emails;
CREATE POLICY "Allow public update on inbound_emails" 
ON public.inbound_emails FOR UPDATE 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public delete on inbound_emails" ON public.inbound_emails;
CREATE POLICY "Allow public delete on inbound_emails" 
ON public.inbound_emails FOR DELETE 
TO public 
USING (true);

-- 4. Enable Supabase Realtime for instant frontend notifications
-- (Allows instant live updates in frontend without manual page refresh)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'inbound_emails'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inbound_emails;
  END IF;
END $$;
