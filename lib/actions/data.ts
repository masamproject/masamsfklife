"use server";

import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { generateNKeysBetween } from "fractional-indexing";
import { z } from "zod";
import { db } from "@/db";
import {
  files,
  lists,
  notebooks,
  notes,
  projects,
  sections,
  tasks,
  user,
  workspaceMembers,
} from "@/db/schema";
import { ActionError, workspaceAction } from "@/lib/actions/safe-action";
import { deleteBlob } from "@/lib/blobs";
import { PLAN_LIMITS } from "@/lib/plan";
import { effectivePlan } from "@/lib/plan-server";

const id = z.string().min(1).max(64);
const position = z.string().min(1).max(64);
const name = z.string().trim().min(1).max(200);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const DEFAULT_LISTS = ["Yapılacak", "Sürüyor", "Bitti"];

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */
async function ensureDefaultLists(workspaceId: string) {
  const [live] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.workspaceId, workspaceId), isNull(lists.deletedAt)))
    .limit(1);
  if (live) return;
  const keys = generateNKeysBetween(null, null, DEFAULT_LISTS.length);
  // Sabit id + upsert: eşzamanlı çağrılar ve silinmiş varsayılanlar için idempotent
  await db
    .insert(lists)
    .values(
      DEFAULT_LISTS.map((title, i) => ({
        id: `${workspaceId}-d${i}`,
        workspaceId,
        title,
        position: keys[i],
      })),
    )
    .onConflictDoUpdate({ target: lists.id, set: { deletedAt: null } });
}

/** Son liste = "Bitti" sütunu; oraya giren görev tamamlanmış sayılır. */
async function lastListId(workspaceId: string) {
  const [row] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.workspaceId, workspaceId), isNull(lists.deletedAt)))
    .orderBy(desc(lists.position))
    .limit(1);
  return row?.id ?? null;
}

async function assertList(workspaceId: string, listId: string) {
  const [row] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.workspaceId, workspaceId), isNull(lists.deletedAt)))
    .limit(1);
  if (!row) throw new ActionError("Liste bulunamadı.");
}

async function assertProject(workspaceId: string, projectId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new ActionError("Proje bulunamadı.");
}

async function assertSection(workspaceId: string, sectionId: string) {
  const [row] = await db
    .select({ id: sections.id })
    .from(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new ActionError("Bölüm bulunamadı.");
}

async function assertMember(workspaceId: string, userId: string) {
  const [row] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!row) throw new ActionError("Kullanıcı bu çalışma alanının üyesi değil.");
}

/* ------------------------------------------------------------------ */
/* Okuma                                                               */
/* ------------------------------------------------------------------ */
export const getWorkspaceData = workspaceAction(z.void(), async (_, ctx) => {
  const w = ctx.workspaceId;
  await ensureDefaultLists(w);
  const [l, t, n, p, nb, sec, f, m] = await Promise.all([
    db.select().from(lists).where(and(eq(lists.workspaceId, w), isNull(lists.deletedAt))).orderBy(asc(lists.position)),
    db.select().from(tasks).where(and(eq(tasks.workspaceId, w), isNull(tasks.deletedAt))).orderBy(asc(tasks.position)),
    db.select().from(notes).where(and(eq(notes.workspaceId, w), isNull(notes.deletedAt))).orderBy(desc(notes.updatedAt)).limit(1000),
    db.select().from(projects).where(and(eq(projects.workspaceId, w), isNull(projects.deletedAt))).orderBy(asc(projects.name)),
    db.select().from(notebooks).where(and(eq(notebooks.workspaceId, w), isNull(notebooks.deletedAt))).orderBy(asc(notebooks.position)),
    db.select().from(sections).where(and(eq(sections.workspaceId, w), isNull(sections.deletedAt))).orderBy(asc(sections.position)),
    db.select().from(files).where(and(eq(files.workspaceId, w), isNull(files.deletedAt))).orderBy(desc(files.createdAt)),
    db
      .select({ id: user.id, name: user.name, email: user.email, image: user.image })
      .from(workspaceMembers)
      .innerJoin(user, eq(user.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, w)),
  ]);
  return { lists: l, tasks: t, notes: n, projects: p, notebooks: nb, sections: sec, files: f, members: m };
});

export const getTrash = workspaceAction(z.void(), async (_, ctx) => {
  const w = ctx.workspaceId;
  const [t, n, p, f, nb, sec, l] = await Promise.all([
    db.select({ id: tasks.id, title: tasks.title, deletedAt: tasks.deletedAt }).from(tasks).where(and(eq(tasks.workspaceId, w), isNotNull(tasks.deletedAt))).orderBy(desc(tasks.deletedAt)),
    db.select({ id: notes.id, title: notes.title, deletedAt: notes.deletedAt }).from(notes).where(and(eq(notes.workspaceId, w), isNotNull(notes.deletedAt))).orderBy(desc(notes.deletedAt)),
    db.select({ id: projects.id, title: projects.name, deletedAt: projects.deletedAt }).from(projects).where(and(eq(projects.workspaceId, w), isNotNull(projects.deletedAt))).orderBy(desc(projects.deletedAt)),
    db.select({ id: files.id, title: files.name, deletedAt: files.deletedAt }).from(files).where(and(eq(files.workspaceId, w), isNotNull(files.deletedAt))).orderBy(desc(files.deletedAt)),
    db.select({ id: notebooks.id, title: notebooks.name, deletedAt: notebooks.deletedAt }).from(notebooks).where(and(eq(notebooks.workspaceId, w), isNotNull(notebooks.deletedAt))).orderBy(desc(notebooks.deletedAt)),
    db.select({ id: sections.id, title: sections.name, deletedAt: sections.deletedAt }).from(sections).where(and(eq(sections.workspaceId, w), isNotNull(sections.deletedAt))).orderBy(desc(sections.deletedAt)),
    db.select({ id: lists.id, title: lists.title, deletedAt: lists.deletedAt }).from(lists).where(and(eq(lists.workspaceId, w), isNotNull(lists.deletedAt))).orderBy(desc(lists.deletedAt)),
  ]);
  return { tasks: t, notes: n, projects: p, files: f, notebooks: nb, sections: sec, lists: l };
});

/* ------------------------------------------------------------------ */
/* Listeler (kanban sütunları)                                         */
/* ------------------------------------------------------------------ */
export const createList = workspaceAction(z.object({ id, title: name, position }), async (d, ctx) => {
  if ((await effectivePlan(ctx.workspaceId)) !== "pro") {
    const live = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.workspaceId, ctx.workspaceId), isNull(lists.deletedAt)));
    if (live.length >= PLAN_LIMITS.free.lists) {
      throw new ActionError(`Free planda en fazla ${PLAN_LIMITS.free.lists} liste olabilir. Pro'ya geç.`);
    }
  }
  await db.insert(lists).values({ id: d.id, workspaceId: ctx.workspaceId, title: d.title, position: d.position });
});

export const renameList = workspaceAction(z.object({ id, title: name }), async (d, ctx) => {
  await db.update(lists).set({ title: d.title }).where(and(eq(lists.id, d.id), eq(lists.workspaceId, ctx.workspaceId)));
});

/* ------------------------------------------------------------------ */
/* Görevler                                                            */
/* ------------------------------------------------------------------ */
const priority = z.enum(["low", "medium", "high"]);

export const createTask = workspaceAction(
  z.object({
    id,
    title: z.string().trim().min(1).max(500),
    listId: id,
    projectId: id.nullable().optional(),
    noteId: id.nullable().optional(),
    position,
  }),
  async (d, ctx) => {
    await assertList(ctx.workspaceId, d.listId);
    if (d.projectId) await assertProject(ctx.workspaceId, d.projectId);
    if (d.noteId) {
      const [n] = await db.select({ id: notes.id }).from(notes).where(and(eq(notes.id, d.noteId), eq(notes.workspaceId, ctx.workspaceId))).limit(1);
      if (!n) throw new ActionError("Not bulunamadı.");
    }
    await db.insert(tasks).values({
      id: d.id,
      workspaceId: ctx.workspaceId,
      creatorId: ctx.userId,
      listId: d.listId,
      projectId: d.projectId ?? null,
      noteId: d.noteId ?? null,
      title: d.title,
      position: d.position,
      isCompleted: d.listId === (await lastListId(ctx.workspaceId)),
    });
  },
);

export const updateTask = workspaceAction(
  z.object({
    id,
    title: z.string().trim().min(1).max(500).optional(),
    description: z.string().max(20000).optional(),
    dueDate: z.coerce.date().nullable().optional(),
    priority: priority.nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
    assigneeId: id.nullable().optional(),
    projectId: id.nullable().optional(),
  }),
  async ({ id: taskId, ...patch }, ctx) => {
    if (patch.assigneeId) await assertMember(ctx.workspaceId, patch.assigneeId);
    if (patch.projectId) await assertProject(ctx.workspaceId, patch.projectId);
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (!Object.keys(clean).length) return;
    await db.update(tasks).set(clean).where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, ctx.workspaceId)));
  },
);

/** Taşı (sürükle, liste menüsü, tamamla). Son listeye giren görev tamamlanmış olur. */
export const moveTask = workspaceAction(z.object({ id, listId: id, position }), async (d, ctx) => {
  await assertList(ctx.workspaceId, d.listId);
  await db
    .update(tasks)
    .set({ listId: d.listId, position: d.position, isCompleted: d.listId === (await lastListId(ctx.workspaceId)) })
    .where(and(eq(tasks.id, d.id), eq(tasks.workspaceId, ctx.workspaceId)));
});

/* ------------------------------------------------------------------ */
/* Notlar                                                              */
/* ------------------------------------------------------------------ */
const noteAction = z.object({ id, text: z.string().max(500), taskId: z.string().max(64) });

export const createNote = workspaceAction(
  z.object({
    id,
    type: z.enum(["free", "meeting"]),
    title: z.string().max(300).default(""),
    content: z.string().max(200000).default(""),
    meetingDate: z.coerce.date().nullable().optional(),
    projectId: id.nullable().optional(),
    sectionId: id.nullable().optional(),
  }),
  async (d, ctx) => {
    if (d.projectId) await assertProject(ctx.workspaceId, d.projectId);
    if (d.sectionId) await assertSection(ctx.workspaceId, d.sectionId);
    await db.insert(notes).values({
      id: d.id,
      workspaceId: ctx.workspaceId,
      authorId: ctx.userId,
      type: d.type,
      title: d.title,
      content: d.content,
      meetingDate: d.meetingDate ?? null,
      projectId: d.projectId ?? null,
      sectionId: d.sectionId ?? null,
    });
  },
);

export const updateNote = workspaceAction(
  z.object({
    id,
    type: z.enum(["free", "meeting"]).optional(),
    title: z.string().max(300).optional(),
    content: z.string().max(200000).optional(),
    meetingDate: z.coerce.date().nullable().optional(),
    participants: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
    actions: z.array(noteAction).max(200).optional(),
    projectId: id.nullable().optional(),
    sectionId: id.nullable().optional(),
  }),
  async ({ id: noteId, ...patch }, ctx) => {
    if (patch.projectId) await assertProject(ctx.workspaceId, patch.projectId);
    if (patch.sectionId) await assertSection(ctx.workspaceId, patch.sectionId);
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await db
      .update(notes)
      .set({ ...clean, updatedAt: new Date() })
      .where(and(eq(notes.id, noteId), eq(notes.workspaceId, ctx.workspaceId)));
  },
);

/* ------------------------------------------------------------------ */
/* Projeler, defterler, bölümler                                       */
/* ------------------------------------------------------------------ */
export const createProject = workspaceAction(z.object({ id, name }), async (d, ctx) => {
  await db.insert(projects).values({ id: d.id, workspaceId: ctx.workspaceId, name: d.name });
});

export const updateProject = workspaceAction(
  z.object({ id, name: name.optional(), description: z.string().max(20000).optional() }),
  async ({ id: pid, ...patch }, ctx) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (!Object.keys(clean).length) return;
    await db.update(projects).set(clean).where(and(eq(projects.id, pid), eq(projects.workspaceId, ctx.workspaceId)));
  },
);

export const createNotebook = workspaceAction(z.object({ id, name, color, position }), async (d, ctx) => {
  await db.insert(notebooks).values({ ...d, workspaceId: ctx.workspaceId });
});

export const updateNotebook = workspaceAction(
  z.object({ id, name: name.optional(), color: color.optional() }),
  async ({ id: nid, ...patch }, ctx) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (!Object.keys(clean).length) return;
    await db.update(notebooks).set(clean).where(and(eq(notebooks.id, nid), eq(notebooks.workspaceId, ctx.workspaceId)));
  },
);

export const createSection = workspaceAction(
  z.object({ id, notebookId: id, name, color, position }),
  async (d, ctx) => {
    const [nb] = await db.select({ id: notebooks.id }).from(notebooks).where(and(eq(notebooks.id, d.notebookId), eq(notebooks.workspaceId, ctx.workspaceId))).limit(1);
    if (!nb) throw new ActionError("Defter bulunamadı.");
    await db.insert(sections).values({ ...d, workspaceId: ctx.workspaceId });
  },
);

export const updateSection = workspaceAction(
  z.object({ id, name: name.optional(), color: color.optional() }),
  async ({ id: sid, ...patch }, ctx) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (!Object.keys(clean).length) return;
    await db.update(sections).set(clean).where(and(eq(sections.id, sid), eq(sections.workspaceId, ctx.workspaceId)));
  },
);

export const updateFile = workspaceAction(z.object({ id, projectId: id.nullable() }), async (d, ctx) => {
  if (d.projectId) await assertProject(ctx.workspaceId, d.projectId);
  await db.update(files).set({ projectId: d.projectId }).where(and(eq(files.id, d.id), eq(files.workspaceId, ctx.workspaceId)));
});

/* ------------------------------------------------------------------ */
/* Arşiv / çöp / geri al / kalıcı sil                                  */
/* ------------------------------------------------------------------ */
const kind = z.enum(["task", "note", "project", "file", "list", "notebook", "section"]);
type Kind = z.infer<typeof kind>;
const TABLES = { task: tasks, note: notes, project: projects, file: files, list: lists, notebook: notebooks, section: sections } as const;
const ARCHIVABLE: Kind[] = ["task", "note", "project", "file"];

export const setState = workspaceAction(
  z.object({ kind, id, state: z.enum(["archive", "unarchive", "trash", "restore"]) }),
  async (d, ctx) => {
    const table = TABLES[d.kind] as typeof tasks; // ortak kolonlar: id, workspaceId, deletedAt (+archivedAt)
    const where = and(eq(table.id, d.id), eq(table.workspaceId, ctx.workspaceId));

    if (d.state === "archive" || d.state === "unarchive") {
      if (!ARCHIVABLE.includes(d.kind)) throw new ActionError("Bu öğe arşivlenemez.");
      await db.update(table).set({ archivedAt: d.state === "archive" ? new Date() : null }).where(where);
      return;
    }
    if (d.state === "trash") {
      if (d.kind === "list") {
        const [t] = await db
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.listId, d.id), eq(tasks.workspaceId, ctx.workspaceId), isNull(tasks.deletedAt)))
          .limit(1);
        if (t) throw new ActionError("Yalnızca boş listeler silinebilir.");
      }
      await db.update(table).set({ deletedAt: new Date() }).where(where);
      return;
    }
    // restore
    if (d.kind === "list") {
      if ((await effectivePlan(ctx.workspaceId)) !== "pro") {
        const live = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.workspaceId, ctx.workspaceId), isNull(lists.deletedAt)));
        if (live.length >= PLAN_LIMITS.free.lists) {
          throw new ActionError(`Free planda en fazla ${PLAN_LIMITS.free.lists} liste olabilir.`);
        }
      }
    }
    await db.update(table).set({ deletedAt: null }).where(where);
  },
);

async function purgeOne(k: Kind, itemId: string, workspaceId: string) {
  const table = TABLES[k] as typeof tasks;
  const where = and(eq(table.id, itemId), eq(table.workspaceId, workspaceId), isNotNull(table.deletedAt));
  if (k === "file") {
    const [f] = await db.select({ blobKey: files.blobKey }).from(files).where(and(eq(files.id, itemId), eq(files.workspaceId, workspaceId), isNotNull(files.deletedAt))).limit(1);
    if (f) await deleteBlob(f.blobKey);
  }
  await db.delete(table).where(where);
}

/** Kalıcı silme: yalnızca çöpteki kayıtlar, owner/admin. */
export const purgeItem = workspaceAction(z.object({ kind, id }), async (d, ctx) => purgeOne(d.kind, d.id, ctx.workspaceId), { minRole: "admin" });

export const emptyTrash = workspaceAction(
  z.void(),
  async (_, ctx) => {
    const w = ctx.workspaceId;
    const dead = (rows: Promise<{ id: string }[]>) => rows;
    const order: [Kind, Promise<{ id: string }[]>][] = [
      ["file", dead(db.select({ id: files.id }).from(files).where(and(eq(files.workspaceId, w), isNotNull(files.deletedAt))))],
      ["task", dead(db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.workspaceId, w), isNotNull(tasks.deletedAt))))],
      ["note", dead(db.select({ id: notes.id }).from(notes).where(and(eq(notes.workspaceId, w), isNotNull(notes.deletedAt))))],
      ["project", dead(db.select({ id: projects.id }).from(projects).where(and(eq(projects.workspaceId, w), isNotNull(projects.deletedAt))))],
      ["section", dead(db.select({ id: sections.id }).from(sections).where(and(eq(sections.workspaceId, w), isNotNull(sections.deletedAt))))],
      ["notebook", dead(db.select({ id: notebooks.id }).from(notebooks).where(and(eq(notebooks.workspaceId, w), isNotNull(notebooks.deletedAt))))],
      ["list", dead(db.select({ id: lists.id }).from(lists).where(and(eq(lists.workspaceId, w), isNotNull(lists.deletedAt))))],
    ];
    for (const [k, rows] of order) for (const r of await rows) await purgeOne(k, r.id, w);
  },
  { minRole: "admin" },
);

