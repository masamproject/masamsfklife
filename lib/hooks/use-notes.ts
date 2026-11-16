"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/components/providers/workspace-provider";
import type { Note } from "@/db/schema";
import { createNote, deleteNote, listNotes, updateNote } from "@/lib/actions/notes";
import { unwrap } from "@/lib/actions/unwrap";
import { toastUndo, useDataActions } from "@/lib/hooks/use-data";

/** Henüz sunucuya yazılmamış notlar: auto-save bunları beklemeli. */
const pendingCreates = new Map<string, Promise<unknown>>();

export const MEETING_TEMPLATE =
  "## Gündem\n- \n\n## Notlar\n- \n\n## Kararlar\n- \n\n## Aksiyonlar\n- ";

export function useNotes() {
  const ws = useWorkspace();
  return useQuery({
    queryKey: ["notes", ws.id],
    queryFn: () => unwrap(listNotes()) as Promise<Note[]>,
  });
}

export function useNoteActions() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const { restore } = useDataActions();
  const key = ["notes", ws.id];
  const setNotes = (fn: (n: Note[]) => Note[]) =>
    qc.setQueryData<Note[]>(key, (old) => fn(old ?? []));

  const create = useMutation({
    mutationFn: (n: Note) => {
      const p = unwrap(
        createNote({
          id: n.id,
          type: n.type,
          title: n.title,
          content: n.content,
          meetingDate: n.meetingDate,
          participants: n.participants,
        }),
      );
      pendingCreates.set(n.id, p);
      return p.finally(() => pendingCreates.delete(n.id));
    },
    onMutate: async (n) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Note[]>(key);
      setNotes((l) => [n, ...l]);
      return { prev };
    },
    onError: (e, _n, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      toast.error(e instanceof Error ? e.message : "Not oluşturulamadı.");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => unwrap(deleteNote({ id })),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Note[]>(key);
      setNotes((l) => l.filter((n) => n.id !== id));
      return { prev };
    },
    onError: (e, _id, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      toast.error(e instanceof Error ? e.message : "Silinemedi.");
    },
    onSuccess: (_d, id) => toastUndo("Not silindi", () => restore("note", id)),
  });

  /** Auto-save: sunucuya yazar, önbelleği yerelde günceller (yazarken refetch yok). */
  async function save(id: string, patch: Parameters<typeof updateNote>[0] extends infer P ? Omit<NonNullable<P>, "id"> : never) {
    await pendingCreates.get(id);
    await unwrap(updateNote({ id, ...patch }));
    setNotes((l) =>
      l
        .map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date() } as Note : n))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    );
  }

  return { create: create.mutate, remove: remove.mutate, save };
}
