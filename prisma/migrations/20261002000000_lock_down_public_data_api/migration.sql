-- Single-owner application: authenticated server Prisma connection only.
-- No Supabase Auth identity maps to this application's owner.
-- Idempotent standalone security migration; never changes business rows.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
  tbl record;
  pol record;
BEGIN
  -- Include every public table, including any not yet represented in Prisma.
  FOR tbl IN SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.relname);
    FOR pol IN SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl.relname
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, tbl.relname);
    END LOOP;
  END LOOP;
END $$;

-- Also close views, sequences and RPCs; RLS alone does not guard TRUNCATE or definer RPCs.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Prisma migrations / db push create objects as postgres. Prevent new objects
-- inheriting Supabase's broad Data API grants, even before RLS is enabled.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
-- PUBLIC function EXECUTE originates from global defaults, so revoke globally too.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- No permissive policies: RLS defaults to deny for API roles. The existing
-- server-only postgres connection has BYPASSRLS and keeps its CRUD privileges.
NOTIFY pgrst, 'reload schema';
COMMIT;
