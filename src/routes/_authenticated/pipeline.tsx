import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { listCompanies, updateStage, STAGES, priorityColor, type Company, type Stage } from "@/lib/companies";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/pipeline")({
  ssr: false,
  component: PipelinePage,
});

function PipelinePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
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
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => listCompanies() });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStage: Record<Stage, Company[]> = STAGES.reduce((a, s) => (a[s] = [], a), {} as any);
  companies.forEach(c => byStage[c.stage].push(c));

  async function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const to = e.over?.id as Stage | undefined;
    if (!to || !STAGES.includes(to)) return;
    const c = companies.find(x => x.id === id);
    if (!c || c.stage === to) return;
    try {
      await updateStage(id, to);
      qc.invalidateQueries({ queryKey: ["companies"] });
    } catch (err: any) { toast.error(err?.message ?? t("toast_error")); }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl font-semibold">{t("nav_pipeline")}</h1>
        <p className="mt-2 text-muted-foreground">{companies.length} · {t("kpi_total").toLowerCase()}</p>
      </header>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(s => <Column key={s} stage={s} items={byStage[s]} />)}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ stage, items }: { stage: Stage; items: Company[] }) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef}
      className={`shrink-0 w-72 rounded-2xl border p-3 transition ${isOver ? "border-primary/60 bg-primary/5" : "border-border bg-white/[0.02]"}`}>
      <div className="flex items-center justify-between px-2 mb-3">
        <h3 className="text-sm font-semibold">{t(("stage_" + stage) as any)}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="space-y-2 min-h-24">
        {items.map(c => <Card key={c.id} c={c} />)}
      </div>
    </div>
  );
}

function Card({ c }: { c: Company }) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: c.id });
  const p = priorityColor(c.priority);
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={style}
      className={`glass-card rounded-xl p-3 cursor-grab active:cursor-grabbing ${isDragging ? "opacity-60 rotate-1" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: p.dot }} />
        <Link to="/companies/$id" params={{ id: c.id }} className="text-sm font-medium truncate flex-1 hover:text-primary" onClick={e => e.stopPropagation()}>
          {c.name}
        </Link>
      </div>
      {(c.industry || c.city) && (
        <div className="mt-1 text-[11px] text-muted-foreground truncate">
          {[c.industry, c.city].filter(Boolean).join(" · ")}
        </div>
      )}
      {typeof c.priority_score === "number" && (
        <div className="mt-2 text-[10px] text-muted-foreground">{t("kpi_high")}: {c.priority_score}</div>
      )}
    </div>
  );
}
