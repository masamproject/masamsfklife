"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Pill } from "@/components/ui/pill";
import type { Task } from "@/db/schema";
import { useWorkspaceData } from "@/lib/hooks/use-data";
import { dueState, fmtDue, PRIORITY_LABEL } from "@/lib/ui";
import { cn } from "@/lib/utils";

const PRI_TONE = { high: "high", medium: "mid", low: "default" } as const;

export function TaskMeta({ task, showProject }: { task: Task; showProject: boolean }) {
  const { data } = useWorkspaceData();
  const project = task.projectId ? data?.projects.find((p) => p.id === task.projectId) : undefined;
  const note = task.noteId ? data?.notes.find((n) => n.id === task.noteId) : undefined;
  const due = task.dueDate ? dueState(task.dueDate, task.isCompleted) : "none";
  const has = (showProject && project) || task.dueDate || task.priority || task.tags.length || note;
  if (!has) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-1">
      {showProject && project && <Pill tone="proj">{project.name}</Pill>}
      {task.dueDate && (
        <Pill tone={due === "overdue" ? "late" : due === "today" ? "today" : "default"}>{fmtDue(task.dueDate)}</Pill>
      )}
      {task.priority && <Pill tone={PRI_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Pill>}
      {task.tags.slice(0, 3).map((t) => (
        <Pill key={t} tone="tag">
          {t}
        </Pill>
      ))}
      {note && <Pill tone="link">Nota bağlı</Pill>}
    </div>
  );
}

export function CheckCircle({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={done ? "Tamamlandı, geri al" : "Tamamla"}
      aria-pressed={done}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-muted-foreground p-0 text-transparent hover:border-primary",
        done && "border-primary bg-primary text-primary-foreground",
      )}
    >
      <Check className="h-[11px] w-[11px]" strokeWidth={3} />
    </button>
  );
}

/** Sürüklemeden bağımsız saf görünüm (DragOverlay'de de kullanılır). */
export function TaskCardView({
  task,
  showProject,
  onToggle,
}: {
  task: Task;
  showProject: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-card px-2.5 py-[9px] hover:border-primary">
      <CheckCircle done={task.isCompleted} onToggle={onToggle ?? (() => {})} />
      <div className="min-w-0 flex-1">
        <div className={cn("[overflow-wrap:anywhere]", task.isCompleted && "text-muted-foreground line-through")}>
          {task.title || "Başlıksız görev"}
        </div>
        <TaskMeta task={task} showProject={showProject} />
      </div>
    </div>
  );
}

export function SortableTask({
  task,
  desktop,
  showProject,
  onToggle,
}: {
  task: Task;
  desktop: boolean;
  showProject: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const s = useSortable({ id: task.id, disabled: !desktop });
  const open = () => router.push(`${pathname}?card=${task.id}`, { scroll: false });
  return (
    <div
      ref={s.setNodeRef}
      style={{ transform: CSS.Transform.toString(s.transform), transition: s.transition }}
      className={cn("cursor-pointer touch-manipulation", s.isDragging && "opacity-40")}
      onClick={open}
      onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && open()}
      {...s.attributes}
      {...(desktop ? s.listeners : {})}
    >
      <TaskCardView task={task} showProject={showProject} onToggle={onToggle} />
    </div>
  );
}
