"use client";

import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import { toast } from "sonner";
import { useWorkspace } from "@/components/providers/workspace-provider";
import type {
  FileRow,
  List,
  Note,
  NoteAction,
  Notebook,
  Project,
  Section,
  Task,
} from "@/db/schema";
import * as api from "@/lib/actions/data";
import { unwrap } from "@/lib/actions/unwrap";

export type Member = { id: string; name: string; email: string; image: string | null };
export type Person = { id: string; name: string };
export type Data = {
  lists: List[];
  tasks: Task[];
  notes: Note[];
  projects: Project[];
  notebooks: Notebook[];
  sections: Section[];
  files: FileRow[];
  members: Member[];
  people: Person[];
};
export type Kind = "task" | "note" | "project" | "file" | "list" | "notebook" | "section";

const COLL: Record<Kind, keyof Omit<Data, "members" | "people">> = {
  task: "tasks",
  note: "notes",
  project: "projects",
  file: "files",
  list: "lists",
  notebook: "notebooks",
  section: "sections",
};
const LABEL: Record<Kind, string> = {
  task: "Görev",
  note: "Not",
  project: "Proje",
  file: "Dosya",
  list: "Liste",
  notebook: "Defter",
  section: "Bölüm",
};

export const dataKey = (wsId: string) => ["data", wsId] as const;
export const trashKey = (wsId: string) => ["trash", wsId] as const;

const noop = () => () => {};

export function useWorkspaceData() {
  const ws = useWorkspace();
  const q = useQuery({
    queryKey: dataKey(ws.id),
    queryFn: () => unwrap(api.getWorkspaceData()) as Promise<Data>,
  });
  // Sunucu HTML'i (iskelet) ile ilk istemci render'ı aynı olsun: hydration bitene kadar "yükleniyor"
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? q : { ...q, data: undefined, isLoading: true as const };
}

/** Kaydediliyor / Kaydedildi göstergesi için bekleyen yazma sayısı. */
export function usePendingWrites() {
  const ws = useWorkspace();
  return useIsMutating({ mutationKey: ["data-mut", ws.id] });
}

const byPos = <T extends { position: string }>(a: T, b: T) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0;

/**
 * Bir projenin panosundaki listeler: projeye özel liste varsa onlar, yoksa ortak listeler.
 * (projectId boşsa ortak listeler.)
 */
export function listsFor(d: Pick<Data, "lists">, projectId: string | null | undefined): List[] {
  if (projectId) {
    const own = d.lists.filter((l) => l.projectId === projectId);
    if (own.length) return own;
  }
  return d.lists.filter((l) => !l.projectId);
}
export const firstListFor = (d: Pick<Data, "lists">, projectId: string | null | undefined) => listsFor(d, projectId)[0];
export const doneListFor = (d: Pick<Data, "lists">, projectId: string | null | undefined) => listsFor(d, projectId).find((l) => l.isDone);

type Patch<T> = Partial<Omit<T, "id" | "workspaceId">>;
const merge = <T extends { id: string }>(arr: T[], id: string, p: object): T[] =>
  arr.map((x) => (x.id === id ? ({ ...x, ...p } as T) : x));

export function useDataActions() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const key = dataKey(ws.id);

  type Op = { run: () => Promise<unknown>; apply: (d: Data) => Data; after?: () => void };
  const m = useMutation({
    mutationKey: ["data-mut", ws.id],
    mutationFn: (op: Op) => op.run(),
    onMutate: async (op) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Data>(key);
      if (prev) qc.setQueryData<Data>(key, op.apply(prev));
      return { prev };
    },
    onError: (e, _op, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(e instanceof Error ? e.message : "İşlem başarısız.");
    },
    onSuccess: (_d, op) => op.after?.(),
    onSettled: () => {
      // başka yazma sürüyorsa yenileme yapma (yarış → titreme)
      if (qc.isMutating({ mutationKey: ["data-mut", ws.id] }) <= 1) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });
  const opt = (run: () => Promise<unknown>, apply: (d: Data) => Data, after?: () => void) =>
    m.mutate({ run, apply, after });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: trashKey(ws.id) });
  };

  /* ------------------------- yardımcılar ------------------------- */
  /** Bir listenin sonuna eklemek için konum. */
  const endPosition = (d: Data, listId: string, excludeId?: string) => {
    const last = d.tasks
      .filter((t) => t.listId === listId && t.id !== excludeId)
      .sort(byPos)
      .at(-1);
    return generateKeyBetween(last?.position ?? null, null);
  };

  /* --------------------------- listeler --------------------------- */
  const addList = (v: { id: string; title: string; position: string; projectId?: string | null }) =>
    opt(
      () => unwrap(api.createList(v)),
      (d) => ({
        ...d,
        lists: [
          ...d.lists,
          { id: v.id, workspaceId: ws.id, title: v.title, position: v.position, projectId: v.projectId ?? null, isDone: false, createdAt: new Date(), deletedAt: null },
        ].sort(byPos),
      }),
    );
  /** Tamamlanan sütun işareti: kapsamda tek; listedeki görevlerin durumu da uyar. */
  const setListDone = (id: string, isDone: boolean) =>
    opt(
      () => unwrap(api.setListDone({ id, isDone })),
      (d) => {
        const target = d.lists.find((l) => l.id === id);
        if (!target) return d;
        return {
          ...d,
          lists: d.lists.map((l) =>
            l.id === id ? { ...l, isDone } : isDone && (l.projectId ?? null) === (target.projectId ?? null) ? { ...l, isDone: false } : l,
          ),
          tasks: d.tasks.map((t) => (t.listId === id ? { ...t, isCompleted: isDone } : t)),
        };
      },
    );
  const renameList = (id: string, title: string) =>
    opt(() => unwrap(api.renameList({ id, title })), (d) => ({ ...d, lists: merge(d.lists, id, { title }) }));

  /* --------------------------- görevler --------------------------- */
  const addTask = (v: { id: string; title: string; listId: string; projectId?: string | null; noteId?: string | null; position: string }) =>
    opt(
      () => unwrap(api.createTask(v)),
      (d) => ({
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
            projectId: d.lists.find((l) => l.id === v.listId)?.projectId ?? v.projectId ?? null,
            title: v.title,
            description: "",
            dueDate: null,
            priority: null,
            tags: [],
            personIds: [],
            isCompleted: !!d.lists.find((l) => l.id === v.listId)?.isDone,
            position: v.position,
            createdAt: new Date(),
            archivedAt: null,
            deletedAt: null,
          } satisfies Task,
        ].sort(byPos),
      }),
    );

  const patchTask = (
    id: string,
    p: Partial<Pick<Task, "title" | "description" | "dueDate" | "priority" | "tags" | "personIds" | "assigneeId" | "projectId" | "isCompleted">>,
  ) => opt(() => unwrap(api.updateTask({ id, ...p })), (d) => ({ ...d, tasks: merge(d.tasks, id, p) }));

  /** Dönüşü beklenen kişi ekle (aynı isim varsa var olanı döndürür). */
  const addPerson = (name: string, data: Data): string => {
    const n = name.trim();
    const hit = data.people.find((p) => p.name.toLocaleLowerCase("tr") === n.toLocaleLowerCase("tr"));
    if (hit) return hit.id;
    const id = crypto.randomUUID();
    opt(
      () => unwrap(api.createPerson({ id, name: n })),
      (d) => ({ ...d, people: [...d.people, { id, name: n }].sort((a, b) => a.name.localeCompare(b.name, "tr")) }),
    );
    return id;
  };
  const removePerson = (id: string) =>
    opt(
      () => unwrap(api.deletePerson({ id })),
      (d) => ({
        ...d,
        people: d.people.filter((p) => p.id !== id),
        tasks: d.tasks.map((t) => (t.personIds.includes(id) ? { ...t, personIds: t.personIds.filter((x) => x !== id) } : t)),
      }),
    );

  const moveTask = (id: string, listId: string, position: string) =>
    opt(
      () => unwrap(api.moveTask({ id, listId, position })),
      (d) => {
        const target = d.lists.find((l) => l.id === listId);
        const cur = d.tasks.find((t) => t.id === id);
        const source = cur?.listId ? d.lists.find((l) => l.id === cur.listId) : undefined;
        const isCompleted = target?.isDone ? true : source?.isDone ? false : (cur?.isCompleted ?? false);
        return {
          ...d,
          tasks: merge(d.tasks, id, { listId, position, isCompleted, ...(target?.projectId ? { projectId: target.projectId } : {}) }).sort(byPos),
        };
      },
    );

  /**
   * Tamamla: panoda tamamlanan sütun varsa oraya taşır; yoksa yalnızca tamamlandı işaretler.
   * Geri al: tamamlanan sütundaysa ilk sütuna döndürür; değilse yalnızca işareti kaldırır.
   */
  const setDone = (d: Data, t: Task, done: boolean) => {
    const scope = listsFor(d, t.projectId);
    const doneList = scope.find((l) => l.isDone);
    if (done) {
      if (doneList && t.listId !== doneList.id) moveTask(t.id, doneList.id, endPosition(d, doneList.id, t.id));
      else patchTask(t.id, { isCompleted: true });
    } else {
      const inDone = doneList && t.listId === doneList.id;
      const back = scope.find((l) => !l.isDone);
      if (inDone && back) moveTask(t.id, back.id, endPosition(d, back.id, t.id));
      else patchTask(t.id, { isCompleted: false });
    }
  };

  /* ---------------------------- notlar ---------------------------- */
  const addNote = (n: Note) =>
    opt(
      () =>
        unwrap(
          api.createNote({
            id: n.id,
            type: n.type,
            title: n.title,
            content: n.content,
            meetingDate: n.meetingDate,
            projectId: n.projectId,
            sectionId: n.sectionId,
          }),
        ),
      (d) => ({ ...d, notes: [n, ...d.notes] }),
    );

  const patchNote = (id: string, p: Patch<Note> & { actions?: NoteAction[] }) =>
    opt(
      () =>
        unwrap(
          api.updateNote({
            id,
            type: p.type,
            title: p.title,
            content: p.content,
            meetingDate: p.meetingDate,
            participants: p.participants,
            tags: p.tags,
            actions: p.actions,
            projectId: p.projectId,
            sectionId: p.sectionId,
          }),
        ),
      (d) => ({
        ...d,
        notes: merge(d.notes, id, { ...p, updatedAt: new Date() }).sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        ),
      }),
    );

  /* ---------------- projeler / defterler / bölümler ---------------- */
  const addProject = (id: string, name: string) =>
    opt(
      () => unwrap(api.createProject({ id, name })),
      (d) => ({
        ...d,
        projects: [...d.projects, { id, workspaceId: ws.id, name, description: "", createdAt: new Date(), archivedAt: null, deletedAt: null }].sort(
          (a, b) => a.name.localeCompare(b.name, "tr"),
        ),
        lists: [
          ...d.lists,
          ...(["Yapılacak", "Sürüyor", "Bitti"] as const).map((title, i, arr) => ({
            id: `${id}-d${i}`,
            workspaceId: ws.id,
            title,
            position: generateNKeysBetween(null, null, arr.length)[i],
            projectId: id,
            isDone: i === arr.length - 1,
            createdAt: new Date(),
            deletedAt: null,
          })),
        ].sort(byPos),
      }),
    );
  const patchProject = (id: string, p: { name?: string; description?: string }) =>
    opt(() => unwrap(api.updateProject({ id, ...p })), (d) => ({ ...d, projects: merge(d.projects, id, p) }));

  const addNotebook = (v: { id: string; name: string; color: string; position: string }) =>
    opt(
      () => unwrap(api.createNotebook(v)),
      (d) => ({ ...d, notebooks: [...d.notebooks, { ...v, workspaceId: ws.id, createdAt: new Date(), deletedAt: null }].sort(byPos) }),
    );
  const patchNotebook = (id: string, p: { name?: string; color?: string }) =>
    opt(() => unwrap(api.updateNotebook({ id, ...p })), (d) => ({ ...d, notebooks: merge(d.notebooks, id, p) }));
  const addSection = (v: { id: string; notebookId: string; name: string; color: string; position: string }) =>
    opt(
      () => unwrap(api.createSection(v)),
      (d) => ({ ...d, sections: [...d.sections, { ...v, workspaceId: ws.id, createdAt: new Date(), deletedAt: null }].sort(byPos) }),
    );
  const patchSection = (id: string, p: { name?: string; color?: string }) =>
    opt(() => unwrap(api.updateSection({ id, ...p })), (d) => ({ ...d, sections: merge(d.sections, id, p) }));

  /* ---------------------------- dosyalar ---------------------------- */
  const patchFile = (id: string, projectId: string | null) =>
    opt(() => unwrap(api.updateFile({ id, projectId })), (d) => ({ ...d, files: merge(d.files, id, { projectId }) }));

  const addFileLocal = (f: FileRow) =>
    qc.setQueryData<Data>(key, (d) => (d ? { ...d, files: [{ ...f, createdAt: new Date(f.createdAt) }, ...d.files] } : d));

  /* --------------------- arşiv / çöp / geri al --------------------- */
  const restore = async (kind: Kind, id: string) => {
    await unwrap(api.setState({ kind, id, state: "restore" }));
    refreshAll();
  };
  const unarchive = (kind: Kind, id: string) =>
    opt(
      () => unwrap(api.setState({ kind, id, state: "unarchive" })),
      (d) => ({ ...d, [COLL[kind]]: merge(d[COLL[kind]] as { id: string }[], id, { archivedAt: null }) }),
    );

  const archive = (kind: Kind, id: string) =>
    opt(
      () => unwrap(api.setState({ kind, id, state: "archive" })),
      (d) => ({ ...d, [COLL[kind]]: merge(d[COLL[kind]] as { id: string }[], id, { archivedAt: new Date() }) }),
      () => toast(`${LABEL[kind]} arşivlendi`, { duration: 5000, action: { label: "Geri al", onClick: () => unarchive(kind, id) } }),
    );

  const trash = (kind: Kind, id: string) =>
    opt(
      () => unwrap(api.setState({ kind, id, state: "trash" })),
      (d) => ({ ...d, [COLL[kind]]: (d[COLL[kind]] as { id: string }[]).filter((x) => x.id !== id) }),
      () =>
        toast(`${LABEL[kind]} çöpe taşındı`, {
          duration: 5000,
          action: { label: "Geri al", onClick: () => restore(kind, id).catch((e) => toast.error(e instanceof Error ? e.message : "Geri alınamadı.")) },
        }),
    );

  return {
    endPosition,
    addList,
    renameList,
    setListDone,
    addTask,
    patchTask,
    addPerson,
    removePerson,
    moveTask,
    setDone,
    addNote,
    patchNote,
    addProject,
    patchProject,
    addNotebook,
    patchNotebook,
    addSection,
    patchSection,
    patchFile,
    addFileLocal,
    archive,
    unarchive,
    trash,
    restore,
    refreshAll,
  };
}
