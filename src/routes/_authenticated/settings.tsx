import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
      setProfile(data);
    })();
  }, []);

  async function save() {
    if (!profile) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: profile.full_name,
        job_title: profile.job_title,
        department: profile.department,
        language_pref: lang,
      }).eq("id", profile.id);
      if (error) throw error;
      toast.success(t("toast_saved"));
    } catch (e: any) { toast.error(e?.message ?? t("toast_error")); }
    finally { setLoading(false); }
  }

  if (!profile) return <div className="text-sm text-muted-foreground">…</div>;

  return (
    <div className="max-w-xl space-y-8">
      <header>
        <h1 className="font-serif text-4xl font-semibold">{t("nav_settings")}</h1>
        <p className="mt-2 text-muted-foreground">{t("profile")}</p>
      </header>

      <section className="glass-card rounded-2xl p-6 space-y-4">
        <Field label={t("auth_email")} value={profile.email ?? ""} onChange={() => {}} disabled />
        <Field label={t("auth_fullname")} value={profile.full_name ?? ""} onChange={(v: string) => setProfile({ ...profile, full_name: v })} />
        <Field label={t("job_title")} value={profile.job_title ?? ""} onChange={(v: string) => setProfile({ ...profile, job_title: v })} />
        <Field label={t("department")} value={profile.department ?? ""} onChange={(v: string) => setProfile({ ...profile, department: v })} />
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("language")}</div>
          <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 w-fit">
            <button onClick={() => setLang("ar")} className={`rounded-full px-4 py-1.5 text-sm ${lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t("arabic")}</button>
            <button onClick={() => setLang("en")} className={`rounded-full px-4 py-1.5 text-sm ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t("english")}</button>
          </div>
        </div>
        <button onClick={save} disabled={loading}
          className="rounded-xl px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold gold-glow disabled:opacity-50">
          {loading ? "..." : t("save")}
        </button>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, disabled }: any) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <input value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/[0.03] border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 disabled:opacity-60" />
    </label>
  );
}
