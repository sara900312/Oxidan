import { useState } from "react";
import { AlertTriangle, ChevronDown, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Company = Record<string, any>;

type FieldDef = {
  key: string;
  labelAr: string; labelEn: string;
  whyAr: string;  whyEn: string;
  sourcesAr: string[]; sourcesEn: string[];
  needsVerify?: boolean;
};

const FIELDS: FieldDef[] = [
  { key: "name", labelAr: "اسم الشركة", labelEn: "Company Name",
    whyAr: "معرفة الجهة التي نتحدث معها.", whyEn: "Identify who we're talking to.",
    sourcesAr: ["السجل التجاري","الموقع الإلكتروني","صفحات التواصل"],
    sourcesEn: ["Trade registry","Website","Social pages"] },
  { key: "industry", labelAr: "القطاع", labelEn: "Industry",
    whyAr: "تحديد نوع الخدمات المناسبة.", whyEn: "Match the right services.",
    sourcesAr: ["الموقع","LinkedIn","صفحة About"], sourcesEn: ["Website","LinkedIn","About page"] },
  { key: "decision_maker", labelAr: "صانع القرار", labelEn: "Decision Maker",
    whyAr: "بدون معرفته لا يمكن إتمام صفقة.", whyEn: "Without them no deal can close.",
    sourcesAr: ["LinkedIn","اتصال مباشر","سجل تجاري"], sourcesEn: ["LinkedIn","Direct call","Trade registry"] },
  { key: "email", labelAr: "البريد الإلكتروني", labelEn: "Email",
    whyAr: "قناة تواصل رسمية.", whyEn: "Formal outreach channel.",
    sourcesAr: ["الموقع/تواصل","LinkedIn","Whois النطاق"], sourcesEn: ["Site contact","LinkedIn","Domain WHOIS"] },
  { key: "phone", labelAr: "رقم الهاتف", labelEn: "Phone",
    whyAr: "أسرع طريقة للوصول.", whyEn: "Fastest way to reach.",
    sourcesAr: ["الموقع","خرائط Google","صفحات التواصل"], sourcesEn: ["Website","Google Maps","Social pages"] },
  { key: "website", labelAr: "الموقع الإلكتروني", labelEn: "Website",
    whyAr: "يوضح النضج الرقمي.", whyEn: "Signals digital maturity.",
    sourcesAr: ["بحث Google","سجلات النطاق"], sourcesEn: ["Google search","Domain records"] },
  { key: "google_maps_url", labelAr: "خرائط Google", labelEn: "Google Maps",
    whyAr: "يؤكد وجود مقر فعلي.", whyEn: "Confirms a physical presence.",
    sourcesAr: ["بحث خرائط Google"], sourcesEn: ["Google Maps search"] },
  { key: "address", labelAr: "العنوان", labelEn: "Address",
    whyAr: "لتقييم القرب واللقاءات الميدانية.", whyEn: "Assess proximity for meetings.",
    sourcesAr: ["الموقع","خرائط Google"], sourcesEn: ["Website","Google Maps"] },
  { key: "linkedin", labelAr: "LinkedIn", labelEn: "LinkedIn",
    whyAr: "الوصول إلى صانع القرار.", whyEn: "Access to decision makers.",
    sourcesAr: ["بحث LinkedIn"], sourcesEn: ["LinkedIn search"] },
  { key: "facebook", labelAr: "Facebook", labelEn: "Facebook",
    whyAr: "قياس النشاط التسويقي.", whyEn: "Measure marketing activity.",
    sourcesAr: ["بحث Facebook"], sourcesEn: ["Facebook search"] },
  { key: "instagram", labelAr: "Instagram", labelEn: "Instagram",
    whyAr: "قياس النشاط البصري والعلامة.", whyEn: "Visual brand activity.",
    sourcesAr: ["بحث Instagram"], sourcesEn: ["Instagram search"] },
  { key: "employees", labelAr: "عدد الموظفين", labelEn: "Employees",
    whyAr: "يحدد الميزانية المحتملة.", whyEn: "Signals potential budget.",
    sourcesAr: ["LinkedIn","Crunchbase","اتصال"], sourcesEn: ["LinkedIn","Crunchbase","Call"] },
  { key: "company_size", labelAr: "حجم الشركة", labelEn: "Company Size",
    whyAr: "تصنيف SMB أو enterprise.", whyEn: "SMB vs enterprise segmentation.",
    sourcesAr: ["LinkedIn","التقارير المالية"], sourcesEn: ["LinkedIn","Financial reports"] },
  { key: "products", labelAr: "المنتجات", labelEn: "Products",
    whyAr: "فهم عرض القيمة الحالي.", whyEn: "Understand current value prop.",
    sourcesAr: ["الموقع","كتالوجات"], sourcesEn: ["Website","Catalogs"] },
  { key: "services", labelAr: "الخدمات", labelEn: "Services",
    whyAr: "تحديد الفجوات.", whyEn: "Identify service gaps.",
    sourcesAr: ["الموقع","LinkedIn"], sourcesEn: ["Website","LinkedIn"] },
  { key: "has_crm", labelAr: "استخدام CRM", labelEn: "CRM Usage", needsVerify: true,
    whyAr: "أساسي لعرض حلول المبيعات.", whyEn: "Basis for sales-tech offers.",
    sourcesAr: ["اتصال مباشر","إعلانات وظائف","LinkedIn"], sourcesEn: ["Direct call","Job posts","LinkedIn"] },
  { key: "has_erp", labelAr: "استخدام ERP", labelEn: "ERP Usage", needsVerify: true,
    whyAr: "لتقييم فرص الأتمتة.", whyEn: "Automation opportunity signal.",
    sourcesAr: ["اتصال","إعلانات توظيف"], sourcesEn: ["Call","Job postings"] },
  { key: "has_automation", labelAr: "الأتمتة", labelEn: "Automation", needsVerify: true,
    whyAr: "فرصة رفع الإنتاجية.", whyEn: "Productivity uplift opportunity.",
    sourcesAr: ["اتصال","مقابلات"], sourcesEn: ["Call","Interviews"] },
  { key: "uses_ai", labelAr: "استخدام الذكاء الاصطناعي", labelEn: "AI Usage", needsVerify: true,
    whyAr: "فرص AI أو منافسون متقدمون.", whyEn: "AI opportunity vs advanced peers.",
    sourcesAr: ["الموقع","مدونة الشركة","LinkedIn"], sourcesEn: ["Website","Company blog","LinkedIn"] },
  { key: "marketing_notes", labelAr: "النشاط التسويقي", labelEn: "Marketing Activity",
    whyAr: "يؤكد نية النمو.", whyEn: "Signals growth intent.",
    sourcesAr: ["Meta Ad Library","صفحات التواصل"], sourcesEn: ["Meta Ad Library","Social pages"] },
];

function state(v: any, needsVerify?: boolean): "have" | "missing" | "verify" {
  if (v === null || v === undefined || v === "") return "missing";
  if (needsVerify && (v === false)) return "verify";
  return "have";
}

const STATE_STYLE: Record<string, { ring: string; icon: any; dot: string }> = {
  have:    { ring: "ring-emerald-500/40 bg-emerald-500/10 text-emerald-300", icon: CheckCircle2, dot: "bg-emerald-400" },
  missing: { ring: "ring-red-500/40 bg-red-500/10 text-red-300",             icon: XCircle,       dot: "bg-red-400" },
  verify:  { ring: "ring-amber-500/40 bg-amber-500/10 text-amber-300",       icon: HelpCircle,    dot: "bg-amber-400" },
};

export function MissingInfoPanel({ company }: { company: Company }) {
  const { lang, dir, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const rows = FIELDS.map(f => ({ ...f, status: state((company as any)[f.key], f.needsVerify) }));
  const missingCount = rows.filter(r => r.status !== "have").length;
  const label = lang === "ar" ? "المعلومات الناقصة" : "Missing Information";

  return (
    <section className="glass-card rounded-2xl overflow-hidden" dir={dir}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center gap-3">
          <span className="size-9 rounded-lg bg-amber-500/10 text-amber-300 grid place-items-center">
            <AlertTriangle className="size-4" />
          </span>
          <div className="text-start">
            <div className="font-serif text-lg">{label}</div>
            <div className="text-xs text-muted-foreground">
              {lang === "ar"
                ? `${missingCount} من ${rows.length} بند بحاجة إلى تحقق`
                : `${missingCount} of ${rows.length} items need verification`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-full ring-1 ring-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-semibold">
            {missingCount}
          </span>
          <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border/60">
          {rows.map(r => {
            const st = STATE_STYLE[r.status];
            const Icon = st.icon;
            const rowLabel = lang === "ar" ? r.labelAr : r.labelEn;
            const isExpanded = expandedKey === r.key;
            return (
              <div key={r.key}>
                <button
                  type="button"
                  onClick={() => setExpandedKey(isExpanded ? null : r.key)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition text-start"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`size-2 rounded-full ${st.dot}`} />
                    <span className="text-sm">{rowLabel}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ring-1 text-[11px] ${st.ring}`}>
                    <Icon className="size-3" />
                    {r.status === "have" ? (lang === "ar" ? "متوفر" : "Available")
                      : r.status === "verify" ? (lang === "ar" ? "تحقق" : "Verify")
                      : (lang === "ar" ? "ناقص" : "Missing")}
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-4 -mt-1 space-y-2 text-sm">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {lang === "ar" ? "لماذا يحتاج؟" : "Why needed?"}
                      </span>
                      <p className="mt-1 text-foreground/90">{lang === "ar" ? r.whyAr : r.whyEn}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {lang === "ar" ? "أين نجدها؟" : "Where to find?"}
                      </span>
                      <ul className="mt-1 list-disc list-inside text-foreground/80">
                        {(lang === "ar" ? r.sourcesAr : r.sourcesEn).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
