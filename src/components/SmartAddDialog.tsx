import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { extractCompany } from "@/lib/ai.functions";
import { saveCompany } from "@/lib/companies";
import { useMutation } from "@tanstack/react-query";

type Extracted = Record<string, any>;

const FIELDS: Array<{ key: keyof any; type?: "bool" | "text" | "textarea" }> = [
  { key: "name" }, { key: "industry" }, { key: "country" }, { key: "city" },
  { key: "address" }, { key: "google_maps_url" },
  { key: "website" }, { key: "phone" }, { key: "email" },
  { key: "linkedin" }, { key: "facebook" }, { key: "instagram" },
  { key: "employees" }, { key: "company_size" },
  { key: "products", type: "textarea" }, { key: "services", type: "textarea" },
  { key: "decision_maker" },
  { key: "has_crm", type: "bool" }, { key: "has_erp", type: "bool" },
  { key: "has_automation", type: "bool" }, { key: "uses_ai", type: "bool" },
  { key: "marketing_notes", type: "textarea" }, { key: "notes", type: "textarea" },
];

const LABEL_KEY: Record<string, string> = {
  name: "field_name", industry: "field_industry", country: "field_country", city: "field_city",
  address: "field_address", google_maps_url: "field_google_maps",
  website: "field_website", phone: "field_phone", email: "field_email",
  linkedin: "field_linkedin", facebook: "field_facebook", instagram: "field_instagram",
  employees: "field_employees", company_size: "field_size",
  products: "field_products", services: "field_services", decision_maker: "field_decision_maker",
  has_crm: "field_crm", has_erp: "field_erp", has_automation: "field_automation", uses_ai: "field_ai",
  marketing_notes: "field_marketing", notes: "field_notes",
};

export function SmartAddDialog({ open, onOpenChange, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSaved?: () => void;
}) {
  const { t, lang, dir } = useI18n();
  const [raw, setRaw] = useState("");
  const [extracted, setExtracted] = useState<Extracted | null>(null);

  const extract = useMutation({
    mutationFn: async () => extractCompany({ data: { raw, language: lang } }),
    onSuccess: (r: any) => setExtracted(r?.data ?? {}),
    onError: (e: any) => toast.error(e?.message ?? t("toast_error")),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!extracted?.name) throw new Error(lang === "ar" ? "اسم الشركة مطلوب" : "Company name is required");
      return saveCompany({ ...(extracted as any), name: extracted.name, raw_notes: raw });
    },
    onSuccess: () => {
      toast.success(t("toast_saved"));
      setRaw(""); setExtracted(null);
      onOpenChange(false); onSaved?.();
    },
    onError: (e: any) => toast.error(e?.message ?? t("toast_error")),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" dir={dir}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative glass-card rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <header className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-serif text-2xl flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              {t("smart_title")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{t("smart_sub")}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <textarea
            value={raw} onChange={e => setRaw(e.target.value)} rows={6}
            placeholder={t("smart_placeholder")}
            className="w-full rounded-xl bg-white/[0.03] border border-border p-4 text-sm focus:outline-none focus:border-primary/60 leading-relaxed"
          />
          <div className="flex justify-end">
            <button
              onClick={() => extract.mutate()} disabled={extract.isPending || raw.trim().length < 5}
              className="rounded-xl px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold gold-glow inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="size-4" />
              {extract.isPending ? t("smart_extracting") : t("smart_extract")}
            </button>
          </div>

          {extracted && (
            <div>
              <h3 className="font-serif text-lg mb-4">{t("smart_review")}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELDS.map(f => {
                  const k = f.key as string;
                  const label = t(LABEL_KEY[k] as any);
                  const v = (extracted as any)[k] ?? "";
                  if (f.type === "bool") {
                    const val: any = v;
                    return (
                      <label key={k} className="flex items-center justify-between rounded-lg border border-border bg-white/[0.02] px-3 py-2 text-sm">
                        <span>{label}</span>
                        <select value={val === true ? "yes" : val === false ? "no" : ""}
                          onChange={e => setExtracted({ ...extracted, [k]: e.target.value === "yes" ? true : e.target.value === "no" ? false : null })}
                          className="bg-transparent text-xs">
                          <option value="">—</option>
                          <option value="yes">✓</option>
                          <option value="no">✗</option>
                        </select>
                      </label>
                    );
                  }
                  const Tag = f.type === "textarea" ? "textarea" : "input";
                  return (
                    <label key={k} className={`flex flex-col gap-1 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <Tag
                        value={v ?? ""}
                        onChange={(e: any) => setExtracted({ ...extracted, [k]: e.target.value })}
                        rows={f.type === "textarea" ? 3 : undefined}
                        className="rounded-lg bg-white/[0.03] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 p-6 border-t border-border">
          <button onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            {t("cancel")}
          </button>
          <button
            onClick={() => save.mutate()} disabled={!extracted || save.isPending}
            className="rounded-xl px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold gold-glow disabled:opacity-50"
          >
            {save.isPending ? "..." : t("save")}
          </button>
        </footer>
      </div>
    </div>
  );
}
