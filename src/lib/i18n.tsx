// i18n: minimal dictionary-based translator with RTL/LTR direction
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Lang = "ar" | "en";

const STORAGE_KEY = "lovable-crm-lang";

type Dict = Record<string, { ar: string; en: string }>;

// Centralized strings. Add here; components look up by key.
export const dict: Dict = {
  app_name: { ar: "أوكسيدان — ذكاء الأعمال", en: "Oxidan — Business Intelligence" },
  brand_short: { ar: "أوكسيدان", en: "Oxidan" },
  nav_dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  nav_companies: { ar: "الشركات", en: "Companies" },
  nav_pipeline: { ar: "خط المبيعات", en: "Pipeline" },
  nav_reports: { ar: "التقارير", en: "Reports" },
  nav_settings: { ar: "الإعدادات", en: "Settings" },

  auth_signin: { ar: "تسجيل الدخول", en: "Sign in" },
  auth_signup: { ar: "إنشاء حساب", en: "Create account" },
  auth_signout: { ar: "تسجيل الخروج", en: "Sign out" },
  auth_email: { ar: "البريد الإلكتروني", en: "Email" },
  auth_password: { ar: "كلمة المرور", en: "Password" },
  auth_fullname: { ar: "الاسم الكامل", en: "Full name" },
  auth_or: { ar: "أو", en: "or" },
  auth_google: { ar: "المتابعة عبر Google", en: "Continue with Google" },
  auth_no_account: { ar: "ليس لديك حساب؟", en: "No account yet?" },
  auth_have_account: { ar: "لديك حساب؟", en: "Already have an account?" },
  auth_hero_title: { ar: "استشاري تطوير الأعمال الذكي", en: "Your AI Business Development consultant" },
  auth_hero_sub: {
    ar: "حلّل، أهّل، ورتّب الشركات حسب احتمال إتمام الصفقة — بذكاء استشاري حقيقي.",
    en: "Analyze, qualify, and rank companies by their likelihood of closing — with real consultant intelligence.",
  },

  dashboard_title: { ar: "نظرة عامة", en: "Overview" },
  dashboard_sub: { ar: "الحالة الحالية لمسار المبيعات لديك.", en: "Current state of your sales pipeline." },
  kpi_total: { ar: "إجمالي الشركات", en: "Total companies" },
  kpi_high: { ar: "أولوية عالية", en: "High priority" },
  kpi_won: { ar: "صفقات رابحة", en: "Won deals" },
  kpi_analyzed: { ar: "تم تحليلها", en: "Analyzed" },
  top_priority: { ar: "الشركات ذات الأولوية القصوى", en: "Top-priority companies" },
  none_yet: { ar: "لا توجد شركات بعد.", en: "No companies yet." },

  delta_since_yesterday: { ar: "منذ أمس", en: "since yesterday" },
  delta_this_week: { ar: "هذا الأسبوع", en: "this week" },
  delta_baseline: { ar: "لا توجد مقارنة بعد", en: "No comparison yet" },
  empty_total: { ar: "لا توجد شركات بعد. ابدأ بإضافة شركة جديدة.", en: "No companies yet. Start by adding one." },
  empty_high: { ar: "لا توجد شركات ذات أولوية عالية حالياً.", en: "No high-priority companies yet." },
  empty_analyzed: { ar: "لم يتم تحليل أي شركة بعد. شغّل التحليل الذكي.", en: "No companies analyzed yet. Run AI analysis." },
  empty_won: { ar: "لا توجد صفقات رابحة بعد. استمر بالمتابعة!", en: "No won deals yet. Keep going!" },
  empty_top_priority: { ar: "لا توجد شركات لعرض الترتيب. ابدأ بإضافة شركة وتحليلها.", en: "Nothing to rank yet. Add and analyze a company." },
  sort_by: { ar: "ترتيب حسب", en: "Sort by" },
  sort_score: { ar: "درجة فرصة البيع", en: "Sales opportunity score" },
  sort_priority: { ar: "الأولوية", en: "Priority" },
  sort_industry: { ar: "القطاع", en: "Industry" },
  sort_city: { ar: "المدينة", en: "City" },
  sort_recent_analysis: { ar: "آخر تحليل", en: "Last analysis" },


  companies_title: { ar: "الشركات", en: "Companies" },
  companies_new: { ar: "شركة جديدة", en: "New company" },
  companies_smart_add: { ar: "إضافة ذكية", en: "Smart add" },
  companies_search: { ar: "ابحث بالاسم، القطاع، المدينة...", en: "Search by name, industry, city..." },
  companies_analyze_all: { ar: "تحليل وترتيب الكل", en: "Analyze & rank all" },
  companies_empty: {
    ar: "لا توجد شركات. ابدأ بإضافة أول شركة من زر «إضافة ذكية».",
    en: "No companies yet. Start by clicking “Smart add”.",
  },

  smart_title: { ar: "الإدخال الذكي", en: "Smart Input" },
  smart_sub: {
    ar: "الصق أي ملاحظات عن الشركة (اسم، مدينة، موقع، هاتف، ملاحظات، حضور رقمي...) وسيقوم الذكاء الاصطناعي بترتيبها.",
    en: "Paste any notes about the company (name, city, website, phone, digital presence...) and the AI will structure it.",
  },
  smart_placeholder: {
    ar: "مثال: شركة المستقبل العقارية — بغداد — www.future.iq — 077xxxxxxxx — موقع قديم — لا يوجد CRM — نشطون على فيسبوك — ~40 موظف...",
    en: "e.g. Future Real Estate — Baghdad — www.future.iq — 077xxxxxxxx — old website — no CRM — active on Facebook — ~40 employees...",
  },
  smart_extract: { ar: "استخراج المعلومات", en: "Extract information" },
  smart_extracting: { ar: "جاري الاستخراج...", en: "Extracting..." },
  smart_review: { ar: "راجع البيانات ثم احفظ", en: "Review & save" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  edit: { ar: "تعديل", en: "Edit" },
  delete: { ar: "حذف", en: "Delete" },
  archive: { ar: "أرشفة", en: "Archive" },
  unarchive: { ar: "إلغاء الأرشفة", en: "Unarchive" },
  duplicate: { ar: "تكرار", en: "Duplicate" },
  back: { ar: "رجوع", en: "Back" },
  confirm_delete: { ar: "تأكيد الحذف؟", en: "Confirm delete?" },

  field_name: { ar: "اسم الشركة", en: "Company name" },
  field_industry: { ar: "القطاع", en: "Industry" },
  field_country: { ar: "الدولة", en: "Country" },
  field_city: { ar: "المدينة", en: "City" },
  field_address: { ar: "العنوان", en: "Address" },
  field_google_maps: { ar: "رابط خرائط Google", en: "Google Maps link" },
  field_website: { ar: "الموقع الإلكتروني", en: "Website" },
  address_unavailable: { ar: "غير متوفر", en: "Not available" },
  open_in_maps: { ar: "فتح في خرائط Google", en: "Open in Google Maps" },
  no_new_info: { ar: "لا توجد أي معلومات جديدة لإعادة التحليل.", en: "No new information to re-analyze." },
  analysis_delta: { ar: "تحديث جزئي — الحقول التي تغيرت فقط", en: "Delta update — only changed fields" },
  analysis_full: { ar: "تحليل كامل", en: "Full analysis" },
  current_version: { ar: "الإصدار الحالي", en: "Current version" },
  created_by: { ar: "بواسطة", en: "By" },
  force_reanalyze: { ar: "إعادة تحليل كاملة", en: "Force re-analyze" },
  field_phone: { ar: "الهاتف", en: "Phone" },
  field_email: { ar: "البريد", en: "Email" },
  field_linkedin: { ar: "لينكدإن", en: "LinkedIn" },
  field_facebook: { ar: "فيسبوك", en: "Facebook" },
  field_instagram: { ar: "إنستغرام", en: "Instagram" },
  field_employees: { ar: "عدد الموظفين", en: "Employees" },
  field_size: { ar: "حجم الشركة", en: "Company size" },
  field_products: { ar: "المنتجات", en: "Products" },
  field_services: { ar: "الخدمات", en: "Services" },
  field_decision_maker: { ar: "صانع القرار", en: "Decision maker" },
  field_crm: { ar: "يوجد CRM", en: "Has CRM" },
  field_erp: { ar: "يوجد ERP", en: "Has ERP" },
  field_automation: { ar: "أتمتة", en: "Automation" },
  field_ai: { ar: "استخدام الذكاء الاصطناعي", en: "AI usage" },
  field_marketing: { ar: "التسويق", en: "Marketing" },
  field_notes: { ar: "ملاحظات", en: "Notes" },

  priority_high: { ar: "أولوية عالية", en: "High priority" },
  priority_medium: { ar: "متوسطة", en: "Medium" },
  priority_low: { ar: "منخفضة", en: "Low" },
  priority_unranked: { ar: "غير مرتبة", en: "Unranked" },

  stage_new_lead: { ar: "عميل جديد", en: "New Lead" },
  stage_researching: { ar: "قيد البحث", en: "Researching" },
  stage_ai_analyzed: { ar: "تم التحليل", en: "AI Analyzed" },
  stage_qualified: { ar: "مؤهل", en: "Qualified" },
  stage_contact_ready: { ar: "جاهز للتواصل", en: "Contact Ready" },
  stage_meeting_scheduled: { ar: "موعد محدد", en: "Meeting Scheduled" },
  stage_proposal_sent: { ar: "تم إرسال العرض", en: "Proposal Sent" },
  stage_negotiation: { ar: "تفاوض", en: "Negotiation" },
  stage_won: { ar: "رابح", en: "Won" },
  stage_lost: { ar: "خاسر", en: "Lost" },

  report_title: { ar: "تقرير الاستشاري الذكي", en: "AI Consultant Report" },
  analyze_now: { ar: "تحليل ذكي", en: "Analyze with AI" },
  analyzing: { ar: "جاري التحليل...", en: "Analyzing..." },
  no_report: { ar: "لم يتم إنشاء تقرير بعد.", en: "No AI report yet." },
  report_history: { ar: "الإصدارات السابقة", en: "Previous versions" },
  overview: { ar: "نظرة عامة", en: "Overview" },
  ai_report_tab: { ar: "التقرير", en: "AI Report" },
  files_tab: { ar: "الملفات", en: "Files" },
  timeline_tab: { ar: "السجل", en: "Timeline" },
  upload_file: { ar: "رفع ملف", en: "Upload file" },
  no_files: { ar: "لا توجد ملفات.", en: "No files." },

  export_csv: { ar: "تصدير CSV", en: "Export CSV" },
  export_xlsx: { ar: "تصدير Excel", en: "Export Excel" },
  import_xlsx: { ar: "استيراد Excel/CSV", en: "Import Excel/CSV" },

  version: { ar: "الإصدار", en: "Version" },
  probability_success: { ar: "احتمالية النجاح", en: "Probability of success" },
  probability_close: { ar: "احتمالية الإغلاق", en: "Probability of closing" },
  estimated_budget: { ar: "الميزانية التقديرية", en: "Estimated budget" },
  sales_difficulty: { ar: "صعوبة البيع", en: "Sales difficulty" },
  decision_complexity: { ar: "تعقيد القرار", en: "Decision complexity" },
  executive_summary: { ar: "الملخص التنفيذي", en: "Executive Summary" },
  business_overview: { ar: "نظرة عامة على النشاط", en: "Business Overview" },
  digital_presence: { ar: "الحضور الرقمي", en: "Digital Presence" },
  website_review: { ar: "تقييم الموقع", en: "Website Review" },
  branding_review: { ar: "الهوية والعلامة", en: "Branding Review" },
  social_review: { ar: "شبكات التواصل", en: "Social Media Review" },
  tech_review: { ar: "المراجعة التقنية", en: "Technology Review" },
  automation_review: { ar: "الأتمتة", en: "Automation Review" },
  crm_analysis: { ar: "تحليل CRM", en: "CRM Analysis" },
  erp_analysis: { ar: "تحليل ERP", en: "ERP Analysis" },
  customer_experience: { ar: "تجربة العميل", en: "Customer Experience" },
  strengths: { ar: "نقاط القوة", en: "Strengths" },
  weaknesses: { ar: "نقاط الضعف", en: "Weaknesses" },
  opportunities: { ar: "الفرص", en: "Opportunities" },
  risks: { ar: "المخاطر", en: "Risks" },
  recommended_services: { ar: "الخدمات المقترحة", en: "Recommended Services" },
  sales_strategy: { ar: "استراتيجية البيع", en: "Sales Strategy" },
  decision_maker_strategy: { ar: "استراتيجية صانع القرار", en: "Decision Maker Strategy" },
  meeting_prep: { ar: "التحضير للاجتماع", en: "Meeting Preparation" },
  objections: { ar: "الاعتراضات المحتملة", en: "Possible Objections" },
  proposal: { ar: "العرض المقترح", en: "Recommended Proposal" },
  followup: { ar: "استراتيجية المتابعة", en: "Follow-up Strategy" },
  next_actions: { ar: "الخطوات التالية", en: "Next Actions" },
  swot: { ar: "تحليل SWOT", en: "SWOT" },
  why_this_rank: { ar: "لماذا هذا الترتيب؟", en: "Why this rank?" },

  snapshot_eyebrow: { ar: "قرار سريع", en: "10-Second Decision" },
  snapshot_title: { ar: "لمحة تطوير الأعمال", en: "Business Development Snapshot" },
  snapshot_sub: { ar: "تقييم مبني على الحقائق المتوفرة فقط. المعلومات غير المتحققة تظهر كـ «غير معروف».", en: "Evidence-based evaluation. Unverified items are shown as “Unknown”." },
  snapshot_col_item: { ar: "البند", en: "Item" },
  snapshot_col_status: { ar: "الحالة", en: "Status" },
  snapshot_col_reason: { ar: "السبب", en: "Reason" },
  sales_opportunity: { ar: "فرصة البيع", en: "Sales Opportunity" },
  analysis_confidence: { ar: "ثقة التحليل", en: "Analysis Confidence" },
  lead_readiness: { ar: "جاهزية العميل للتواصل", en: "Lead Readiness" },
  confirmed_facts: { ar: "حقائق مؤكدة", en: "Confirmed Facts" },
  evidence_count: { ar: "عدد الأدلة", en: "Evidence" },
  missing_info: { ar: "معلومات ناقصة", en: "Missing Info" },
  overall_recommendation: { ar: "التوصية العامة", en: "Overall Recommendation" },
  final_decision: { ar: "القرار النهائي", en: "Final Decision" },
  decision_ready: { ar: "🟢 جاهز للتواصل", en: "🟢 Ready To Contact" },
  decision_research: { ar: "🟠 ابحث أكثر", en: "🟠 Research More" },
  decision_low: { ar: "🔴 أولوية منخفضة", en: "🔴 Low Priority" },
  business_risk: { ar: "المخاطر التجارية", en: "Business Risk" },
  sales_risk: { ar: "مخاطر البيع", en: "Sales Risk" },
  information_risk: { ar: "مخاطر المعلومات", en: "Information Risk" },
  risk_low: { ar: "منخفضة", en: "Low" },
  risk_medium: { ar: "متوسطة", en: "Medium" },
  risk_high: { ar: "عالية", en: "High" },
  difficulty_low: { ar: "منخفضة", en: "Low" },
  difficulty_medium: { ar: "متوسطة", en: "Medium" },
  difficulty_high: { ar: "عالية", en: "High" },
  evidence_collected: { ar: "الأدلة المتوفرة", en: "Evidence Collected" },
  missing_information: { ar: "المعلومات الناقصة", en: "Missing Information" },
  confirmed_facts_section: { ar: "الحقائق المؤكدة", en: "Confirmed Facts" },
  ai_observations: { ar: "ملاحظات الذكاء الاصطناعي", en: "AI Observations" },
  sales_recommendation: { ar: "توصية المبيعات", en: "Sales Recommendation" },
  digital_assessment: { ar: "التقييم الرقمي", en: "Digital Assessment" },
  business_assessment: { ar: "التقييم التجاري", en: "Business Assessment" },
  questions_before_contact: { ar: "أسئلة قبل التواصل", en: "Questions Before Contact" },

  language: { ar: "اللغة", en: "Language" },
  arabic: { ar: "العربية", en: "Arabic" },
  english: { ar: "الإنجليزية", en: "English" },

  toast_saved: { ar: "تم الحفظ", en: "Saved" },
  toast_error: { ar: "حدث خطأ", en: "Something went wrong" },
  toast_deleted: { ar: "تم الحذف", en: "Deleted" },
  toast_uploaded: { ar: "تم رفع الملف", en: "File uploaded" },
  toast_analyzed: { ar: "تم إنشاء التقرير", en: "Report generated" },
  toast_ranked: { ar: "تم ترتيب الشركات", en: "Companies ranked" },

  profile: { ar: "الملف الشخصي", en: "Profile" },
  job_title: { ar: "المسمى الوظيفي", en: "Job title" },
  department: { ar: "القسم", en: "Department" },
};

type Ctx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (key: keyof typeof dict) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as Lang | null;
    if (saved === "ar" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback(
    (key: keyof typeof dict) => dict[key]?.[lang] ?? String(key),
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
