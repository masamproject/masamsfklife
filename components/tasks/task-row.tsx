"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, TaskMeta } from "@/components/tasks/task-card";
import { Pill } from "@/components/ui/pill";
import type { Task } from "@/db/schema";
import { useDataActions, type Data } from "@/lib/hooks/use-data";
import { cn } from "@/lib/utils";

/** Liste satırı: proje sayfasında görevler bu biçimde gösterilir. */
export function TaskRow({ task, data, inProject }: { task: Task; data: Data; inProject: boolean }) {
  const a = useDataActions();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const list = data.lists.find((l) => l.id === task.listId);
  const open = () => {
    const p = new URLSearchParams(params.toString());
    p.set("card", task.id);
    router.push(`${pathname}?${p}`, { scroll: false });
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && open()}
      className="flex cursor-pointer items-start gap-2.5 border-t px-3 py-[9px] first:border-t-0 hover:bg-background"
    >
      <CheckCircle done={task.isCompleted} onToggle={() => a.setDone(data, task, !task.isCompleted)} />
      <div className="min-w-0 flex-1">
        <div className={cn("[overflow-wrap:anywhere]", task.isCompleted && "text-muted-foreground line-through")}>{task.title || "Başlıksız görev"}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5">
          {list && <Pill>{list.title}</Pill>}
        </div>
        <TaskMeta task={task} showProject={!inProject} />
      </div>
    </div>
  );
}
