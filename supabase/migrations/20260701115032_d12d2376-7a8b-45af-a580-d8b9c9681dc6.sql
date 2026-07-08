
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','bd','sales','manager','marketing','viewer');
CREATE TYPE public.company_priority AS ENUM ('high','medium','low','unranked');
CREATE TYPE public.pipeline_stage AS ENUM ('new_lead','researching','ai_analyzed','qualified','contact_ready','meeting_scheduled','proposal_sent','negotiation','won','lost');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  job_title TEXT,
  department TEXT,
  language_pref TEXT NOT NULL DEFAULT 'ar',
  theme_pref TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles insert self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles read self" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- COMPANIES
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  linkedin TEXT,
  facebook TEXT,
  instagram TEXT,
  employees TEXT,
  company_size TEXT,
  products TEXT,
  services TEXT,
  decision_maker TEXT,
  has_crm BOOLEAN,
  has_erp BOOLEAN,
  has_automation BOOLEAN,
  uses_ai BOOLEAN,
  marketing_notes TEXT,
  raw_notes TEXT,
  notes TEXT,
  priority public.company_priority NOT NULL DEFAULT 'unranked',
  priority_score INTEGER,
  priority_reason TEXT,
  stage public.pipeline_stage NOT NULL DEFAULT 'new_lead',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies all authenticated" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX companies_stage_idx ON public.companies(stage);
CREATE INDEX companies_priority_idx ON public.companies(priority);
CREATE INDEX companies_archived_idx ON public.companies(archived);

-- COMPANY ANALYSES (versioned reports)
CREATE TABLE public.company_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  report JSONB NOT NULL,
  language TEXT NOT NULL DEFAULT 'ar',
  model TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_analyses TO authenticated;
GRANT ALL ON public.company_analyses TO service_role;
ALTER TABLE public.company_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analyses all authenticated" ON public.company_analyses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX analyses_company_idx ON public.company_analyses(company_id, created_at DESC);

-- COMPANY FILES
CREATE TABLE public.company_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_files TO authenticated;
GRANT ALL ON public.company_files TO service_role;
ALTER TABLE public.company_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files all authenticated" ON public.company_files FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PIPELINE HISTORY
CREATE TABLE public.pipeline_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_stage public.pipeline_stage,
  to_stage public.pipeline_stage NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pipeline_history TO authenticated;
GRANT ALL ON public.pipeline_history TO service_role;
ALTER TABLE public.pipeline_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history read authenticated" ON public.pipeline_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "history insert authenticated" ON public.pipeline_history FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATED_AT trigger
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER touch_companies BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Auto-create profile + admin role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Pipeline history trigger
CREATE OR REPLACE FUNCTION public.tg_log_stage_change() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    INSERT INTO public.pipeline_history(company_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.stage END, NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER log_company_stage AFTER INSERT OR UPDATE OF stage ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.tg_log_stage_change();
