
-- Assign orphan companies (created_by NULL) to the earliest existing user so nothing is lost
DO $$
DECLARE earliest UUID;
BEGIN
  SELECT id INTO earliest FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF earliest IS NOT NULL THEN
    UPDATE public.companies SET created_by = earliest WHERE created_by IS NULL;
  END IF;
END $$;

-- Companies: per-owner isolation
DROP POLICY IF EXISTS "companies all authenticated" ON public.companies;
CREATE POLICY "companies select own" ON public.companies FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid());
CREATE POLICY "companies insert own" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "companies update own" ON public.companies FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid())
  WITH CHECK (created_by = auth.uid() OR assigned_to = auth.uid());
CREATE POLICY "companies delete own" ON public.companies FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Analyses: scoped by parent company visibility
DROP POLICY IF EXISTS "analyses all authenticated" ON public.company_analyses;
CREATE POLICY "analyses via company" ON public.company_analyses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id
    AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id
    AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid())));

-- Files: scoped by parent company visibility
DROP POLICY IF EXISTS "files all authenticated" ON public.company_files;
CREATE POLICY "files via company" ON public.company_files FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id
    AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id
    AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid())));

-- Pipeline history: scoped by parent company visibility
DROP POLICY IF EXISTS "history read authenticated" ON public.pipeline_history;
DROP POLICY IF EXISTS "history insert authenticated" ON public.pipeline_history;
CREATE POLICY "history read via company" ON public.pipeline_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id
    AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid())));
CREATE POLICY "history insert via company" ON public.pipeline_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id
    AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid())));
