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
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { generateKeyBetween } from "fractional-indexing";
import { useMemo, useState } from "react";
import { ListColumn } from "@/components/board/list-column";
import { QuickAdd } from "@/components/board/quick-add";
import { TaskCardView } from "@/components/board/task-card-view";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/db/schema";
import { useIsDesktop } from "@/lib/hooks/use-desktop";
import { PLAN_LIMITS } from "@/lib/plan";
import { useDataActions, useWorkspaceData } from "@/lib/hooks/use-data";


// Görev sürüklerken görev > liste önceliği; liste sürüklerken yalnızca listeler.
const collision: CollisionDetection = (args) => {
  const draggingList = String(args.active.id).startsWith("list:");
  if (draggingList) {
    return closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => String(c.id).startsWith("list:")),
    });
  }
  const hits = pointerWithin(args);
  const task = hits.find((h) => String(h.id).startsWith("task:"));
  if (task) return [task];
  if (hits.length) return hits;
  return closestCorners(args);
};

export function Board() {
  const ws = useWorkspace();
  const { data, isLoading } = useWorkspaceData();
  const a = useDataActions();
  const desktop = useIsDesktop();
  const [active, setActive] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const tasksByList = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of data?.tasks ?? []) {
      if (!t.listId) continue;
      const arr = m.get(t.listId) ?? [];
      arr.push(t);
      m.set(t.listId, arr);
    }
    return m;
  }, [data?.tasks]);

  if (isLoading || !data) {
    return (
      <div className="flex gap-3 p-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 w-72 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  const { lists, tasks, members } = data;
  const limitReached = ws.plan === "free" && lists.length >= PLAN_LIMITS.free.lists;

  function onDragStart(e: DragStartEvent) {
    setActive(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const { active: act, over } = e;
    if (!over || act.id === over.id) return;
    const aid = String(act.id);
    const oid = String(over.id);

    // --- liste sürükleme ---
    if (aid.startsWith("list:")) {
      if (!oid.startsWith("list:")) return;
      const from = lists.findIndex((l) => `list:${l.id}` === aid);
      const to = lists.findIndex((l) => `list:${l.id}` === oid);
      if (from < 0 || to < 0) return;
      const arr = arrayMove(lists, from, to);
      const prev = arr[to - 1];
      const next = arr[to + 1];
      a.moveList({
        id: lists[from].id,
        position: generateKeyBetween(prev?.position ?? null, next?.position ?? null),
      });
      return;
    }

    // --- kart sürükleme ---
    const task = tasks.find((t) => `task:${t.id}` === aid);
    if (!task) return;

    let targetListId: string;
    let prev: Task | undefined;
    let next: Task | undefined;

    if (oid.startsWith("list:")) {
      // liste gövdesine bırakıldı: sona ekle
      targetListId = oid.slice(5);
      const arr = (tasksByList.get(targetListId) ?? []).filter((t) => t.id !== task.id);
      prev = arr.at(-1);
    } else {
      const overTask = tasks.find((t) => `task:${t.id}` === oid);
      if (!overTask?.listId) return;
      targetListId = overTask.listId;
      const col = tasksByList.get(targetListId) ?? [];
      const overIdx = col.findIndex((t) => t.id === overTask.id);
      if (task.listId === targetListId) {
        const oldIdx = col.findIndex((t) => t.id === task.id);
        const arr = arrayMove(col, oldIdx, overIdx);
        prev = arr[overIdx - 1];
        next = arr[overIdx + 1];
      } else {
        const rect = act.rect.current.translated;
        const below = rect ? rect.top > over.rect.top + over.rect.height / 2 : false;
        const idx = overIdx + (below ? 1 : 0);
        prev = col[idx - 1];
        next = col[idx];
      }
    }

    a.moveTask({
      id: task.id,
      listId: targetListId,
      position: generateKeyBetween(prev?.position ?? null, next?.position ?? null),
    });
  }

  const activeTask = active?.startsWith("task:") ? tasks.find((t) => `task:${t.id}` === active) : null;
  const activeList = active?.startsWith("list:") ? lists.find((l) => `list:${l.id}` === active) : null;

  return (
    <DndContext
      sensors={desktop ? sensors : []}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="flex h-full snap-x items-start gap-3 overflow-x-auto p-3 sm:p-4">
        <SortableContext items={lists.map((l) => `list:${l.id}`)} strategy={horizontalListSortingStrategy}>
          {lists.map((l) => (
            <ListColumn
              key={l.id}
              list={l}
              tasks={tasksByList.get(l.id) ?? []}
              members={members}
              desktop={desktop}
              onRename={(title) => a.renameList({ id: l.id, title })}
              onDelete={() => a.removeList({ id: l.id })}
              onAddTask={(title) =>
                a.addTask({
                  id: crypto.randomUUID(),
                  title,
                  listId: l.id,
                  position: a.endPosition(l.id, tasks),
                })
              }
              onToggleTask={(t) => a.patchTask({ id: t.id, isCompleted: !t.isCompleted })}
            />
          ))}
        </SortableContext>

        <div className="w-72 shrink-0 space-y-1">
          {limitReached ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Free planda en fazla {PLAN_LIMITS.free.lists} liste olabilir. Daha fazlası için Pro&apos;ya geç.
            </p>
          ) : (
            <div className="rounded-xl bg-muted/40 p-2">
              <QuickAdd
                label={lists.length ? "Liste ekle" : "İlk listeni ekle"}
                placeholder="Liste adı… (Enter)"
                onAdd={(title) => {
                  const last = lists.at(-1);
                  a.addList({
                    id: crypto.randomUUID(),
                    title,
                    position: generateKeyBetween(last?.position ?? null, null),
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-72 rotate-2 cursor-grabbing">
            <TaskCardView task={activeTask} assignee={members.find((m) => m.id === activeTask.assigneeId)} />
          </div>
        )}
        {activeList && (
          <div className="w-72 rounded-xl bg-muted p-3 text-sm font-semibold shadow-lg">{activeList.title}</div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
