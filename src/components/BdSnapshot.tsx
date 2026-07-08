import { useI18n } from "@/lib/i18n";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Gauge, ShieldCheck, Target, ListChecks, Rocket } from "lucide-react";

type Bi = { ar?: string; en?: string } | string | null | undefined;
type Row = { key: string; status?: "green" | "orange" | "red" | "gray"; label?: Bi; explanation?: Bi };
type Risk = "low" | "medium" | "high" | undefined;
type Snapshot = {
  sales_opportunity?: number;
  analysis_confidence?: number;
  lead_readiness?: number;
  evidence_count?: number;
  missing_info_count?: number;
  confirmed_facts_count?: number;
  business_risk?: Risk;
  sales_risk?: Risk;
  information_risk?: Risk;
  final_decision?: "ready_to_contact" | "research_more" | "low_priority";
  final_decision_reason?: Bi;
  score_breakdown?: Bi;
  // legacy fields tolerated
  recommendation?: "contact_now" | "research_more" | "low_priority";
  recommendation_text?: Bi;
  rows?: Row[];
};

const ROW_LABELS: Record<string, { ar: string; en: string }> = {
  business_activity: { ar: "النشاط التجاري", en: "Business Activity" },
  digital_presence: { ar: "الحضور الرقمي", en: "Digital Presence" },
  website: { ar: "الموقع الإلكتروني", en: "Website" },
  social_media: { ar: "شبكات التواصل", en: "Social Media" },
  google_maps: { ar: "خرائط Google", en: "Google Maps" },
  phone_availability: { ar: "توفر الهاتف", en: "Phone Availability" },
  email_availability: { ar: "توفر البريد", en: "Email Availability" },
  ease_of_contact: { ar: "سهولة التواصل", en: "Ease of Contact" },
  decision_maker_availability: { ar: "توفر صانع القرار", en: "Decision Maker Availability" },
  website_opportunity: { ar: "فرصة موقع إلكتروني", en: "Website Opportunity" },
  crm_opportunity: { ar: "فرصة CRM", en: "CRM Opportunity" },
  erp_opportunity: { ar: "فرصة ERP", en: "ERP Opportunity" },
  ai_opportunity: { ar: "فرصة الذكاء الاصطناعي", en: "AI Opportunity" },
  automation_opportunity: { ar: "فرصة الأتمتة", en: "Automation Opportunity" },
  branding_opportunity: { ar: "فرصة الهوية البصرية", en: "Branding Opportunity" },
  seo_opportunity: { ar: "فرصة SEO", en: "SEO Opportunity" },
  digital_transformation_opportunity: { ar: "فرصة التحول الرقمي", en: "Digital Transformation Opportunity" },
  estimated_sales_opportunity: { ar: "فرصة البيع التقديرية", en: "Estimated Sales Opportunity" },
  estimated_closing_probability: { ar: "احتمالية إتمام الصفقة", en: "Estimated Closing Probability" },
  priority_level: { ar: "مستوى الأولوية", en: "Priority Level" },
  overall_recommendation: { ar: "التوصية العامة", en: "Overall Recommendation" },
};

const STATUS_STYLE: Record<string, { ring: string; dot: string; icon: any; labelAr: string; labelEn: string }> = {
  green:  { ring: "ring-emerald-500/40 bg-emerald-500/10 text-emerald-300", dot: "bg-emerald-400", icon: CheckCircle2, labelAr: "فرصة قوية", labelEn: "Strong" },
  orange: { ring: "ring-amber-500/40 bg-amber-500/10 text-amber-300",     dot: "bg-amber-400",   icon: AlertTriangle, labelAr: "بحاجة للتحقق", labelEn: "Verify" },
  red:    { ring: "ring-red-500/40 bg-red-500/10 text-red-300",           dot: "bg-red-400",     icon: XCircle,       labelAr: "ضعيف / غير موجود", labelEn: "Weak / Missing" },
  gray:   { ring: "ring-white/10 bg-white/[0.04] text-muted-foreground",  dot: "bg-slate-500",   icon: HelpCircle,    labelAr: "غير معروف", labelEn: "Unknown" },
};

const RISK_STYLE: Record<string, string> = {
  low:    "ring-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  medium: "ring-amber-500/40 bg-amber-500/10 text-amber-300",
  high:   "ring-red-500/40 bg-red-500/10 text-red-300",
};

function pick(v: Bi, lang: "ar" | "en"): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return (v[lang] ?? v.en ?? v.ar ?? "") as string;
}

export function BdSnapshot({ snapshot }: { snapshot: Snapshot | undefined }) {
  const { t, lang, dir } = useI18n();
  if (!snapshot || !snapshot.rows || snapshot.rows.length === 0) return null;

  const decision = snapshot.final_decision
    ?? (snapshot.recommendation === "contact_now" ? "ready_to_contact" : snapshot.recommendation);

  const decisionStyle =
    decision === "ready_to_contact" ? STATUS_STYLE.green :
    decision === "research_more"    ? STATUS_STYLE.orange :
    decision === "low_priority"     ? STATUS_STYLE.red    : STATUS_STYLE.gray;

  const decisionLabel =
    decision === "ready_to_contact" ? t("decision_ready") :
    decision === "research_more"    ? t("decision_research") :
    decision === "low_priority"     ? t("decision_low") :
    (lang === "ar" ? "قيد التقييم" : "Under Review");

  const decisionReason = pick(snapshot.final_decision_reason ?? snapshot.recommendation_text, lang);
  const scoreBreakdown = pick(snapshot.score_breakdown, lang);

  return (
    <section id="bd-snapshot" className="glass-card rounded-3xl p-6 md:p-8 space-y-6" dir={dir}>
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-primary/80">{t("snapshot_eyebrow")}</div>
          <h2 className="font-serif text-2xl md:text-3xl mt-1">{t("snapshot_title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("snapshot_sub")}</p>
        </div>
        <div className={`px-4 py-2 rounded-2xl ring-1 ${decisionStyle.ring} font-semibold`}>{decisionLabel}</div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric icon={<Target className="size-4" />}     label={t("sales_opportunity")}    value={fmtScore(snapshot.sales_opportunity)} />
        <Metric icon={<Rocket className="size-4" />}     label={t("lead_readiness")}       value={fmtScore(snapshot.lead_readiness)} />
        <Metric icon={<Gauge className="size-4" />}      label={t("analysis_confidence")}  value={fmtScore(snapshot.analysis_confidence)} />
        <Metric icon={<ShieldCheck className="size-4" />} label={t("confirmed_facts")}     value={numOrDash(snapshot.confirmed_facts_count)} />
        <Metric icon={<ListChecks className="size-4" />}  label={t("evidence_count")}     value={numOrDash(snapshot.evidence_count)} />
        <Metric icon={<AlertTriangle className="size-4" />} label={t("missing_info")}     value={numOrDash(snapshot.missing_info_count)} />
      </div>

      {(snapshot.business_risk || snapshot.sales_risk || snapshot.information_risk) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <RiskTile label={t("business_risk")}    value={snapshot.business_risk}    tLabel={(v) => t(("risk_" + v) as any)} />
          <RiskTile label={t("sales_risk")}       value={snapshot.sales_risk}       tLabel={(v) => t(("risk_" + v) as any)} />
          <RiskTile label={t("information_risk")} value={snapshot.information_risk} tLabel={(v) => t(("risk_" + v) as any)} />
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-border">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-muted-foreground">
            <tr>
              <th className="text-start px-4 py-3 font-medium w-[28%]">{t("snapshot_col_item")}</th>
              <th className="text-start px-4 py-3 font-medium w-[22%]">{t("snapshot_col_status")}</th>
              <th className="text-start px-4 py-3 font-medium">{t("snapshot_col_reason")}</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.rows.map((r, i) => {
              const st = STATUS_STYLE[r.status ?? "gray"] ?? STATUS_STYLE.gray;
              const Icon = st.icon;
              const rowLabel = ROW_LABELS[r.key]?.[lang] ?? r.key;
              const shortLabel = pick(r.label, lang) || (lang === "ar" ? st.labelAr : st.labelEn);
              const reason = pick(r.explanation, lang) || "—";
              return (
                <tr key={r.key + i} className="border-t border-border/60 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium">{rowLabel}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full ring-1 ${st.ring} text-xs`}>
                      <span className={`size-2 rounded-full ${st.dot}`} />
                      <Icon className="size-3.5" />
                      {shortLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground/90 leading-relaxed">{reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {scoreBreakdown && (
        <div className="rounded-2xl border border-border bg-white/[0.02] p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("sales_opportunity")}</div>
          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{scoreBreakdown}</pre>
        </div>
      )}

      {decisionReason && (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
          <div className="text-xs uppercase tracking-wider text-primary mb-2">{t("final_decision")}</div>
          <p className="text-sm leading-relaxed">{decisionReason}</p>
        </div>
      )}
    </section>
  );
}

function Metric({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-border p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-1.5 font-serif text-xl">{value}</div>
    </div>
  );
}

function RiskTile({ label, value, tLabel }: { label: string; value: Risk; tLabel: (v: string) => string }) {
  const key = value ?? "medium";
  const ring = RISK_STYLE[key] ?? "ring-white/10 bg-white/[0.04] text-muted-foreground";
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-border p-4 flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`px-2.5 py-1 rounded-full ring-1 text-xs font-semibold ${ring}`}>
        {value ? tLabel(value) : "—"}
      </span>
    </div>
  );
}

function fmtScore(n: any) { return typeof n === "number" ? `${Math.round(n)}%` : "—"; }
function numOrDash(n: any) { return typeof n === "number" ? String(n) : "—"; }

