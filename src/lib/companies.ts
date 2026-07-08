import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type Analysis = Database["public"]["Tables"]["company_analyses"]["Row"];
export type Stage = Database["public"]["Enums"]["pipeline_stage"];
export type Priority = Database["public"]["Enums"]["company_priority"];

export const STAGES: Stage[] = [
  "new_lead","researching","ai_analyzed","qualified","contact_ready",
  "meeting_scheduled","proposal_sent","negotiation","won","lost",
];

export async function listCompanies(opts?: { archived?: boolean }) {
  const q = supabase.from("companies").select("*")
    .eq("archived", opts?.archived ?? false)
    .order("priority_score", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getCompany(id: string) {
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function saveCompany(payload: CompanyInsert & { id?: string }) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (payload.id) {
    const { data, error } = await supabase.from("companies")
      .update({ ...payload, updated_by: uid }).eq("id", payload.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("companies")
    .insert({ ...payload, created_by: uid, updated_by: uid }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCompany(id: string) {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}

export async function archiveCompany(id: string, archived: boolean) {
  const { error } = await supabase.from("companies").update({ archived }).eq("id", id);
  if (error) throw error;
}

export async function duplicateCompany(id: string) {
  const src = await getCompany(id);
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = src as any;
  return saveCompany({ ...rest, name: `${src.name} (copy)` });
}

export async function updateStage(id: string, stage: Stage) {
  const { data: userRes } = await supabase.auth.getUser();
  const { error } = await supabase.from("companies").update({ stage, updated_by: userRes.user?.id }).eq("id", id);
  if (error) throw error;
}

export async function listAnalyses(companyId: string) {
  const { data, error } = await supabase.from("company_analyses")
    .select("*").eq("company_id", companyId).order("version", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listFiles(companyId: string) {
  const { data, error } = await supabase.from("company_files")
    .select("*").eq("company_id", companyId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadCompanyFile(companyId: string, file: File) {
  const { data: userRes } = await supabase.auth.getUser();
  const path = `${companyId}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
  const { error: upErr } = await supabase.storage.from("company-files").upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const { error: insErr, data } = await supabase.from("company_files").insert({
    company_id: companyId,
    file_name: file.name,
    file_path: path,
    file_type: file.type,
    file_size: file.size,
    uploaded_by: userRes.user?.id,
  }).select().single();
  if (insErr) throw insErr;
  return data;
}

export async function deleteCompanyFile(id: string, path: string) {
  await supabase.storage.from("company-files").remove([path]);
  const { error } = await supabase.from("company_files").delete().eq("id", id);
  if (error) throw error;
}

export async function fileSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from("company-files").createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export function priorityColor(p: Priority) {
  switch (p) {
    case "high": return { dot: "#22c55e", label: "priority_high", ring: "ring-emerald-500/40 bg-emerald-500/10 text-emerald-300" };
    case "medium": return { dot: "#f59e0b", label: "priority_medium", ring: "ring-amber-500/40 bg-amber-500/10 text-amber-300" };
    case "low": return { dot: "#ef4444", label: "priority_low", ring: "ring-red-500/40 bg-red-500/10 text-red-300" };
    default: return { dot: "#64748b", label: "priority_unranked", ring: "ring-white/10 bg-white/5 text-muted-foreground" };
  }
}

// ---------- Dashboard snapshots (KPI comparisons) ----------

export type DashboardStats = {
  total: number;
  high: number;
  analyzed: number;
  won: number;
};

export type DashboardStatsWithDeltas = DashboardStats & {
  delta_day: Partial<DashboardStats>;   // change vs ~24h ago (from yesterday's snapshot)
  delta_week: Partial<DashboardStats>;  // change vs ~7 days ago
};

function computeStats(companies: Company[]): DashboardStats {
  return {
    total: companies.length,
    high: companies.filter(c => c.priority === "high").length,
    won: companies.filter(c => c.stage === "won").length,
    analyzed: companies.filter(c => c.stage !== "new_lead" && c.stage !== "researching").length,
  };
}

/**
 * Compute today's stats from the live companies list, upsert today's snapshot,
 * and return deltas vs the most recent snapshot from yesterday (or older) and
 * from ~7 days ago.
 */
export async function getDashboardStatsWithDeltas(
  companies: Company[],
): Promise<DashboardStatsWithDeltas> {
  const today = computeStats(companies);
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;

  const empty: DashboardStatsWithDeltas = { ...today, delta_day: {}, delta_week: {} };
  if (!uid) return empty;

  const todayDate = new Date().toISOString().slice(0, 10);

  // Upsert today's snapshot (fire-and-forget; ignore errors so UI still renders).
  try {
    await supabase.from("dashboard_snapshots").upsert(
      { user_id: uid, snapshot_date: todayDate, ...today },
      { onConflict: "user_id,snapshot_date" },
    );
  } catch { /* ignore */ }

  // Fetch the last ~30 snapshots to pick the best matches for deltas.
  const { data: snaps } = await supabase
    .from("dashboard_snapshots")
    .select("snapshot_date, total, high, analyzed, won")
    .eq("user_id", uid)
    .lt("snapshot_date", todayDate)
    .order("snapshot_date", { ascending: false })
    .limit(30);

  const list = snaps ?? [];
  const yest = list[0]; // most recent past snapshot
  const weekTarget = new Date(); weekTarget.setDate(weekTarget.getDate() - 7);
  const weekTargetStr = weekTarget.toISOString().slice(0, 10);
  const week = list.find(s => s.snapshot_date <= weekTargetStr) ?? list[list.length - 1];

  const diff = (a: DashboardStats, b: any): Partial<DashboardStats> => ({
    total: today.total - (b?.total ?? 0),
    high: today.high - (b?.high ?? 0),
    analyzed: today.analyzed - (b?.analyzed ?? 0),
    won: today.won - (b?.won ?? 0),
  });

  return {
    ...today,
    delta_day: yest ? diff(today, yest) : {},
    delta_week: week && week !== yest ? diff(today, week) : {},
  };
}

