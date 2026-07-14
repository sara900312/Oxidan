import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  listCompanies, priorityColor, getDashboardStatsWithDeltas,
  type Company, type DashboardStatsWithDeltas,
} from "@/lib/companies";
import { useI18n } from "@/lib/i18n";
import { rankAllCompanies } from "@/lib/ai.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Building2, TrendingUp, CheckCircle2, ArrowUpRight, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

type SortKey = "score" | "priority" | "industry" | "city" | "recent_analysis";

function DashboardPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
      } else {
        setAuthed(true);
      }
    })();
  }, [navigate]);

  if (!authed) return null;

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => listCompanies(),
  });

  const { data: stats, isLoading: loadingStats } = useQuery<DashboardStatsWithDeltas>({
    queryKey: ["dashboard-stats", companies.length, companies.map(c => c.priority + c.stage).join(",")],
    queryFn: () => getDashboardStatsWithDeltas(companies),
    enabled: !loadingCompanies,
  });

  const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1, unranked: 0 };

  const topPriority = useMemo(() => {
    const rows = [...companies];
    switch (sortKey) {
      case "score":
        rows.sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
        break;
      case "priority":
        rows.sort((a, b) => (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0)
          || (b.priority_score ?? 0) - (a.priority_score ?? 0));
        break;
      case "industry":
        rows.sort((a, b) => (a.industry ?? "").localeCompare(b.industry ?? ""));
        break;
      case "city":
        rows.sort((a, b) => (a.city ?? "").localeCompare(b.city ?? ""));
        break;
      case "recent_analysis":
        rows.sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
        break;
    }
    return rows.slice(0, 8);
  }, [companies, sortKey]);

  const rank = useMutation({
    mutationFn: async () => rankAllCompanies({ data: { language: lang } }),
    onSuccess: () => { toast.success(t("toast_ranked")); qc.invalidateQueries({ queryKey: ["companies"] }); },
    onError: (e: any) => toast.error(e?.message ?? t("toast_error")),
  });

  return (
    <div className="space-y-10">
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">{t("dashboard_title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("dashboard_sub")}</p>
        </div>
        <button
          onClick={() => rank.mutate()}
          disabled={rank.isPending || companies.length === 0}
          className="glass-card px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:border-primary/50 transition disabled:opacity-50"
        >
          <Sparkles className="size-4 text-primary" />
          {rank.isPending ? t("analyzing") : t("companies_analyze_all")}
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Building2 className="size-4" />}
          label={t("kpi_total")}
          value={stats?.total ?? 0}
          delta={stats?.delta_week?.total}
          deltaLabel={t("delta_this_week")}
          emptyMsg={t("empty_total")}
          loading={loadingStats}
        />
        <Kpi
          icon={<TrendingUp className="size-4" />}
          label={t("kpi_high")}
          value={stats?.high ?? 0}
          delta={stats?.delta_day?.high}
          deltaLabel={t("delta_since_yesterday")}
          emptyMsg={t("empty_high")}
          loading={loadingStats}
          tone="emerald"
        />
        <Kpi
          icon={<Sparkles className="size-4" />}
          label={t("kpi_analyzed")}
          value={stats?.analyzed ?? 0}
          delta={stats?.delta_day?.analyzed}
          deltaLabel={t("delta_since_yesterday")}
          emptyMsg={t("empty_analyzed")}
          loading={loadingStats}
        />
        <KpiLink
          to="/companies"
          search={{ stage: "won" }}
          icon={<CheckCircle2 className="size-4" />}
          label={t("kpi_won")}
          value={stats?.won ?? 0}
          delta={stats?.delta_week?.won}
          deltaLabel={t("delta_this_week")}
          emptyMsg={t("empty_won")}
          loading={loadingStats}
          tone="gold"
        />
      </div>

      <section className="glass-card rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-serif text-xl">{t("top_priority")}</h2>
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground flex items-center gap-2">
              {t("sort_by")}
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="bg-transparent border border-border rounded-lg px-2 py-1 text-xs"
              >
                <option value="score">{t("sort_score")}</option>
                <option value="priority">{t("sort_priority")}</option>
                <option value="industry">{t("sort_industry")}</option>
                <option value="city">{t("sort_city")}</option>
                <option value="recent_analysis">{t("sort_recent_analysis")}</option>
              </select>
            </label>
            <Link to="/companies" className="text-sm text-primary hover:underline flex items-center gap-1">
              {t("nav_companies")} <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {loadingCompanies ? (
          <ul className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i}><Skeleton className="h-12 w-full" /></li>
            ))}
          </ul>
        ) : topPriority.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("empty_top_priority")}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {topPriority.map(c => <TopRow key={c.id} c={c} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- KPI cards ----------

type KpiProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  delta?: number;
  deltaLabel: string;
  emptyMsg: string;
  loading?: boolean;
  tone?: "gold" | "emerald";
};

function KpiInner({ icon, label, value, delta, deltaLabel, emptyMsg, loading, tone }: KpiProps) {
  const toneCls = tone === "gold" ? "text-primary" : tone === "emerald" ? "text-emerald-400" : "text-muted-foreground";
  return (
    <>
      <div className={`flex items-center gap-2 text-xs uppercase tracking-wider ${toneCls}`}>
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-10 w-24" />
      ) : value === 0 ? (
        <div className="mt-3 space-y-1">
          <div className="font-serif text-4xl font-semibold opacity-40">0</div>
          <p className="text-[11px] text-muted-foreground leading-snug">{emptyMsg}</p>
        </div>
      ) : (
        <>
          <div className="mt-3 font-serif text-4xl font-semibold">{value}</div>
          <DeltaBadge delta={delta} label={deltaLabel} />
        </>
      )}
    </>
  );
}

function Kpi(props: KpiProps) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <KpiInner {...props} />
    </div>
  );
}

function KpiLink(props: KpiProps & { to: string; search?: Record<string, string> }) {
  const { to, search, ...rest } = props;
  return (
    <Link
      to={to}
      search={search as any}
      className="glass-card rounded-2xl p-5 block hover:border-primary/50 transition cursor-pointer"
    >
      <KpiInner {...rest} />
    </Link>
  );
}

function DeltaBadge({ delta, label }: { delta?: number; label: string }) {
  const { t } = useI18n();
  if (delta === undefined) {
    return <div className="mt-2 text-[11px] text-muted-foreground/60">{t("delta_baseline")}</div>;
  }
  const sign = delta > 0 ? "+" : "";
  const cls = delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-muted-foreground";
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  return (
    <div className={`mt-2 text-[11px] inline-flex items-center gap-1 ${cls}`}>
      <Icon className="size-3" />
      <span className="font-semibold">{sign}{delta}</span>
      <span className="text-muted-foreground/80">{label}</span>
    </div>
  );
}

function TopRow({ c }: { c: Company }) {
  const { t } = useI18n();
  const p = priorityColor(c.priority);
  return (
    <li className="py-3 flex items-center justify-between gap-3">
      <Link to="/companies/$id" params={{ id: c.id }} className="flex-1 min-w-0 flex items-center gap-3 hover:opacity-90 transition">
        <span className="size-2 rounded-full shrink-0" style={{ background: p.dot }} />
        <div className="min-w-0">
          <div className="font-medium truncate">{c.name}</div>
          <div className="text-xs text-muted-foreground truncate">{[c.industry, c.city, c.country].filter(Boolean).join(" · ")}</div>
        </div>
      </Link>
      <span className={`text-xs px-2.5 py-1 rounded-full ring-1 shrink-0 ${p.ring}`}>
        {t(p.label as any)}{typeof c.priority_score === "number" ? ` · ${c.priority_score}` : ""}
      </span>
    </li>
  );
}
