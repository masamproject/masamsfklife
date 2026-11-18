"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CircleCheck, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SortableTask } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import type { List, Task } from "@/db/schema";
import { cn } from "@/lib/utils";

export function TaskColumn({
  list,
  tasks,
  isDone,
  projectLabel,
  canDelete,
  desktop,
  showProject,
  autoFocusName,
  onRename,
  onToggleDone,
  onDelete,
  onArchiveAll,
  onAdd,
  onToggle,
}: {
  list: List;
  tasks: Task[];
  isDone: boolean;
  projectLabel: string;
  canDelete: boolean;
  desktop: boolean;
  showProject: boolean;
  autoFocusName: boolean;
  onRename: (title: string) => void;
  onToggleDone: () => void;
  onDelete: () => void;
  onArchiveAll: () => void;
  onAdd: (title: string) => void;
  onToggle: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${list.id}` });
  const [name, setName] = useState(list.title);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => setName(list.title), [list.title]);
  useEffect(() => {
    if (autoFocusName) {
      nameRef.current?.focus();
      nameRef.current?.select();
    }
  }, [autoFocusName]);

  return (
    <section
      aria-label={list.title}
      className="flex min-h-0 min-w-[260px] flex-1 basis-[260px] snap-start flex-col rounded-[10px] bg-muted p-2 max-md:w-[280px] max-md:flex-none"
    >
      <div className="flex shrink-0 items-center gap-1.5 px-1 pb-2 pt-0.5">
        <input
          ref={nameRef}
          value={name}
          aria-label="Liste adı"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const v = name.trim();
            if (v && v !== list.title) onRename(v);
            else setName(list.title);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="min-w-0 flex-1 rounded bg-transparent p-1 font-semibold hover:bg-card focus:bg-card"
        />
        <span className="font-mono text-xs font-medium text-muted-foreground">{tasks.length}</span>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", isDone ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground")}
          aria-label={isDone ? "Tamamlanan sütun (kaldır)" : "Tamamlanan sütun yap"}
          aria-pressed={isDone}
          title={isDone ? "Tamamlanan sütun: buraya giren görev tamamlanır" : "Tamamlanan sütun yap"}
          onClick={onToggleDone}
        >
          <CircleCheck className="h-4 w-4" />
        </Button>
        {isDone && tasks.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={onArchiveAll}>
            Hepsini arşivle
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            aria-label="Listeyi sil"
            title="Boş listeyi sil"
            onClick={onDelete}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {projectLabel && (
        <div className="-mt-1.5 truncate px-2 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary" title={projectLabel}>
          {projectLabel}
        </div>
      )}

      <div ref={setNodeRef} className={cn("flex min-h-[44px] flex-1 flex-col gap-2 overflow-y-auto rounded-lg p-0.5", isOver && "bg-primary-soft")}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableTask key={t.id} task={t} desktop={desktop} showProject={showProject} onToggle={() => onToggle(t)} />
          ))}
        </SortableContext>
      </div>

      {composing ? (
        <form
          className="mt-2 flex shrink-0 flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const v = text.trim();
            if (!v) return;
            setText("");
            onAdd(v);
          }}
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (setComposing(false), setText(""))}
            placeholder="Kart başlığı"
            aria-label="Kart başlığı"
            className="rounded-md border border-primary bg-card px-2.5 py-2 outline-none"
          />
          <div className="flex gap-1.5">
            <Button type="submit" size="sm">
              Ekle
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => (setComposing(false), setText(""))}>
              Kapat
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="ghost"
          className="mt-1.5 w-full shrink-0 justify-start text-muted-foreground"
          onClick={() => setComposing(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Kart ekle
        </Button>
      )}
    </section>
  );
}
