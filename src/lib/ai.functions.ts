import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ---------- SMART EXTRACT: raw text -> structured company fields ---------- */

const ExtractInput = z.object({
  raw: z.string().min(3).max(20000),
  language: z.enum(["ar", "en"]).default("ar"),
});

export const extractCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ExtractInput.parse(v))
  .handler(async ({ data }) => {
    const { generateText } = await import("ai");
    const { createGateway, DEFAULT_MODEL } = await import("./ai-gateway.server");
    const gateway = createGateway();

    const sys = `You are an expert data extractor for a Business Development CRM. Read the raw free-form text (Arabic or English) and return a VALID JSON OBJECT ONLY with these keys — leave any unknown value as null. DO NOT invent data. Auto-route each piece of information to the correct field.

Keys:
- name, industry, country, city, address (human readable location text like "Iraq - Baghdad - Al-Arasat"),
- google_maps_url (full https URL to Google Maps if present, else null),
- website, phone, email, linkedin, facebook, instagram,
- employees, company_size, products, services, decision_maker,
- has_crm (boolean|null), has_erp (boolean|null), has_automation (boolean|null), uses_ai (boolean|null),
- marketing_notes, notes.

Rules:
- If a Google Maps link is present (maps.google.*, goo.gl/maps, maps.app.goo.gl, google.com/maps), put the full URL in google_maps_url AND put the readable place name in address (never the URL).
- Detect URLs by pattern (website / linkedin / facebook / instagram) and route each to its own field.
- Detect emails / phone numbers by pattern.
- Never place the same value in multiple fields.
- Return JSON only. No prose. No code fences.`;

    const { text } = await generateText({
      model: gateway(DEFAULT_MODEL),
      system: sys,
      prompt: data.raw,
      maxTokens: 1000,
      temperature: 0.3,
    });

    const parsed = safeJson(text);
    // If the AI put a maps URL in address, clean it.
    if (parsed && typeof parsed === "object") {
      if (isMapsUrl(parsed.address)) {
        if (!parsed.google_maps_url) parsed.google_maps_url = parsed.address;
        parsed.address = null;
      }
      if (parsed.google_maps_url && typeof parsed.google_maps_url !== "string") {
        parsed.google_maps_url = null;
      }
    }
    return { ok: true as const, data: parsed };
  });

/* ---------- ANALYZE ONE COMPANY: full consultant report ---------- */

const AnalyzeInput = z.object({
  companyId: z.string().uuid(),
  language: z.enum(["ar", "en"]).default("ar"),
  force: z.boolean().optional().default(false),
});

const HASH_FIELDS = [
  "name","industry","country","city","address","google_maps_url","website","phone","email",
  "linkedin","facebook","instagram","employees","company_size","products","services",
  "decision_maker","has_crm","has_erp","has_automation","uses_ai","marketing_notes","notes","raw_notes",
] as const;

export const analyzeCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => AnalyzeInput.parse(v))
  .handler(async ({ data, context }) => {
    const { generateText } = await import("ai");
    const { createGateway, DEFAULT_MODEL } = await import("./ai-gateway.server");

    const { data: company, error } = await context.supabase
      .from("companies").select("*").eq("id", data.companyId).single();
    if (error || !company) throw new Error("Company not found");

    const currentHash = await hashCompanyData(company as any);

    // Latest analysis for diff / no-op detection
    const { data: latest } = await context.supabase
      .from("company_analyses")
      .select("*")
      .eq("company_id", data.companyId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest && !data.force && (latest as any).data_hash === currentHash) {
      return { ok: false as const, reason: "no_changes", latest };
    }

    // Compute changed fields vs the snapshot embedded in latest.report.__source
    const prevSource: any = latest?.report && typeof latest.report === "object"
      ? (latest.report as any).__source ?? null : null;
    const changedFields = prevSource ? diffFields(prevSource, company as any) : HASH_FIELDS.slice();

    const gateway = createGateway();

    let report: any;

    if (latest && prevSource && changedFields.length > 0) {
      // DELTA: keep previous report, only update sections affected by changed fields.
      report = await deltaAnalyze({
        gateway, model: DEFAULT_MODEL,
        previousReport: latest.report as any,
        company: company as any,
        changedFields,
        generateText,
      });
    } else {
      // FULL: no prior report — generate from scratch.
      report = await fullAnalyze({
        gateway, model: DEFAULT_MODEL,
        company: company as any,
        generateText,
      });
    }

    // Attach source snapshot for future diffs
    report.__source = pickSource(company as any);

    const { count } = await context.supabase
      .from("company_analyses").select("*", { count: "exact", head: true })
      .eq("company_id", data.companyId);

    const { data: inserted, error: insErr } = await context.supabase
      .from("company_analyses").insert({
        company_id: data.companyId,
        version: (count ?? 0) + 1,
        report,
        language: data.language,
        model: DEFAULT_MODEL,
        created_by: context.userId,
        data_hash: currentHash,
        changed_fields: changedFields,
      } as any).select().single();
    if (insErr) throw insErr;

    // Sync priority + stage on company from the fresh report
    const pr = normalizePriority(report?.priority);
    const reasonRaw = report?.priority_reason;
    const reasonText = typeof reasonRaw === "string"
      ? reasonRaw
      : reasonRaw && typeof reasonRaw === "object"
        ? (reasonRaw[data.language] ?? reasonRaw.en ?? reasonRaw.ar ?? null)
        : null;

    await context.supabase.from("companies").update({
      priority: pr ?? "unranked",
      priority_score: typeof report?.priority_score === "number" ? report.priority_score : null,
      priority_reason: reasonText,
      stage: (company.stage === "new_lead" || company.stage === "researching") ? "ai_analyzed" : company.stage,
      updated_by: context.userId,
    }).eq("id", data.companyId);

    return { ok: true as const, analysis: inserted, mode: latest ? "delta" : "full", changedFields };
  });

/* ---------- Full report generation ---------- */

const SNAPSHOT_KEYS = [
  "business_activity","digital_presence","website","social_media","google_maps",
  "phone_availability","email_availability","ease_of_contact","decision_maker_availability",
  "website_opportunity","crm_opportunity","erp_opportunity","ai_opportunity",
  "automation_opportunity","branding_opportunity","seo_opportunity",
  "digital_transformation_opportunity","estimated_sales_opportunity",
  "estimated_closing_probability","priority_level","overall_recommendation",
];

const FULL_SYSTEM = `You are a SENIOR Business Development DIRECTOR. Answer ONE question: "How likely is THIS company to become OUR customer?"

RULES:
- Never hallucinate. Never convert assumptions into facts. Missing info LOWERS confidence and lead_readiness — never inflates sales_opportunity.
- Every user-facing string is an object { "ar": "...", "en": "..." } (both languages, professional translation). Enum tokens stay English.
- Snapshot statuses: green=verified strong, orange=needs verification, red=weak/missing/not an opportunity, gray=unknown.
- Prefer 58/100 with strong evidence over 92/100 with assumptions.

Return VALID JSON ONLY with this schema:
{
  "snapshot": {
    "sales_opportunity": 0-100, "analysis_confidence": 0-100, "lead_readiness": 0-100,
    "evidence_count": int, "missing_info_count": int, "confirmed_facts_count": int,
    "business_risk": "low"|"medium"|"high", "sales_risk": "low"|"medium"|"high", "information_risk": "low"|"medium"|"high",
    "final_decision": "ready_to_contact"|"research_more"|"low_priority",
    "final_decision_reason": {"ar":"","en":""},
    "score_breakdown": {"ar":"","en":""},
    "rows": [ { "key": one_of(${SNAPSHOT_KEYS.join(",")}), "status":"green|orange|red|gray",
               "label":{"ar":"","en":""}, "explanation":{"ar":"","en":""} } ]
  },
  "evidence_collected":[{"ar":"","en":""}], "missing_information":[{"ar":"","en":""}],
  "confirmed_facts":[{"ar":"","en":""}], "ai_observations":[{"ar":"","en":""}],
  "executive_summary":{"ar":"","en":""}, "sales_recommendation":{"ar":"","en":""},
  "business_overview":{"ar":"","en":""}, "digital_assessment":{"ar":"","en":""},
  "business_assessment":{"ar":"","en":""}, "digital_presence":{"ar":"","en":""},
  "website_review":{"ar":"","en":""}, "branding_review":{"ar":"","en":""},
  "social_review":{"ar":"","en":""}, "tech_review":{"ar":"","en":""},
  "automation_review":{"ar":"","en":""}, "crm_analysis":{"ar":"","en":""},
  "erp_analysis":{"ar":"","en":""}, "customer_experience":{"ar":"","en":""},
  "strengths":[{"ar":"","en":""}], "weaknesses":[{"ar":"","en":""}],
  "opportunities":[{"ar":"","en":""}], "risks":[{"ar":"","en":""}],
  "recommended_services":[{"ar":"","en":""}], "sales_strategy":{"ar":"","en":""},
  "decision_maker_strategy":{"ar":"","en":""}, "questions_before_contact":[{"ar":"","en":""}],
  "objections":[{"objection":{"ar":"","en":""},"response":{"ar":"","en":""}}],
  "proposal":{"ar":"","en":""}, "followup":{"ar":"","en":""}, "next_actions":[{"ar":"","en":""}],
  "swot":{"strengths":[{"ar":"","en":""}],"weaknesses":[{"ar":"","en":""}],
          "opportunities":[{"ar":"","en":""}],"threats":[{"ar":"","en":""}]},
  "estimated_budget":{"ar":"","en":""}, "probability_success": 0-100|null, "probability_close": 0-100|null,
  "sales_difficulty":"low"|"medium"|"high", "decision_complexity":"low"|"medium"|"high",
  "priority":"high"|"medium"|"low", "priority_score": 0-100,
  "priority_reason":{"ar":"","en":""}
}

Snapshot rows: include ALL keys exactly once in this order: ${SNAPSHOT_KEYS.join(", ")}.
JSON only. No prose. No fences.`;

async function fullAnalyze({ gateway, model, company, generateText }: any) {
  const { text } = await generateText({
    model: gateway(model),
    system: FULL_SYSTEM,
    prompt: buildCompanyPrompt(company),
    maxTokens: 2000,
    temperature: 0.4,
  });
  return safeJson(text);
}

/* ---------- DELTA: update only the affected report sections ---------- */

// Which sections in the report should be refreshed when a given field changes
const FIELD_TO_SECTIONS: Record<string, string[]> = {
  website: ["website_review","digital_presence","digital_assessment","snapshot.website","snapshot.website_opportunity","snapshot.digital_presence"],
  google_maps_url: ["snapshot.google_maps"],
  address: ["business_overview","snapshot.google_maps"],
  city: ["business_overview"],
  country: ["business_overview"],
  linkedin: ["social_review","snapshot.social_media"],
  facebook: ["social_review","snapshot.social_media"],
  instagram: ["social_review","snapshot.social_media"],
  phone: ["snapshot.phone_availability","snapshot.ease_of_contact"],
  email: ["snapshot.email_availability","snapshot.ease_of_contact"],
  decision_maker: ["decision_maker_strategy","snapshot.decision_maker_availability"],
  has_crm: ["crm_analysis","recommended_services","snapshot.crm_opportunity"],
  has_erp: ["erp_analysis","recommended_services","snapshot.erp_opportunity"],
  has_automation: ["automation_review","snapshot.automation_opportunity"],
  uses_ai: ["tech_review","snapshot.ai_opportunity"],
  employees: ["business_overview"],
  company_size: ["business_overview"],
  industry: ["business_overview","business_assessment"],
  products: ["business_overview","recommended_services"],
  services: ["business_overview","recommended_services"],
  marketing_notes: ["social_review","branding_review"],
  notes: ["business_overview"],
  raw_notes: ["evidence_collected","confirmed_facts"],
  name: ["executive_summary"],
};

async function deltaAnalyze({ gateway, model, previousReport, company, changedFields, generateText }: any) {
  const sections = new Set<string>();
  for (const f of changedFields) (FIELD_TO_SECTIONS[f] ?? []).forEach(s => sections.add(s));
  // Always re-derive the top-level scoring + evidence + missing info + priority
  ["evidence_collected","confirmed_facts","ai_observations","missing_information",
   "strengths","weaknesses","opportunities","risks",
   "priority","priority_score","priority_reason",
   "snapshot.sales_opportunity","snapshot.analysis_confidence","snapshot.lead_readiness",
   "snapshot.evidence_count","snapshot.missing_info_count","snapshot.confirmed_facts_count",
   "snapshot.final_decision","snapshot.final_decision_reason","snapshot.score_breakdown",
   "snapshot.business_risk","snapshot.sales_risk","snapshot.information_risk",
   "snapshot.overall_recommendation","snapshot.estimated_sales_opportunity","snapshot.priority_level",
  ].forEach(s => sections.add(s));

  const affected = Array.from(sections);

  const sys = `You are a SENIOR Business Development DIRECTOR performing a DELTA update on an existing analysis. You will receive:
1) PREVIOUS_REPORT — the full existing JSON report.
2) NEW_COMPANY_DATA — the updated company record.
3) CHANGED_FIELDS — list of field names that changed.
4) AFFECTED_SECTIONS — dotted paths of report sections you MUST recompute using the new data.

Rules:
- Return VALID JSON ONLY: { "patch": { <dotted-path>: <new-value> , ... } }
- Recompute ONLY the AFFECTED_SECTIONS. Do NOT touch other sections.
- All user-facing strings stay bilingual { "ar":"","en":"" }.
- For snapshot rows, if you need to update one, return "patch": { "snapshot.rows": <full new rows array preserving all keys in original order> }.
- Never hallucinate. Missing info lowers confidence.
- Numeric scores must be recalculated conservatively using ALL evidence (old and new).
- JSON only. No prose. No fences.`;

  const prompt = `PREVIOUS_REPORT:\n${JSON.stringify(previousReport)}\n\nNEW_COMPANY_DATA:\n${JSON.stringify(pickSource(company))}\n\nCHANGED_FIELDS: ${JSON.stringify(changedFields)}\n\nAFFECTED_SECTIONS: ${JSON.stringify(affected)}`;

  const { text } = await generateText({
    model: gateway(model),
    system: sys,
    prompt,
    maxTokens: 1500,
    temperature: 0.3,
  });
  const parsed = safeJson(text);
  const patch = parsed?.patch ?? {};

  // Deep clone previous report (minus __source) and apply patch
  const next = JSON.parse(JSON.stringify(previousReport ?? {}));
  delete next.__source;
  for (const [path, value] of Object.entries(patch)) {
    setPath(next, path, value);
  }
  return next;
}

/* ---------- RANK ALL COMPANIES ---------- */

const RankInput = z.object({ language: z.enum(["ar","en"]).default("ar") });

export const rankAllCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => RankInput.parse(v))
  .handler(async ({ data, context }) => {
    const { generateText } = await import("ai");
    const { createGateway, DEFAULT_MODEL } = await import("./ai-gateway.server");

    const { data: companies, error } = await context.supabase
      .from("companies").select("*").eq("archived", false);
    if (error) throw error;
    if (!companies || companies.length === 0) return { ok: true, ranked: 0 };

    const gateway = createGateway();
    const sys = data.language === "ar"
      ? `أنت مستشار كبير في تطوير الأعمال. رتّب الشركات حسب احتمالية شراء خدماتنا. أعد JSON: {"rankings":[{"id":"uuid","priority":"high|medium|low","score":0-100,"reason":"..."}]}. JSON فقط.`
      : `You are a senior BD consultant. Rank by likelihood of buying our services. Return JSON: {"rankings":[{"id":"uuid","priority":"high|medium|low","score":0-100,"reason":"..."}]}.`;

    const compact = companies.map(c => ({
      id: c.id, name: c.name, industry: c.industry, country: c.country, city: c.city,
      website: c.website, employees: c.employees, size: c.company_size,
      has_crm: c.has_crm, has_erp: c.has_erp, has_automation: c.has_automation,
      uses_ai: c.uses_ai, decision_maker: c.decision_maker,
      products: c.products, services: c.services, notes: c.notes, raw: c.raw_notes,
    }));

    const { text } = await generateText({
      model: gateway(DEFAULT_MODEL),
      system: sys,
      prompt: JSON.stringify(compact),
      maxTokens: 1200,
      temperature: 0.3,
    });
    const parsed = safeJson(text);
    const rankings: Array<{ id: string; priority?: string; score?: number; reason?: string }> =
      Array.isArray(parsed?.rankings) ? parsed.rankings : [];

    let updated = 0;
    for (const r of rankings) {
      const pr = normalizePriority(r.priority);
      if (!pr) continue;
      await context.supabase.from("companies").update({
        priority: pr,
        priority_score: typeof r.score === "number" ? r.score : null,
        priority_reason: r.reason ?? null,
        updated_by: context.userId,
      }).eq("id", r.id);
      updated++;
    }
    return { ok: true, ranked: updated };
  });

/* ---------- helpers ---------- */

function safeJson(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return {};
}

function normalizePriority(v: unknown): "high" | "medium" | "low" | null {
  if (typeof v !== "string") return null;
  const s = v.toLowerCase();
  if (s.includes("high") || s.includes("عالية")) return "high";
  if (s.includes("med") || s.includes("متوسط")) return "medium";
  if (s.includes("low") || s.includes("منخفض")) return "low";
  return null;
}

function isMapsUrl(v: any) {
  return typeof v === "string" && /(maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl|google\.[a-z.]+\/maps)/i.test(v);
}

function pickSource(c: any) {
  const out: Record<string, any> = {};
  for (const k of HASH_FIELDS) out[k] = c[k] ?? null;
  return out;
}

function diffFields(prev: Record<string, any>, next: Record<string, any>): string[] {
  const changed: string[] = [];
  for (const k of HASH_FIELDS) {
    if (String(prev?.[k] ?? "") !== String(next?.[k] ?? "")) changed.push(k);
  }
  return changed;
}

async function hashCompanyData(c: any): Promise<string> {
  const src = pickSource(c);
  const enc = new TextEncoder().encode(JSON.stringify(src));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function setPath(obj: any, path: string, value: any) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function buildCompanyPrompt(c: any) {
  const rows: Array<[string, any]> = [
    ["name", c.name], ["industry", c.industry], ["country", c.country], ["city", c.city], ["address", c.address],
    ["google_maps_url", c.google_maps_url],
    ["website", c.website], ["phone", c.phone], ["email", c.email],
    ["linkedin", c.linkedin], ["facebook", c.facebook], ["instagram", c.instagram],
    ["employees", c.employees], ["company_size", c.company_size],
    ["products", c.products], ["services", c.services],
    ["decision_maker", c.decision_maker],
    ["has_crm", c.has_crm], ["has_erp", c.has_erp], ["has_automation", c.has_automation], ["uses_ai", c.uses_ai],
    ["marketing_notes", c.marketing_notes], ["notes", c.notes], ["raw_notes", c.raw_notes],
  ];
  const filtered = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  const body = filtered.map(([k, v]) => `- ${k}: ${typeof v === "boolean" ? (v ? "yes" : "no") : v}`).join("\n");
  return `Company data:\n${body}\n\nProduce the bilingual consultant report as specified.`;
}
