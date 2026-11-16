"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { workspaceAction } from "@/lib/actions/safe-action";

const id = z.string().min(1).max(64);

export const listNotes = workspaceAction(z.void(), async (_, ctx) =>
  db
    .select()
    .from(notes)
    .where(and(eq(notes.workspaceId, ctx.workspaceId), isNull(notes.deletedAt)))
    .orderBy(desc(notes.updatedAt))
    .limit(500),
);

export const createNote = workspaceAction(
  z.object({
    id,
    type: z.enum(["free", "meeting"]),
    title: z.string().max(300).default(""),
    content: z.string().max(200000).default(""),
    meetingDate: z.coerce.date().nullable().optional(),
    participants: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  }),
  async (d, ctx) => {
    await db.insert(notes).values({
      id: d.id,
      workspaceId: ctx.workspaceId,
      authorId: ctx.userId,
      type: d.type,
      title: d.title,
      content: d.content,
      meetingDate: d.meetingDate ?? null,
      participants: d.participants,
    });
  },
);

export const updateNote = workspaceAction(
  z.object({
    id,
    title: z.string().max(300).optional(),
    content: z.string().max(200000).optional(),
    meetingDate: z.coerce.date().nullable().optional(),
    participants: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  }),
  async ({ id: noteId, ...patch }, ctx) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await db
      .update(notes)
      .set({ ...clean, updatedAt: new Date() })
      .where(and(eq(notes.id, noteId), eq(notes.workspaceId, ctx.workspaceId)));
  },
);

export const deleteNote = workspaceAction(z.object({ id }), async (d, ctx) => {
  await db
    .update(notes)
    .set({ deletedAt: new Date() })
    .where(and(eq(notes.id, d.id), eq(notes.workspaceId, ctx.workspaceId)));
});
