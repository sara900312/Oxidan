ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.company_analyses ADD COLUMN IF NOT EXISTS data_hash text;
ALTER TABLE public.company_analyses ADD COLUMN IF NOT EXISTS changed_fields jsonb;
CREATE INDEX IF NOT EXISTS company_analyses_company_id_version_idx ON public.company_analyses(company_id, version DESC);