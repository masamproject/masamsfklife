"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PriorityIcon } from "@/components/board/task-card-view";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/db/schema";
import { GROUPS, groupTasks, type GroupKey } from "@/lib/grouping";
import { useDataActions, useWorkspaceData } from "@/lib/hooks/use-data";
import { dueState, formatDue, initials, tagColor } from "@/lib/ui";
import { cn } from "@/lib/utils";

const DUE_TEXT = {
  overdue: "text-red-500",
  today: "text-amber-600 dark:text-amber-400",
  soon: "text-amber-600 dark:text-amber-400",
  later: "text-muted-foreground",
  none: "",
} as const;

export function TodoList() {
  const { data, isLoading } = useWorkspaceData();
  const a = useDataActions();
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState("");
  const [collapsed, setCollapsed] = useState<Partial<Record<GroupKey, boolean>>>({ done: true });

  const groups = useMemo(() => groupTasks(data?.tasks ?? []), [data?.tasks]);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const firstList = data.lists[0];
  const add = () => {
    const title = value.trim();
    if (!title) return;
    // Görevler panoyla ortak: ilk listeye düşer (liste yoksa yalnızca burada görünür)
    a.addTask({
      id: crypto.randomUUID(),
      title,
      listId: firstList?.id ?? null,
      position: a.endPosition(firstList?.id ?? null, data.tasks),
    });
    setValue("");
  };

  const listName = (t: Task) => data.lists.find((l) => l.id === t.listId)?.title;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-6">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder="Yeni görev… (Enter ile ekle)"
        className="h-11 text-base"
      />

      {data.tasks.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Henüz görev yok. Yukarıdan ilk görevini ekle.
        </p>
      )}

      {GROUPS.map(({ key, label }) => {
        const items = groups[key];
        if (items.length === 0) return null;
        const isCollapsed = collapsed[key];
        return (
          <section key={key}>
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
              className="mb-1 flex w-full items-center gap-1.5 py-1 text-left"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")} />
              <h2 className={cn("text-sm font-semibold", key === "overdue" && "text-red-500")}>{label}</h2>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </button>
            {!isCollapsed && (
              <ul className="divide-y rounded-lg border bg-card">
                {items.map((t) => {
                  const assignee = data.members.find((m) => m.id === t.assigneeId);
                  const due = dueState(t.dueDate, t.isCompleted);
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                      <Checkbox
                        checked={t.isCompleted}
                        onCheckedChange={(v) => a.patchTask({ id: t.id, isCompleted: v === true })}
                        aria-label="Tamamla"
                      />
                      <button
                        className={cn(
                          "min-w-0 flex-1 truncate text-left text-sm",
                          t.isCompleted && "text-muted-foreground line-through",
                        )}
                        onClick={() => router.push(`${pathname}?card=${t.id}`, { scroll: false })}
                      >
                        {t.title}
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        {t.tags.slice(0, 3).map((tag) => (
                          <span key={tag} title={tag} className={cn("h-2 w-2 rounded-full", tagColor(tag))} />
                        ))}
                        {listName(t) && (
                          <span className="hidden rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline">
                            {listName(t)}
                          </span>
                        )}
                        {t.priority !== "medium" && <PriorityIcon priority={t.priority} />}
                        {t.dueDate && (
                          <span className={cn("text-xs", DUE_TEXT[due])}>{formatDue(t.dueDate)}</span>
                        )}
                        {assignee && (
                          <Avatar className="h-6 w-6">
                            {assignee.image && <AvatarImage src={assignee.image} alt={assignee.name} />}
                            <AvatarFallback className="text-[10px]">{initials(assignee.name)}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
