"use server";

import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notes, tasks } from "@/db/schema";
import { workspaceAction } from "@/lib/actions/safe-action";

const esc = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const searchAll = workspaceAction(
  z.object({ q: z.string().trim().min(1).max(100) }),
  async ({ q }, ctx) => {
    const like = `%${esc(q)}%`;
    const [t, n] = await Promise.all([
      db
        .select({ id: tasks.id, title: tasks.title, isCompleted: tasks.isCompleted })
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, ctx.workspaceId),
            isNull(tasks.deletedAt),
            or(ilike(tasks.title, like), ilike(tasks.description, like)),
          ),
        )
        .orderBy(desc(tasks.createdAt))
        .limit(8),
      db
        .select({ id: notes.id, title: notes.title, type: notes.type })
        .from(notes)
        .where(
          and(
            eq(notes.workspaceId, ctx.workspaceId),
            isNull(notes.deletedAt),
            or(ilike(notes.title, like), ilike(notes.content, like)),
          ),
        )
        .orderBy(desc(notes.updatedAt))
        .limit(8),
    ]);
    return { tasks: t, notes: n };
  },
);
