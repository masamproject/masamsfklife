"use server";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";
import { db } from "@/db";
import { lists, notes, tasks, user, workspaceMembers, workspaces } from "@/db/schema";
import { workspaceAction } from "@/lib/actions/safe-action";
import { PLAN_LIMITS } from "@/lib/plan";


const id = z.string().min(1).max(64);
const position = z.string().min(1).max(64);

/* ------------------------------ okuma ------------------------------ */
export const getWorkspaceData = workspaceAction(z.void(), async (_, ctx) => {
  const [l, t, m] = await Promise.all([
    db
      .select()
      .from(lists)
      .where(and(eq(lists.workspaceId, ctx.workspaceId), isNull(lists.deletedAt)))
      .orderBy(asc(lists.position)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.workspaceId, ctx.workspaceId), isNull(tasks.deletedAt)))
      .orderBy(asc(tasks.position)),
    db
      .select({ id: user.id, name: user.name, email: user.email, image: user.image })
      .from(workspaceMembers)
      .innerJoin(user, eq(user.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, ctx.workspaceId)),
  ]);
  return { lists: l, tasks: t, members: m };
});

/* ----------------------------- yardımcılar ------------------------- */
async function assertList(workspaceId: string, listId: string) {
  const [row] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.workspaceId, workspaceId), isNull(lists.deletedAt)))
    .limit(1);
  if (!row) throw new Error("Liste bulunamadı.");
}

async function assertMember(workspaceId: string, userId: string) {
  const [row] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Kullanıcı bu çalışma alanının üyesi değil.");
}

/* ------------------------------ listeler --------------------------- */
export const createList = workspaceAction(
  z.object({ id, title: z.string().trim().min(1).max(100), position }),
  async (d, ctx) => {
    const [ws] = await db
      .select({ plan: workspaces.plan })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
      .limit(1);
    if (ws?.plan !== "pro") {
      const existing = await db
        .select({ id: lists.id })
        .from(lists)
        .where(and(eq(lists.workspaceId, ctx.workspaceId), isNull(lists.deletedAt)));
      if (existing.length >= PLAN_LIMITS.free.lists) {
        throw new Error(`Free planda en fazla ${PLAN_LIMITS.free.lists} liste olabilir. Pro'ya geç.`);
      }
    }
    await db.insert(lists).values({
      id: d.id,
      workspaceId: ctx.workspaceId,
      title: d.title,
      position: d.position,
    });
  },
);

export const renameList = workspaceAction(
  z.object({ id, title: z.string().trim().min(1).max(100) }),
  async (d, ctx) => {
    await db
      .update(lists)
      .set({ title: d.title })
      .where(and(eq(lists.id, d.id), eq(lists.workspaceId, ctx.workspaceId)));
  },
);

export const moveList = workspaceAction(z.object({ id, position }), async (d, ctx) => {
  await db
    .update(lists)
    .set({ position: d.position })
    .where(and(eq(lists.id, d.id), eq(lists.workspaceId, ctx.workspaceId)));
});

/** Yalnızca boş listeler silinebilir (soft delete). */
export const deleteList = workspaceAction(z.object({ id }), async (d, ctx) => {
  const [t] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(eq(tasks.listId, d.id), eq(tasks.workspaceId, ctx.workspaceId), isNull(tasks.deletedAt)),
    )
    .limit(1);
  if (t) throw new Error("Yalnızca boş listeler silinebilir.");
  await db
    .update(lists)
    .set({ deletedAt: new Date() })
    .where(and(eq(lists.id, d.id), eq(lists.workspaceId, ctx.workspaceId)));
});

/* ------------------------------ görevler --------------------------- */
const priority = z.enum(["low", "medium", "high"]);

export const createTask = workspaceAction(
  z.object({
    id,
    title: z.string().trim().min(1).max(500),
    listId: id.nullable(),
    noteId: id.nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    position: position.optional(),
  }),
  async (d, ctx) => {
    if (d.listId) await assertList(ctx.workspaceId, d.listId);
    if (d.noteId) {
      const [n] = await db
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.id, d.noteId), eq(notes.workspaceId, ctx.workspaceId)))
        .limit(1);
      if (!n) throw new Error("Not bulunamadı.");
    }
    let pos = d.position;
    if (!pos) {
      const [last] = await db
        .select({ position: tasks.position })
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, ctx.workspaceId),
            d.listId ? eq(tasks.listId, d.listId) : isNull(tasks.listId),
            isNull(tasks.deletedAt),
          ),
        )
        .orderBy(desc(tasks.position))
        .limit(1);
      pos = generateKeyBetween(last?.position ?? null, null);
    }
    await db.insert(tasks).values({
      id: d.id,
      workspaceId: ctx.workspaceId,
      creatorId: ctx.userId,
      listId: d.listId,
      noteId: d.noteId ?? null,
      title: d.title,
      dueDate: d.dueDate ?? null,
      position: pos,
    });
  },
);

export const updateTask = workspaceAction(
  z.object({
    id,
    title: z.string().trim().min(1).max(500).optional(),
    description: z.string().max(20000).optional(),
    dueDate: z.coerce.date().nullable().optional(),
    priority: priority.optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
    assigneeId: id.nullable().optional(),
    isCompleted: z.boolean().optional(),
  }),
  async ({ id: taskId, ...patch }, ctx) => {
    if (patch.assigneeId) await assertMember(ctx.workspaceId, patch.assigneeId);
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) return;
    await db
      .update(tasks)
      .set(clean)
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, ctx.workspaceId)));
  },
);

export const moveTask = workspaceAction(
  z.object({ id, listId: id, position }),
  async (d, ctx) => {
    await assertList(ctx.workspaceId, d.listId);
    await db
      .update(tasks)
      .set({ listId: d.listId, position: d.position })
      .where(and(eq(tasks.id, d.id), eq(tasks.workspaceId, ctx.workspaceId)));
  },
);

export const deleteTask = workspaceAction(z.object({ id }), async (d, ctx) => {
  await db
    .update(tasks)
    .set({ deletedAt: new Date() })
    .where(and(eq(tasks.id, d.id), eq(tasks.workspaceId, ctx.workspaceId)));
});

export const deleteTasks = workspaceAction(z.object({ ids: z.array(id).min(1).max(200) }), async (d, ctx) => {
  await db
    .update(tasks)
    .set({ deletedAt: new Date() })
    .where(and(inArray(tasks.id, d.ids), eq(tasks.workspaceId, ctx.workspaceId)));
});
