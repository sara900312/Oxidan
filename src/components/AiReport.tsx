import { useI18n } from "@/lib/i18n";
import {
  FileText, Sparkles, Globe, Palette, Share2, Cpu, Zap, Users, HeartHandshake,
  ThumbsUp, ThumbsDown, TrendingUp, AlertTriangle, Target, MessageSquare,
  Calendar, Handshake, Wallet, Percent, Gauge, ListChecks, Grid3x3, Download,
  CheckCircle2, HelpCircle, ClipboardList, Lightbulb, Shield,
} from "lucide-react";

type Bi = { ar?: string; en?: string } | string | null | undefined;
type Report = Record<string, any>;

const TEXT_SECTIONS: Array<{ key: string; icon: any; labelKey: string }> = [
  { key: "executive_summary",       icon: Sparkles,       labelKey: "executive_summary" },
  { key: "sales_recommendation",    icon: Target,         labelKey: "sales_recommendation" },
  { key: "business_overview",       icon: FileText,       labelKey: "business_overview" },
  { key: "digital_assessment",      icon: Globe,          labelKey: "digital_assessment" },
  { key: "business_assessment",     icon: Shield,         labelKey: "business_assessment" },
  { key: "digital_presence",        icon: Globe,          labelKey: "digital_presence" },
  { key: "website_review",          icon: Globe,          labelKey: "website_review" },
  { key: "branding_review",         icon: Palette,        labelKey: "branding_review" },
  { key: "social_review",           icon: Share2,         labelKey: "social_review" },
  { key: "tech_review",             icon: Cpu,            labelKey: "tech_review" },
  { key: "automation_review",       icon: Zap,            labelKey: "automation_review" },
  { key: "crm_analysis",            icon: Users,          labelKey: "crm_analysis" },
  { key: "erp_analysis",            icon: Users,          labelKey: "erp_analysis" },
  { key: "customer_experience",     icon: HeartHandshake, labelKey: "customer_experience" },
  { key: "sales_strategy",          icon: Target,         labelKey: "sales_strategy" },
  { key: "decision_maker_strategy", icon: Users,          labelKey: "decision_maker_strategy" },
  { key: "proposal",                icon: Handshake,      labelKey: "proposal" },
  { key: "followup",                icon: Calendar,       labelKey: "followup" },
];

const LIST_SECTIONS: Array<{ key: string; icon: any; labelKey: string; tone?: "good" | "bad" | "info" | "warn" }> = [
  { key: "evidence_collected",       icon: CheckCircle2, labelKey: "evidence_collected",       tone: "good" },
  { key: "confirmed_facts",          icon: ShieldIcon,   labelKey: "confirmed_facts_section",  tone: "good" },
  { key: "ai_observations",          icon: Lightbulb,    labelKey: "ai_observations",          tone: "info" },
  { key: "missing_information",      icon: HelpCircle,   labelKey: "missing_information",      tone: "warn" },
  { key: "strengths",                icon: ThumbsUp,     labelKey: "strengths",                tone: "good" },
  { key: "weaknesses",               icon: ThumbsDown,   labelKey: "weaknesses",               tone: "bad"  },
  { key: "opportunities",            icon: TrendingUp,   labelKey: "opportunities",            tone: "info" },
  { key: "risks",                    icon: AlertTriangle,labelKey: "risks",                    tone: "warn" },
  { key: "recommended_services",     icon: Target,       labelKey: "recommended_services",     tone: "info" },
  { key: "questions_before_contact", icon: ClipboardList,labelKey: "questions_before_contact", tone: "warn" },
  { key: "next_actions",             icon: ListChecks,   labelKey: "next_actions",             tone: "info" },
];

function ShieldIcon(props: any) { return <Shield {...props} />; }

const TONE: Record<string, string> = {
  good: "text-emerald-400",
  bad:  "text-red-400",
  warn: "text-amber-400",
  info: "text-primary",
};

function pick(v: Bi, lang: "ar" | "en"): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return (v[lang] ?? v.en ?? v.ar ?? "") as string;
}

export function AiReport({ report, createdAt }: { report: Report; createdAt?: string }) {
  const { t, lang } = useI18n();

  async function exportPdf() {
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    const el = document.getElementById("ai-report-root");
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: "#0a0a0f", scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const w = pdf.internal.pageSize.getWidth();
    const h = canvas.height * w / canvas.width;
    let position = 0;
    let remaining = h;
    while (remaining > 0) {
      pdf.addImage(img, "PNG", 0, position, w, h);
      remaining -= pdf.internal.pageSize.getHeight();
      if (remaining > 0) { pdf.addPage(); position -= pdf.internal.pageSize.getHeight(); }
    }
    pdf.save("ai-report.pdf");
  }

  const difficulty = report.sales_difficulty;
  const difficultyLabel = typeof difficulty === "string" && ["low","medium","high"].includes(difficulty)
    ? t(("difficulty_" + difficulty) as any) : (pick(difficulty as Bi, lang) || "—");

  const budgetLabel = pick(report.estimated_budget as Bi, lang) || "—";

  return (
    <div id="ai-report-root" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-3xl">{t("report_title")}</h2>
          {createdAt && <p className="text-xs text-muted-foreground mt-1">{new Date(createdAt).toLocaleString()}</p>}
        </div>
        <button onClick={exportPdf} className="glass-card px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 hover:border-primary/50">
          <Download className="size-4" />PDF
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Percent className="size-4" />} label={t("probability_close")} value={report.probability_close} suffix="%" />
        <Metric icon={<Percent className="size-4" />} label={t("probability_success")} value={report.probability_success} suffix="%" />
        <Metric icon={<Gauge className="size-4" />} label={t("sales_difficulty")} value={difficultyLabel} />
        <Metric icon={<Wallet className="size-4" />} label={t("estimated_budget")} value={budgetLabel} />
      </div>

      {TEXT_SECTIONS.map(s => {
        const val = pick(report[s.key], lang);
        if (!val) return null;
        const Icon = s.icon;
        return (
          <section key={s.key} className="glass-card rounded-2xl p-6">
            <h3 className="font-serif text-xl flex items-center gap-2 mb-4">
              <span className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center"><Icon className="size-4" /></span>
              {t(s.labelKey as any)}
            </h3>
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{val}</p>
          </section>
        );
      })}

      {LIST_SECTIONS.map(s => {
        const val = report[s.key];
        if (!Array.isArray(val) || val.length === 0) return null;
        const Icon = s.icon;
        return (
          <section key={s.key} className="glass-card rounded-2xl p-6">
            <h3 className="font-serif text-xl flex items-center gap-2 mb-4">
              <span className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center"><Icon className="size-4" /></span>
              {t(s.labelKey as any)}
            </h3>
            <ul className="space-y-2">
              {val.map((it: any, i: number) => {
                const line = pick(it, lang);
                if (!line) return null;
                return (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className={`${TONE[s.tone ?? "info"]} mt-1`}>◆</span>
                    <span className="flex-1 leading-relaxed">{line}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {Array.isArray(report.objections) && report.objections.length > 0 && (
        <section className="glass-card rounded-2xl p-6">
          <h3 className="font-serif text-xl flex items-center gap-2 mb-4">
            <span className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center"><MessageSquare className="size-4" /></span>
            {t("objections")}
          </h3>
          <ul className="space-y-3">
            {report.objections.map((o: any, i: number) => (
              <li key={i} className="rounded-xl border border-border p-4">
                <div className="text-sm font-semibold text-red-300">{pick(o.objection, lang)}</div>
                <div className="mt-2 text-sm text-foreground/90 leading-relaxed">→ {pick(o.response, lang)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.swot && (
        <section className="glass-card rounded-2xl p-6">
          <h3 className="font-serif text-xl flex items-center gap-2 mb-4">
            <span className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center"><Grid3x3 className="size-4" /></span>
            {t("swot")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(["strengths","weaknesses","opportunities","threats"] as const).map(k => (
              <div key={k} className="rounded-xl bg-white/[0.02] border border-border p-4">
                <div className="text-xs uppercase tracking-wider text-primary mb-2">{t(k === "threats" ? "risks" : (k as any))}</div>
                <ul className="space-y-1 text-sm">
                  {(report.swot[k] ?? []).map((it: any, i: number) => <li key={i}>• {pick(it, lang)}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ icon, label, value, suffix }: any) {
  const disp = value == null || value === "" ? "—" : `${value}${suffix ?? ""}`;
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-2 font-serif text-2xl">{disp}</div>
    </div>
  );
}
