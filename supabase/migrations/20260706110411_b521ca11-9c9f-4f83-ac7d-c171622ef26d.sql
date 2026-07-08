
CREATE TABLE IF NOT EXISTS public.dashboard_snapshots (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  total integer NOT NULL DEFAULT 0,
  high integer NOT NULL DEFAULT 0,
  analyzed integer NOT NULL DEFAULT 0,
  won integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, snapshot_date)
);

GRANT SELECT, INSERT, UPDATE ON public.dashboard_snapshots TO authenticated;
GRANT ALL ON public.dashboard_snapshots TO service_role;

ALTER TABLE public.dashboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own snapshots"
  ON public.dashboard_snapshots FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own snapshots"
  ON public.dashboard_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own snapshots"
  ON public.dashboard_snapshots FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
