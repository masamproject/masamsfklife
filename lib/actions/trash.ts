"use server";

import { and, desc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lists, notes, tasks } from "@/db/schema";
import { workspaceAction } from "@/lib/actions/safe-action";

const kind = z.enum(["list", "task", "note"]);
const id = z.string().min(1).max(64);

export const getTrash = workspaceAction(z.void(), async (_, ctx) => {
  const [l, t, n] = await Promise.all([
    db
      .select({ id: lists.id, title: lists.title, deletedAt: lists.deletedAt })
      .from(lists)
      .where(and(eq(lists.workspaceId, ctx.workspaceId), isNotNull(lists.deletedAt)))
      .orderBy(desc(lists.deletedAt)),
    db
      .select({ id: tasks.id, title: tasks.title, deletedAt: tasks.deletedAt })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, ctx.workspaceId), isNotNull(tasks.deletedAt)))
      .orderBy(desc(tasks.deletedAt)),
    db
      .select({ id: notes.id, title: notes.title, deletedAt: notes.deletedAt })
      .from(notes)
      .where(and(eq(notes.workspaceId, ctx.workspaceId), isNotNull(notes.deletedAt)))
      .orderBy(desc(notes.deletedAt)),
  ]);
  return { lists: l, tasks: t, notes: n };
});

export const restoreItem = workspaceAction(z.object({ kind, id }), async (d, ctx) => {
  if (d.kind === "list") {
    await db
      .update(lists)
      .set({ deletedAt: null })
      .where(and(eq(lists.id, d.id), eq(lists.workspaceId, ctx.workspaceId)));
  } else if (d.kind === "task") {
    await db
      .update(tasks)
      .set({ deletedAt: null })
      .where(and(eq(tasks.id, d.id), eq(tasks.workspaceId, ctx.workspaceId)));
  } else {
    await db
      .update(notes)
      .set({ deletedAt: null })
      .where(and(eq(notes.id, d.id), eq(notes.workspaceId, ctx.workspaceId)));
  }
});

/** Kalıcı silme: yalnızca çöp kutusundaki (deletedAt dolu) kayıtlar; owner/admin. */
export const purgeItem = workspaceAction(
  z.object({ kind, id }),
  async (d, ctx) => {
    if (d.kind === "list") {
      await db
        .delete(lists)
        .where(
          and(eq(lists.id, d.id), eq(lists.workspaceId, ctx.workspaceId), isNotNull(lists.deletedAt)),
        );
    } else if (d.kind === "task") {
      await db
        .delete(tasks)
        .where(
          and(eq(tasks.id, d.id), eq(tasks.workspaceId, ctx.workspaceId), isNotNull(tasks.deletedAt)),
        );
    } else {
      await db
        .delete(notes)
        .where(
          and(eq(notes.id, d.id), eq(notes.workspaceId, ctx.workspaceId), isNotNull(notes.deletedAt)),
        );
    }
  },
  { minRole: "admin" },
);

export const emptyTrash = workspaceAction(
  z.void(),
  async (_, ctx) => {
    await Promise.all([
      db.delete(tasks).where(and(eq(tasks.workspaceId, ctx.workspaceId), isNotNull(tasks.deletedAt))),
      db.delete(notes).where(and(eq(notes.workspaceId, ctx.workspaceId), isNotNull(notes.deletedAt))),
    ]);
    await db.delete(lists).where(and(eq(lists.workspaceId, ctx.workspaceId), isNotNull(lists.deletedAt)));
  },
  { minRole: "admin" },
);
