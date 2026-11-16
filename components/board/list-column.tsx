"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { QuickAdd } from "@/components/board/quick-add";
import { TaskCardView } from "@/components/board/task-card-view";
import { Button } from "@/components/ui/button";
import type { List, Task } from "@/db/schema";
import type { Member } from "@/lib/hooks/use-data";
import { cn } from "@/lib/utils";

function SortableTask({
  task,
  member,
  desktop,
  onOpen,
  onToggle,
}: {
  task: Task;
  member?: Member;
  desktop: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const s = useSortable({ id: `task:${task.id}`, disabled: !desktop });
  return (
    <div
      ref={s.setNodeRef}
      style={{ transform: CSS.Transform.toString(s.transform), transition: s.transition }}
      className={cn("cursor-pointer touch-manipulation", s.isDragging && "opacity-30")}
      onClick={onOpen}
      {...s.attributes}
      {...(desktop ? s.listeners : {})}
    >
      <TaskCardView task={task} assignee={member} onToggle={onToggle} />
    </div>
  );
}

export function ListColumn({
  list,
  tasks,
  members,
  desktop,
  onRename,
  onDelete,
  onAddTask,
  onToggleTask,
}: {
  list: List;
  tasks: Task[];
  members: Member[];
  desktop: boolean;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddTask: (title: string) => void;
  onToggleTask: (t: Task) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const s = useSortable({ id: `list:${list.id}`, disabled: !desktop });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);

  const commit = () => {
    setEditing(false);
    const t = title.trim();
    if (t && t !== list.title) onRename(t);
    else setTitle(list.title);
  };

  return (
    <section
      ref={s.setNodeRef}
      style={{ transform: CSS.Transform.toString(s.transform), transition: s.transition }}
      className={cn(
        "flex max-h-full w-72 shrink-0 snap-start flex-col rounded-xl bg-muted/60 p-2",
        s.isDragging && "opacity-40",
      )}
    >
      <header
        className={cn("flex items-center gap-1 px-1 pb-2", desktop && "cursor-grab")}
        {...s.attributes}
        {...(desktop && !editing ? s.listeners : {})}
      >
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setTitle(list.title);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded border bg-background px-1.5 py-0.5 text-sm font-semibold outline-none"
          />
        ) : (
          <h3
            className="min-w-0 flex-1 cursor-text truncate px-1 text-sm font-semibold"
            onClick={() => setEditing(true)}
          >
            {list.title}
          </h3>
        )}
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Listeyi sil"
          title={tasks.length ? "Yalnızca boş listeler silinebilir" : "Listeyi sil"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() =>
            tasks.length ? toast.error("Yalnızca boş listeler silinebilir.") : onDelete()
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </header>

      <div className="flex min-h-[2rem] flex-1 flex-col gap-2 overflow-y-auto px-0.5 pb-1">
        <SortableContext items={tasks.map((t) => `task:${t.id}`)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableTask
              key={t.id}
              task={t}
              desktop={desktop}
              member={members.find((m) => m.id === t.assigneeId)}
              onOpen={() => router.push(`${pathname}?card=${t.id}`, { scroll: false })}
              onToggle={() => onToggleTask(t)}
            />
          ))}
        </SortableContext>
      </div>
      <QuickAdd label="Kart ekle" placeholder="Kart başlığı… (Enter)" onAdd={onAddTask} />
    </section>
  );
}
