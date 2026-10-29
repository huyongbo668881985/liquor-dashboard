-- One-row heartbeat so the daily GitHub Action can write through PostgREST.
-- Idempotent. Does not change business rows.
-- anon may only read and update id = 1. authenticated and service_role get nothing.
-- New public tables no longer receive Data API grants automatically
-- (Supabase, 2026-10-30); the GRANT below is the explicit opt-in.
-- The security migration re-asserts this exception when it is re-run.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE IF NOT EXISTS public."KeepAlive" (
  id integer PRIMARY KEY,
  "pingedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "KeepAlive_singleton" CHECK (id = 1)
);

INSERT INTO public."KeepAlive" (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public."KeepAlive" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."KeepAlive" FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, UPDATE ON TABLE public."KeepAlive" TO anon;

DROP POLICY IF EXISTS keepalive_select ON public."KeepAlive";
CREATE POLICY keepalive_select
  ON public."KeepAlive"
  FOR SELECT
  TO anon
  USING (id = 1);

DROP POLICY IF EXISTS keepalive_update ON public."KeepAlive";
CREATE POLICY keepalive_update
  ON public."KeepAlive"
  FOR UPDATE
  TO anon
  USING (id = 1)
  WITH CHECK (id = 1);

NOTIFY pgrst, 'reload schema';
COMMIT;
