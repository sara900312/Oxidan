import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import logoAsset from "@/assets/oxidan-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang, dir } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success(lang === "ar" ? "تم إنشاء الحساب" : "Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err?.message ?? t("toast_error"));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw new Error(result.error.message || "OAuth error");
      if (result.redirected) return;
    } catch (err: any) {
      toast.error(err?.message ?? t("toast_error"));
      setLoading(false);
    }
  }

  return (
    <div dir={dir} className="min-h-screen grid lg:grid-cols-2">
      {/* Hero side */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-l border-border relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40" style={{ background: "radial-gradient(ellipse 50% 40% at 30% 20%, oklch(0.76 0.11 82 / 30%), transparent 60%)" }} />
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <img src={logoAsset.url} alt="Oxidan" className="h-56 w-auto object-contain drop-shadow-2xl" />
          <div className="text-center">
            <h1 className="font-serif text-5xl italic text-foreground leading-tight max-w-md">
              {t("auth_hero_title")}
            </h1>
            <p className="mt-6 text-muted-foreground max-w-md text-lg leading-relaxed">
              {t("auth_hero_sub")}
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Oxidan · AI BD CRM</div>
      </div>

      {/* Form side */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-end">
            <div className="flex items-center gap-1 rounded-full bg-white/5 p-1">
              <button onClick={() => setLang("ar")} className={`rounded-full px-3 py-1 text-xs font-semibold ${lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>AR</button>
              <button onClick={() => setLang("en")} className={`rounded-full px-3 py-1 text-xs font-semibold ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>EN</button>
            </div>
          </div>

          <h2 className="font-serif text-3xl mb-2">{mode === "signin" ? t("auth_signin") : t("auth_signup")}</h2>
          <p className="text-sm text-muted-foreground mb-8">{t("app_name")}</p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <input
                type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder={t("auth_fullname")}
                className="w-full rounded-xl bg-white/[0.03] border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary/60 transition"
              />
            )}
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t("auth_email")}
              className="w-full rounded-xl bg-white/[0.03] border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary/60 transition"
            />
            <input
              type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              placeholder={t("auth_password")}
              className="w-full rounded-xl bg-white/[0.03] border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary/60 transition"
            />
            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm gold-glow hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "..." : (mode === "signin" ? t("auth_signin") : t("auth_signup"))}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("auth_or")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={google} disabled={loading}
            className="w-full rounded-xl border border-border bg-white/[0.02] py-3 text-sm font-medium hover:bg-white/[0.05] transition disabled:opacity-50"
          >
            {t("auth_google")}
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? t("auth_no_account") : t("auth_have_account")}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "signin" ? t("auth_signup") : t("auth_signin")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
