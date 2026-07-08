import { createFileRoute, Link, useParams, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Edit2, Trash2, Archive, Upload, FileText, Download, Save, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  getCompany, listAnalyses, listFiles, uploadCompanyFile, deleteCompanyFile,
  fileSignedUrl, saveCompany, deleteCompany, archiveCompany, priorityColor, updateStage,
  STAGES, type Stage,
} from "@/lib/companies";
import { analyzeCompany } from "@/lib/ai.functions";
import { AiReport } from "@/components/AiReport";
import { BdSnapshot } from "@/components/BdSnapshot";
import { MissingInfoPanel } from "@/components/MissingInfoPanel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/companies/$id")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: CompanyDetailPage,
});

function CompanyDetailPage() {
  const { id } = useParams({ from: "/_authenticated/companies/$id" });
  const { t, lang, dir } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "report" | "files" | "timeline">("overview");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: company } = useQuery({ queryKey: ["company", id], queryFn: () => getCompany(id) });
  const { data: analyses = [] } = useQuery({ queryKey: ["analyses", id], queryFn: () => listAnalyses(id) });
  const { data: files = [] } = useQuery({ queryKey: ["files", id], queryFn: () => listFiles(id) });

  const analyze = useMutation({
    mutationFn: (opts?: { force?: boolean }) =>
      analyzeCompany({ data: { companyId: id, language: lang, force: opts?.force ?? false } }),
    onSuccess: (r: any) => {
      if (r?.ok === false && r?.reason === "no_changes") {
        toast.info(t("no_new_info"));
        setTab("report");
        return;
      }
      toast.success(r?.mode === "delta" ? t("analysis_delta") : t("toast_analyzed"));
      qc.invalidateQueries({ queryKey: ["analyses", id] });
      qc.invalidateQueries({ queryKey: ["company", id] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      setTab("report");
    },
    onError: (e: any) => toast.error(e?.message ?? t("toast_error")),
  });

  if (!company) return <div className="text-sm text-muted-foreground">…</div>;
  const p = priorityColor(company.priority);

  function startEdit() {
    setForm({ ...company });
    setEditing(true);
  }
  async function saveEdit() {
    try {
      await saveCompany({ id: company!.id, ...form });
      toast.success(t("toast_saved"));
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["company", id] });
      qc.invalidateQueries({ queryKey: ["companies"] });
    } catch (e: any) { toast.error(e?.message ?? t("toast_error")); }
  }
  async function onDelete() {
    if (!confirm(t("confirm_delete"))) return;
    await deleteCompany(company!.id);
    toast.success(t("toast_deleted"));
    qc.invalidateQueries({ queryKey: ["companies"] });
    nav({ to: "/companies" });
  }

  return (
    <div className="space-y-8" dir={dir}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/companies" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> {t("back")}
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => analyze.mutate({})} disabled={analyze.isPending}
            className="rounded-xl px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold gold-glow inline-flex items-center gap-2 disabled:opacity-50">
            <Sparkles className="size-4" />
            {analyze.isPending ? t("analyzing") : t("analyze_now")}
          </button>
          <button onClick={() => analyze.mutate({ force: true })} disabled={analyze.isPending}
            className="glass-card px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition">
            {t("force_reanalyze")}
          </button>
          <button onClick={editing ? () => setEditing(false) : startEdit}
            className="glass-card px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 hover:border-primary/50 transition">
            {editing ? <><X className="size-4" />{t("cancel")}</> : <><Edit2 className="size-4" />{t("edit")}</>}
          </button>
          {editing && (
            <button onClick={saveEdit} className="glass-card px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 border-primary/40 text-primary">
              <Save className="size-4" />{t("save")}
            </button>
          )}
          <button onClick={() => archiveCompany(company!.id, !company!.archived).then(() => qc.invalidateQueries({ queryKey: ["company", id] }))}
            className="glass-card px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 hover:border-primary/50 transition">
            <Archive className="size-4" />{company.archived ? t("unarchive") : t("archive")}
          </button>
          <button onClick={onDelete}
            className="glass-card px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 text-red-400 hover:border-red-500/40 transition">
            <Trash2 className="size-4" />{t("delete")}
          </button>
        </div>
      </div>

      <header className="glass-card rounded-3xl p-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full" style={{ background: p.dot }} />
              <h1 className="font-serif text-4xl font-semibold tracking-tight truncate">{company.name}</h1>
            </div>
            <p className="mt-2 text-muted-foreground">{[company.industry, company.city, company.country].filter(Boolean).join(" · ") || "—"}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full ring-1 ${p.ring}`}>
              {t(p.label as any)}{typeof company.priority_score === "number" ? ` · ${company.priority_score}` : ""}
            </span>
            <select value={company.stage} onChange={async e => {
              await updateStage(company!.id, e.target.value as Stage);
              qc.invalidateQueries({ queryKey: ["company", id] });
              qc.invalidateQueries({ queryKey: ["companies"] });
            }} className="bg-transparent border border-border rounded-lg px-2 py-1 text-xs">
              {STAGES.map(s => <option key={s} value={s}>{t(("stage_" + s) as any)}</option>)}
            </select>
          </div>
        </div>
        {(() => {
          const report: any = analyses[0]?.report ?? null;
          const latest = report?.priority_reason;
          const bilingual = latest && typeof latest === "object"
            ? (latest[lang] ?? latest.en ?? latest.ar) : (typeof latest === "string" ? latest : null);
          const reason = bilingual || company.priority_reason;
          if (!reason) return null;
          return (
            <div className="mt-4 rounded-xl bg-white/[0.02] border border-border p-4 text-sm text-muted-foreground">
              <span className="text-xs uppercase tracking-wider text-primary">{t("why_this_rank")}</span>
              <p className="mt-1 text-foreground leading-relaxed">{reason}</p>
            </div>
          );
        })()}
      </header>

      <div className="flex items-center gap-1 border-b border-border">
        {(["overview", "report", "files", "timeline"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-3 text-sm border-b-2 -mb-px transition ${tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t(({ overview: "overview", report: "ai_report_tab", files: "files_tab", timeline: "timeline_tab" }[k]) as any)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Overview company={company} editing={editing} form={form} setForm={setForm} />
      )}
      {tab === "report" && (
        <ReportTab analyses={analyses} loading={analyze.isPending} company={company} />
      )}
      {tab === "files" && (
        <FilesTab
          files={files}
          onUpload={async (f: File) => {
            try { await uploadCompanyFile(id, f); toast.success(t("toast_uploaded")); qc.invalidateQueries({ queryKey: ["files", id] }); }
            catch (e: any) { toast.error(e?.message ?? t("toast_error")); }
          }}
          onDelete={async (fid: string, path: string) => {
            if (!confirm(t("confirm_delete"))) return;
            await deleteCompanyFile(fid, path);
            qc.invalidateQueries({ queryKey: ["files", id] });
          }}
        />
      )}
      {tab === "timeline" && <TimelineTab companyId={id} />}
    </div>
  );
}

const OVERVIEW_FIELDS: Array<[string, string, ("text" | "textarea" | "bool" | "address")?]> = [
  ["name", "field_name"], ["industry", "field_industry"],
  ["country", "field_country"], ["city", "field_city"],
  ["address", "field_address", "address"],
  ["google_maps_url", "field_google_maps"],
  ["website", "field_website"], ["phone", "field_phone"], ["email", "field_email"],
  ["linkedin", "field_linkedin"], ["facebook", "field_facebook"], ["instagram", "field_instagram"],
  ["employees", "field_employees"], ["company_size", "field_size"],
  ["decision_maker", "field_decision_maker"],
  ["has_crm", "field_crm", "bool"], ["has_erp", "field_erp", "bool"],
  ["has_automation", "field_automation", "bool"], ["uses_ai", "field_ai", "bool"],
  ["products", "field_products", "textarea"], ["services", "field_services", "textarea"],
  ["marketing_notes", "field_marketing", "textarea"], ["notes", "field_notes", "textarea"],
];

function Overview({ company, editing, form, setForm }: any) {
  const { t, lang } = useI18n();
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {OVERVIEW_FIELDS.map(([k, lk, type]) => {
        const raw = (editing ? form : company)[k];
        const label = t(lk as any);

        // Read-only mode
        if (!editing) {
          // Special: Address is shown as a link that opens the Google Maps URL when we have one.
          if (type === "address") {
            const mapsUrl = (company as any).google_maps_url as string | null | undefined;
            if (!raw && !mapsUrl) return <Cell key={k} label={label}>{t("address_unavailable")}</Cell>;
            const text = raw || (lang === "ar" ? "عرض على الخريطة" : "View on map");
            return (
              <Cell key={k} label={label}>
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noreferrer"
                     title={t("open_in_maps")}
                     className="text-primary hover:underline inline-flex items-center gap-1 break-words">
                    {text}
                  </a>
                ) : <span className="break-words whitespace-pre-wrap">{raw}</span>}
              </Cell>
            );
          }
          // Hide the raw google_maps_url row entirely in read-only mode.
          if (k === "google_maps_url") return null;

          if (type === "bool") {
            return (
              <Cell key={k} label={label}>
                {raw === true ? "✓" : raw === false ? "✗" : "—"}
              </Cell>
            );
          }
          if (!raw) return <Cell key={k} label={label}>—</Cell>;
          const isLink = ["website","linkedin","facebook","instagram"].includes(k) && typeof raw === "string";
          return (
            <Cell key={k} label={label} full={type === "textarea"}>
              {isLink ? (
                <a href={raw.startsWith("http") ? raw : `https://${raw}`} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{raw}</a>
              ) : <span className="break-words whitespace-pre-wrap">{raw}</span>}
            </Cell>
          );
        }

        // Edit mode
        if (type === "bool") {
          return (
            <Cell key={k} label={label}>
              <select value={raw === true ? "yes" : raw === false ? "no" : ""}
                onChange={e => setForm({ ...form, [k]: e.target.value === "yes" ? true : e.target.value === "no" ? false : null })}
                className="bg-transparent text-sm">
                <option value="">—</option><option value="yes">✓</option><option value="no">✗</option>
              </select>
            </Cell>
          );
        }
        const Tag: any = type === "textarea" ? "textarea" : "input";
        return (
          <Cell key={k} label={label} full={type === "textarea"}>
            <Tag value={raw ?? ""} onChange={(e: any) => setForm({ ...form, [k]: e.target.value })}
              rows={type === "textarea" ? 3 : undefined}
              className="w-full bg-transparent text-sm focus:outline-none" />
          </Cell>
        );
      })}
    </div>
  );
}

function Cell({ label, children, full }: any) {
  return (
    <div className={`glass-card rounded-xl p-4 ${full ? "md:col-span-2" : ""}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function ReportTab({ analyses, loading, company }: { analyses: any[]; loading: boolean; company: any }) {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);
  if (analyses.length === 0) {
    return (
      <div className="space-y-4">
        <MissingInfoPanel company={company} />
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          {loading ? t("analyzing") : t("no_report")}
        </div>
      </div>
    );
  }
  const current = analyses[idx];
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("report_history")}</span>
          {analyses.map((a, i) => (
            <button key={a.id} onClick={() => setIdx(i)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${i === idx ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              V{a.version}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          {t("current_version")}: V{current.version} · {new Date(current.created_at).toLocaleString()}
        </div>
      </div>
      <MissingInfoPanel company={company} />
      <BdSnapshot snapshot={current.report?.snapshot} />
      <AiReport report={current.report} createdAt={current.created_at} />
    </div>
  );
}

function FilesTab({ files, onUpload, onDelete }: any) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <label className="glass-card rounded-xl p-6 border-dashed border-2 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition">
        <Upload className="size-6 text-primary" />
        <span className="text-sm">{t("upload_file")}</span>
        <input type="file" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
      </label>
      {files.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">{t("no_files")}</div>
      ) : (
        <ul className="space-y-2">
          {files.map((f: any) => <FileRow key={f.id} file={f} onDelete={onDelete} />)}
        </ul>
      )}
    </div>
  );
}

function FileRow({ file, onDelete }: any) {
  const { t } = useI18n();
  async function open() {
    try { const url = await fileSignedUrl(file.file_path); window.open(url, "_blank"); }
    catch (e: any) { toast.error(e?.message ?? t("toast_error")); }
  }
  return (
    <li className="glass-card rounded-xl p-3 flex items-center justify-between">
      <button onClick={open} className="flex items-center gap-3 flex-1 min-w-0 text-start">
        <FileText className="size-4 text-primary shrink-0" />
        <div className="min-w-0">
          <div className="text-sm truncate">{file.file_name}</div>
          <div className="text-[11px] text-muted-foreground">{formatBytes(file.file_size)}</div>
        </div>
      </button>
      <div className="flex items-center gap-1">
        <button onClick={open} title={t("edit")} className="p-1.5 rounded hover:bg-white/10"><Download className="size-3.5" /></button>
        <button onClick={() => onDelete(file.id, file.file_path)} className="p-1.5 rounded hover:bg-white/10"><Trash2 className="size-3.5 text-red-400" /></button>
      </div>
    </li>
  );
}

function TimelineTab({ companyId }: { companyId: string }) {
  const { t } = useI18n();
  const { data: history = [] } = useQuery({
    queryKey: ["history", companyId],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.from("pipeline_history").select("*")
        .eq("company_id", companyId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  if (history.length === 0) return <div className="text-sm text-muted-foreground text-center py-8">{t("none_yet")}</div>;
  return (
    <ol className="space-y-3">
      {history.map((h: any) => (
        <li key={h.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
          <div className="text-sm">
            {h.from_stage ? <span className="text-muted-foreground">{t(("stage_" + h.from_stage) as any)} → </span> : null}
            <span className="text-foreground">{t(("stage_" + h.to_stage) as any)}</span>
          </div>
          <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
        </li>
      ))}
    </ol>
  );
}

function formatBytes(n?: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}
