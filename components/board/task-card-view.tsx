"use client";

import { ArrowDown, ArrowUp, Equal, NotebookText } from "lucide-react";
import type { Task } from "@/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Member } from "@/lib/hooks/use-data";
import { dueState, formatDue, initials, tagColor } from "@/lib/ui";
import { cn } from "@/lib/utils";

const DUE_CLASS = {
  overdue: "bg-red-500 text-white",
  today: "bg-amber-500 text-white",
  soon: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  later: "bg-muted text-muted-foreground",
  none: "",
} as const;

export function PriorityIcon({ priority }: { priority: Task["priority"] }) {
  if (priority === "high") return <ArrowUp className="h-3.5 w-3.5 text-red-500" aria-label="Yüksek" />;
  if (priority === "low") return <ArrowDown className="h-3.5 w-3.5 text-sky-500" aria-label="Düşük" />;
  return <Equal className="h-3.5 w-3.5 text-muted-foreground" aria-label="Orta" />;
}

/** Sürükleme mantığından bağımsız, saf kart görünümü (DragOverlay'de de kullanılır). */
export function TaskCardView({
  task,
  assignee,
  onToggle,
}: {
  task: Task;
  assignee?: Member;
  onToggle?: () => void;
}) {
  const due = dueState(task.dueDate, task.isCompleted);
  return (
    <div className="space-y-2 rounded-lg border bg-card p-2.5 text-sm shadow-sm">
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((t) => (
            <span
              key={t}
              title={t}
              className={cn("h-2 w-9 rounded-full", tagColor(t))}
            />
          ))}
        </div>
      )}
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={task.isCompleted ? "Tamamlandı" : "Tamamla"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
            task.isCompleted ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40 hover:border-emerald-500",
          )}
        />
        <p className={cn("min-w-0 flex-1 break-words", task.isCompleted && "text-muted-foreground line-through")}>
          {task.title}
        </p>
      </div>
      {(task.dueDate || task.noteId || assignee || task.priority !== "medium") && (
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={cn("rounded px-1.5 py-0.5 text-xs", DUE_CLASS[due])}>
              {formatDue(task.dueDate)}
            </span>
          )}
          {task.priority !== "medium" && <PriorityIcon priority={task.priority} />}
          {task.noteId && <NotebookText className="h-3.5 w-3.5 text-muted-foreground" aria-label="Notla bağlı" />}
          <div className="flex-1" />
          {assignee && (
            <Avatar className="h-6 w-6">
              {assignee.image && <AvatarImage src={assignee.image} alt={assignee.name} />}
              <AvatarFallback className="text-[10px]">{initials(assignee.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
    </div>
  );
}
