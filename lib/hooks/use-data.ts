"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generateKeyBetween } from "fractional-indexing";
import { toast } from "sonner";
import { useWorkspace } from "@/components/providers/workspace-provider";
import type { List, Task } from "@/db/schema";
import {
  createList,
  createTask,
  deleteList,
  deleteTask,
  getWorkspaceData,
  moveList,
  moveTask,
  renameList,
  updateTask,
} from "@/lib/actions/board";
import { restoreItem } from "@/lib/actions/trash";
import { unwrap } from "@/lib/actions/unwrap";

export type Member = { id: string; name: string; email: string; image: string | null };
export type Data = { lists: List[]; tasks: Task[]; members: Member[] };

export const dataKey = (wsId: string) => ["data", wsId] as const;

export function useWorkspaceData() {
  const ws = useWorkspace();
  return useQuery({
    queryKey: dataKey(ws.id),
    queryFn: () => unwrap(getWorkspaceData()) as Promise<Data>,
  });
}

/** 5 saniyelik "Geri Al" bildirimi */
export function toastUndo(message: string, onUndo: () => void) {
  toast(message, { duration: 5000, action: { label: "Geri Al", onClick: onUndo } });
}

const byPos = <T extends { position: string }>(a: T, b: T) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0;

export function useDataActions() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const key = dataKey(ws.id);

  /** Optimistic mutation: önbelleği hemen günceller, hatada geri alır. */
  function useOpt<V>(
    fn: (v: V) => Promise<unknown>,
    apply: (d: Data, v: V) => Data,
    onSuccess?: (v: V) => void,
  ) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMutation({
      mutationKey: ["data-mut", ws.id],
      mutationFn: fn,
      onMutate: async (v: V) => {
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData<Data>(key);
        if (prev) qc.setQueryData<Data>(key, apply(prev, v));
        return { prev };
      },
      onError: (e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(key, ctx.prev);
        toast.error(e instanceof Error ? e.message : "İşlem başarısız.");
      },
      onSuccess: (_d, v) => onSuccess?.(v),
      onSettled: () => {
        // başka mutation sürüyorsa yenileme yapma (yarış → titreme)
        if (qc.isMutating({ mutationKey: ["data-mut", ws.id] }) <= 1) {
          qc.invalidateQueries({ queryKey: key });
        }
      },
    });
  }

  const restore = (kind: "list" | "task" | "note", id: string) =>
    unwrap(restoreItem({ kind, id })).then(() => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["trash", ws.id] });
      qc.invalidateQueries({ queryKey: ["notes", ws.id] });
    });

  const addList = useOpt<{ id: string; title: string; position: string }>(
    (v) => unwrap(createList(v)),
    (d, v) => ({
      ...d,
      lists: [
        ...d.lists,
        { id: v.id, workspaceId: ws.id, title: v.title, position: v.position, createdAt: new Date(), deletedAt: null },
      ],
    }),
  );
  const renameListM = useOpt<{ id: string; title: string }>(
    (v) => unwrap(renameList(v)),
    (d, v) => ({ ...d, lists: d.lists.map((l) => (l.id === v.id ? { ...l, title: v.title } : l)) }),
  );
  const moveListM = useOpt<{ id: string; position: string }>(
    (v) => unwrap(moveList(v)),
    (d, v) => ({
      ...d,
      lists: d.lists.map((l) => (l.id === v.id ? { ...l, position: v.position } : l)).sort(byPos),
    }),
  );
  const removeListM = useOpt<{ id: string }>(
    (v) => unwrap(deleteList(v)),
    (d, v) => ({ ...d, lists: d.lists.filter((l) => l.id !== v.id) }),
    (v) => toastUndo("Liste silindi", () => restore("list", v.id)),
  );

  const addTaskM = useOpt<{
    id: string;
    title: string;
    listId: string | null;
    noteId?: string | null;
    dueDate?: Date | null;
    position: string;
  }>(
    (v) => unwrap(createTask(v)),
    (d, v) => ({
      ...d,
      tasks: [
        ...d.tasks,
        {
          id: v.id,
          workspaceId: ws.id,
          creatorId: ws.user.id,
          assigneeId: null,
          listId: v.listId,
          noteId: v.noteId ?? null,
          title: v.title,
          description: "",
          dueDate: v.dueDate ?? null,
          priority: "medium" as const,
          tags: [],
          isCompleted: false,
          position: v.position,
          createdAt: new Date(),
          deletedAt: null,
        },
      ].sort(byPos),
    }),
  );

  type Patch = Partial<
    Pick<Task, "title" | "description" | "dueDate" | "priority" | "tags" | "assigneeId" | "isCompleted">
  >;
  const patchTaskM = useOpt<{ id: string } & Patch>(
    (v) => unwrap(updateTask(v)),
    (d, { id, ...p }) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) }),
  );
  const moveTaskM = useOpt<{ id: string; listId: string; position: string }>(
    (v) => unwrap(moveTask(v)),
    (d, v) => ({
      ...d,
      tasks: d.tasks
        .map((t) => (t.id === v.id ? { ...t, listId: v.listId, position: v.position } : t))
        .sort(byPos),
    }),
  );
  const removeTaskM = useOpt<{ id: string }>(
    (v) => unwrap(deleteTask(v)),
    (d, v) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== v.id) }),
    (v) => toastUndo("Görev silindi", () => restore("task", v.id)),
  );

  /** Bir listenin sonuna eklemek için konum üretir. */
  function endPosition(listId: string | null, tasks: Task[]) {
    const last = tasks.filter((t) => t.listId === listId).sort(byPos).at(-1);
    return generateKeyBetween(last?.position ?? null, null);
  }

  return {
    addList: addList.mutate,
    renameList: renameListM.mutate,
    moveList: moveListM.mutate,
    removeList: removeListM.mutate,
    addTask: addTaskM.mutate,
    patchTask: patchTaskM.mutate,
    moveTask: moveTaskM.mutate,
    removeTask: removeTaskM.mutate,
    restore,
    endPosition,
  };
}
