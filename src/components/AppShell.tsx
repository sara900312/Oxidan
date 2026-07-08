import { type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Building2, KanbanSquare, Settings, LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, dir, lang, setLang } = useI18n();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const nav = [
    { to: "/dashboard", label: t("nav_dashboard"), icon: LayoutDashboard },
    { to: "/companies", label: t("nav_companies"), icon: Building2 },
    { to: "/pipeline", label: t("nav_pipeline"), icon: KanbanSquare },
    { to: "/settings", label: t("nav_settings"), icon: Settings },
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sideClass = dir === "rtl"
    ? "right-0 border-l border-border"
    : "left-0 border-r border-border";
  const mainClass = dir === "rtl" ? "mr-16" : "ml-16";

  return (
    <div className="min-h-screen text-foreground">
      <aside
        className={cn(
          "group/side fixed inset-y-0 z-40 flex flex-col bg-sidebar/70 backdrop-blur-xl p-3 overflow-hidden",
          "w-16 hover:w-64 transition-[width] duration-300 ease-out",
          sideClass,
        )}
      >
        <Link to="/dashboard" className="mb-8 flex items-center gap-3 px-1 h-16 shrink-0">
          <img src="https://cdn.builder.io/api/v1/image/assets%2F9d309b7f914f488e8f6ac99ff7a649b0%2F80ffd9acbd2c46e89c06d2698814eaa9?format=webp&width=800&height=1200" alt="Oxidan" className="size-14 shrink-0 object-contain" />
          <span className="hidden group-hover/side:inline font-serif text-2xl font-semibold text-primary tracking-tight whitespace-nowrap">
            {t("brand_short")}
          </span>
        </Link>


        <ul className="space-y-1 flex-1">
          {nav.map(item => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap",
                    active
                      ? "bg-white/5 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="hidden group-hover/side:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-4 space-y-2 border-t border-border">
          <div className="hidden group-hover/side:flex items-center gap-1 rounded-full bg-white/5 p-1">
            <button
              onClick={() => setLang("ar")}
              className={cn("flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >العربية</button>
            <button
              onClick={() => setLang("en")}
              className={cn("flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >EN</button>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <LogOut className="size-5 shrink-0" />
            <span className="hidden group-hover/side:inline">{t("auth_signout")}</span>
          </button>
        </div>
      </aside>

      <main className={cn("min-h-screen transition-[margin] duration-300", mainClass)}>
        <div className="max-w-6xl mx-auto p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
