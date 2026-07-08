import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Plus, Search, Sparkles, Trash2, Archive, Copy, FileSpreadsheet, Download, Filter, ArchiveRestore } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  listCompanies, priorityColor, deleteCompany, archiveCompany, duplicateCompany,
  saveCompany, type Company, type Priority,
} from "@/lib/companies";
import { rankAllCompanies } from "@/lib/ai.functions";
import { SmartAddDialog } from "@/components/SmartAddDialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/companies/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  validateSearch: (search: Record<string, unknown>) => ({
    stage: typeof search.stage === "string" ? (search.stage as string) : undefined,
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { stage: stageFilter } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [archived, setArchived] = useState(false);
  const [openSmart, setOpenSmart] = useState(false);
  const [sort, setSort] = useState<"priority" | "recent" | "name">("priority");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies", { archived }],
    queryFn: () => listCompanies({ archived }),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = companies.filter(c => {
      if (stageFilter && c.stage !== stageFilter) return false;
      if (priority !== "all" && c.priority !== priority) return false;
      if (!q) return true;
      return [c.name, c.industry, c.city, c.country, c.website, c.decision_maker]
        .some(v => (v ?? "").toLowerCase().includes(q));
    });
    if (sort === "name") rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "recent") rows = [...rows].sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
    return rows;
  }, [companies, query, priority, sort, stageFilter]);

  const rank = useMutation({
    mutationFn: () => rankAllCompanies({ data: { language: lang } }),
    onSuccess: () => { toast.success(t("toast_ranked")); qc.invalidateQueries({ queryKey: ["companies"] }); },
    onError: (e: any) => toast.error(e?.message ?? t("toast_error")),
  });

  function exportXlsx() {
    const rows = filtered.map(c => ({
      Name: c.name, Industry: c.industry, City: c.city, Country: c.country,
      Website: c.website, Phone: c.phone, Email: c.email,
      Employees: c.employees, Stage: c.stage, Priority: c.priority, Score: c.priority_score,
      Reason: c.priority_reason,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Companies");
    XLSX.writeFile(wb, `companies_${Date.now()}.xlsx`);
  }

  function exportCsv() {
    const rows = filtered.map(c => ({
      Name: c.name, Industry: c.industry, City: c.city, Country: c.country,
      Website: c.website, Phone: c.phone, Email: c.email, Stage: c.stage,
      Priority: c.priority, Score: c.priority_score,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `companies_${Date.now()}.csv`);
  }

  async function onImport(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
      const norm = (o: Record<string, any>) => {
        const g = (...keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(o).find(x => x.toLowerCase() === k.toLowerCase());
            if (found && o[found] !== undefined && o[found] !== "") return String(o[found]);
          }
          return null;
        };
        return {
          name: g("name","company","اسم الشركة","الاسم"),
          industry: g("industry","القطاع"),
          country: g("country","الدولة"),
          city: g("city","المدينة"),
          website: g("website","site","الموقع"),
          phone: g("phone","الهاتف"),
          email: g("email","البريد"),
          employees: g("employees","الموظفين"),
          notes: g("notes","ملاحظات"),
        };
      };
      let ok = 0, skip = 0;
      for (const r of rows) {
        const n = norm(r);
        if (!n.name) { skip++; continue; }
        // dedupe: match by name + city
        const dupe = companies.find(c => c.name.trim().toLowerCase() === n.name!.trim().toLowerCase()
          && (n.city ? (c.city ?? "").toLowerCase() === n.city!.toLowerCase() : true));
        if (dupe) { skip++; continue; }
        await saveCompany(n as any);
        ok++;
      }
      toast.success(`${ok} imported · ${skip} skipped`);
      qc.invalidateQueries({ queryKey: ["companies"] });
    } catch (e: any) {
      toast.error(e?.message ?? t("toast_error"));
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">{t("companies_title")}</h1>
          <p className="mt-2 text-muted-foreground">{companies.length} {t("kpi_total").toLowerCase()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="glass-card px-3 py-2 rounded-xl text-sm cursor-pointer hover:border-primary/50 transition inline-flex items-center gap-2">
            <FileSpreadsheet className="size-4" />{t("import_xlsx")}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
          </label>
          <button onClick={exportCsv} className="glass-card px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 hover:border-primary/50 transition">
            <Download className="size-4" />{t("export_csv")}
          </button>
          <button onClick={exportXlsx} className="glass-card px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 hover:border-primary/50 transition">
            <Download className="size-4" />{t("export_xlsx")}
          </button>
          <button onClick={() => rank.mutate()} disabled={rank.isPending || companies.length === 0}
            className="glass-card px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 hover:border-primary/50 transition disabled:opacity-50">
            <Sparkles className="size-4 text-primary" />
            {rank.isPending ? t("analyzing") : t("companies_analyze_all")}
          </button>
          <button onClick={() => setOpenSmart(true)}
            className="rounded-xl px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold gold-glow inline-flex items-center gap-2 hover:opacity-90 transition">
            <Plus className="size-4" />{t("companies_smart_add")}
          </button>
        </div>
      </header>

      <div className="glass-card rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("companies_search")}
            className="w-full bg-transparent ps-10 pe-3 py-2 text-sm focus:outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <select value={priority} onChange={e => setPriority(e.target.value as any)}
            className="bg-transparent border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none">
            <option value="all">{t("nav_companies")}</option>
            <option value="high">{t("priority_high")}</option>
            <option value="medium">{t("priority_medium")}</option>
            <option value="low">{t("priority_low")}</option>
            <option value="unranked">{t("priority_unranked")}</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as any)}
            className="bg-transparent border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none">
            <option value="priority">{t("kpi_high")}</option>
            <option value="recent">{t("version")}</option>
            <option value="name">{t("field_name")}</option>
          </select>
          <label className="text-sm flex items-center gap-2 text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} />
            {t("archive")}
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">…</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">{t("companies_empty")}</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map(c => <CompanyRow key={c.id} c={c} />)}
        </ul>
      )}

      <SmartAddDialog open={openSmart} onOpenChange={setOpenSmart} onSaved={() => qc.invalidateQueries({ queryKey: ["companies"] })} />
    </div>
  );
}

function CompanyRow({ c }: { c: Company }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const p = priorityColor(c.priority);

  async function onDelete() {
    if (!confirm(t("confirm_delete"))) return;
    try { await deleteCompany(c.id); toast.success(t("toast_deleted")); qc.invalidateQueries({ queryKey: ["companies"] }); }
    catch (e: any) { toast.error(e?.message ?? t("toast_error")); }
  }
  async function onArchive() {
    try { await archiveCompany(c.id, !c.archived); qc.invalidateQueries({ queryKey: ["companies"] }); }
    catch (e: any) { toast.error(e?.message ?? t("toast_error")); }
  }
  async function onDuplicate() {
    try { await duplicateCompany(c.id); toast.success(t("duplicate")); qc.invalidateQueries({ queryKey: ["companies"] }); }
    catch (e: any) { toast.error(e?.message ?? t("toast_error")); }
  }

  return (
    <li className="glass-card rounded-2xl p-5 group hover:border-primary/40 transition">
      <div className="flex items-start justify-between gap-3">
        <Link to="/companies/$id" params={{ id: c.id }} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: p.dot }} />
            <h3 className="font-serif text-lg truncate">{c.name}</h3>
          </div>
          <div className="mt-1 text-xs text-muted-foreground truncate">
            {[c.industry, c.city, c.country].filter(Boolean).join(" · ") || "—"}
          </div>
        </Link>
        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ring-1 shrink-0 ${p.ring}`}>
          {t(p.label as any)}{typeof c.priority_score === "number" ? ` · ${c.priority_score}` : ""}
        </span>
      </div>
      {c.priority_reason && (
        <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{c.priority_reason}</p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/70">{t(("stage_" + c.stage) as any)}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <IconBtn onClick={onDuplicate} title={t("duplicate")}><Copy className="size-3.5" /></IconBtn>
          <IconBtn onClick={onArchive} title={c.archived ? t("unarchive") : t("archive")}>
            {c.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          </IconBtn>
          <IconBtn onClick={onDelete} title={t("delete")}><Trash2 className="size-3.5 text-red-400" /></IconBtn>
        </div>
      </div>
    </li>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button title={title} onClick={onClick}
      className="p-1.5 rounded-md hover:bg-white/10 transition text-muted-foreground hover:text-foreground">
      {children}
    </button>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
