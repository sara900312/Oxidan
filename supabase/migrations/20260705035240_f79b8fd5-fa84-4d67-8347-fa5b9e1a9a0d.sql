
-- Legacy shared access: existing companies at this point in time are shared
-- among all users that existed at this point in time. New users & new companies
-- created afterwards remain per-user isolated.

CREATE TABLE IF NOT EXISTS public.legacy_company_access (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

GRANT SELECT ON public.legacy_company_access TO authenticated;
GRANT ALL ON public.legacy_company_access TO service_role;

ALTER TABLE public.legacy_company_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own legacy access" ON public.legacy_company_access;
CREATE POLICY "users read own legacy access" ON public.legacy_company_access
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Seed: every currently-existing company × every currently-existing user
INSERT INTO public.legacy_company_access (company_id, user_id)
SELECT c.id, u.id
FROM public.companies c
CROSS JOIN auth.users u
ON CONFLICT DO NOTHING;

-- Update companies SELECT policy to include legacy access
DROP POLICY IF EXISTS "companies_select_own" ON public.companies;
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
DROP POLICY IF EXISTS "select_own_companies" ON public.companies;

CREATE POLICY "select_own_or_legacy_companies" ON public.companies
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.legacy_company_access lca
      WHERE lca.company_id = companies.id AND lca.user_id = auth.uid()
    )
  );

-- Analyses: allow read when user can see parent company (own or legacy)
DROP POLICY IF EXISTS "analyses_select_own" ON public.company_analyses;
DROP POLICY IF EXISTS "select_own_analyses" ON public.company_analyses;

CREATE POLICY "select_analyses_via_company" ON public.company_analyses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_analyses.company_id
        AND (
          c.created_by = auth.uid()
          OR c.assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.legacy_company_access lca
            WHERE lca.company_id = c.id AND lca.user_id = auth.uid()
          )
        )
    )
  );

-- Files: same pattern
DROP POLICY IF EXISTS "files_select_own" ON public.company_files;
DROP POLICY IF EXISTS "select_own_files" ON public.company_files;

CREATE POLICY "select_files_via_company" ON public.company_files
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_files.company_id
        AND (
          c.created_by = auth.uid()
          OR c.assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.legacy_company_access lca
            WHERE lca.company_id = c.id AND lca.user_id = auth.uid()
          )
        )
    )
  );

-- Pipeline history: same pattern
DROP POLICY IF EXISTS "pipeline_select_own" ON public.pipeline_history;
DROP POLICY IF EXISTS "select_own_pipeline" ON public.pipeline_history;

CREATE POLICY "select_pipeline_via_company" ON public.pipeline_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = pipeline_history.company_id
        AND (
          c.created_by = auth.uid()
          OR c.assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.legacy_company_access lca
            WHERE lca.company_id = c.id AND lca.user_id = auth.uid()
          )
        )
    )
  );
