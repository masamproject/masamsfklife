"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { generateKeyBetween } from "fractional-indexing";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TaskCardView } from "@/components/tasks/task-card";
import { TaskColumn } from "@/components/tasks/task-column";
import { matches, useFilter } from "@/components/providers/filter-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/db/schema";
import { useIsDesktop } from "@/lib/hooks/use-desktop";
import { listsFor, useDataActions, useWorkspaceData } from "@/lib/hooks/use-data";

// Kart > sütun önceliği: imleç bir kartın üzerindeyse onu, değilse sütunu hedefle
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const card = hits.find((h) => !String(h.id).startsWith("col:"));
  if (card) return [card];
  if (hits.length) return hits;
  return closestCorners(args);
};

export function TaskBoard() {
  const { q, pf } = useFilter();
  const { data, isLoading } = useWorkspaceData();
  const a = useDataActions();
  const desktop = useIsDesktop();
  const [active, setActive] = useState<string | null>(null);
  const [focusList, setFocusList] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const live = useMemo(() => (data?.tasks ?? []).filter((t) => !t.archivedAt), [data?.tasks]);
  const projectOk = (t: Task) => !pf || t.projectId === pf;
  const visible = useMemo(
    () => live.filter((t) => projectOk(t) && matches(q, t.title, t.description, t.tags)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, q, pf],
  );

  if (isLoading || !data) {
    return (
      <div className="flex min-h-0 flex-1 gap-3.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-full min-w-[260px] flex-1 rounded-xl" />
        ))}
      </div>
    );
  }

  // Proje seçiliyse onun panosu; "Tüm projeler"de ortak sütunlar, sonra proje sütunları proje sırasıyla
  const projectName = (id: string | null) => data.projects.find((p) => p.id === id)?.name ?? "";
  const lists = pf
    ? listsFor(data, pf)
    : [...data.lists].sort((x, y) => {
        if (!x.projectId !== !y.projectId) return x.projectId ? 1 : -1;
        const byProject = projectName(x.projectId).localeCompare(projectName(y.projectId), "tr");
        return byProject || (x.position < y.position ? -1 : 1);
      });
  // Yeni liste hangi kapsama eklenir: projenin kendi sütunları varsa projeye, yoksa ortak
  const ownScope = pf && data.lists.some((l) => l.projectId === pf) ? pf : null;
  const scopeLists = data.lists.filter((l) => (l.projectId ?? null) === ownScope);
  const byList = (id: string) => visible.filter((t) => t.listId === id);

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const { active: act, over } = e;
    if (!over || act.id === over.id) return;
    const task = live.find((t) => t.id === act.id);
    if (!task) return;

    const oid = String(over.id);
    let targetListId: string;
    let prev: Task | undefined;
    let next: Task | undefined;

    if (oid.startsWith("col:")) {
      // sütun gövdesine bırakıldı: sona ekle
      targetListId = oid.slice(4);
      prev = live.filter((t) => t.listId === targetListId && t.id !== task.id).at(-1);
    } else {
      const overTask = live.find((t) => t.id === oid);
      if (!overTask?.listId) return;
      targetListId = overTask.listId;
      const col = live.filter((t) => t.listId === targetListId);
      const overIdx = col.findIndex((t) => t.id === overTask.id);
      if (task.listId === targetListId) {
        const arr = arrayMove(col, col.findIndex((t) => t.id === task.id), overIdx);
        prev = arr[overIdx - 1];
        next = arr[overIdx + 1];
      } else {
        const rect = act.rect.current.translated;
        const below = rect ? rect.top > over.rect.top + over.rect.height / 2 : false;
        prev = col[overIdx + (below ? 1 : 0) - 1];
        next = col[overIdx + (below ? 1 : 0)];
      }
    }
    a.moveTask(task.id, targetListId, generateKeyBetween(prev?.position ?? null, next?.position ?? null));
  }

  function addList() {
    // Tamamlanan sütun varsa yeni liste ondan önceye, yoksa sona eklenir
    const doneIdx = scopeLists.findIndex((l) => l.isDone);
    const before = doneIdx > 0 ? scopeLists[doneIdx - 1] : doneIdx === 0 ? undefined : scopeLists.at(-1);
    const after = doneIdx >= 0 ? scopeLists[doneIdx] : undefined;
    const id = crypto.randomUUID();
    setFocusList(id);
    a.addList({ id, title: "Yeni liste", projectId: ownScope, position: generateKeyBetween(before?.position ?? null, after?.position ?? null) });
  }

  const activeTask = active ? live.find((t) => t.id === active) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={(e: DragStartEvent) => setActive(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="flex min-h-0 flex-1 snap-x items-start gap-3 overflow-x-auto pb-1">
        {lists.map((l) => {
          const tasks = byList(l.id);
          const emptyCol = live.every((t) => t.listId !== l.id) && !q && !pf;
          return (
            <TaskColumn
              key={l.id}
              list={l}
              tasks={tasks}
              isDone={l.isDone}
              projectLabel={!pf && l.projectId ? projectName(l.projectId) : ""}
              canDelete={emptyCol && lists.length > 1}
              desktop={desktop}
              showProject={!pf && !l.projectId}
              autoFocusName={focusList === l.id}
              onRename={(title) => a.renameList(l.id, title)}
              onToggleDone={() => a.setListDone(l.id, !l.isDone)}
              onDelete={() => a.trash("list", l.id)}
              onArchiveAll={() => {
                tasks.forEach((t) => a.archive("task", t.id));
                toast(`${tasks.length} görev arşivlendi`);
              }}
              onAdd={(title) =>
                a.addTask({
                  id: crypto.randomUUID(),
                  title,
                  listId: l.id,
                  projectId: l.projectId ?? (pf || null),
                  position: a.endPosition(data, l.id),
                })
              }
              onToggle={(t) => a.setDone(data, t, !t.isCompleted)}
            />
          );
        })}

        <div className="w-[272px] shrink-0">
          <Button variant="outline" onClick={addList}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Liste ekle
            </Button>
        </div>
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-[280px] rotate-2 cursor-grabbing shadow-lg">
            <TaskCardView task={activeTask} showProject={!pf} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
