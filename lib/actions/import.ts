"use server";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import { z } from "zod";
import { db } from "@/db";
import { lists, projects, tasks } from "@/db/schema";
import { workspaceAction } from "@/lib/actions/safe-action";

const card = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().max(20000).nullable().optional(),
  labels: z.array(z.string().trim().min(1).max(30)).max(20).nullable().optional(),
  due: z.string().max(40).nullable().optional(),
});
const board = z.object({
  project: z.string().trim().min(1).max(200),
  lists: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(100),
        done: z.boolean().optional(), // tamamlanan sütun mu?
        cards: z.array(card).max(500),
      }),
    )
    .min(1)
    .max(30),
});

const bytes = (col: Parameters<typeof asc>[0]) => sql`${col} COLLATE "C"`;
const norm = (s: string) => s.toLocaleLowerCase("tr-TR").trim();

/**
 * Bir panoyu (liste + kart) bir projenin panosu olarak aktarır.
 *  - Proje adı varsa o proje kullanılır, yoksa oluşturulur.
 *  - Listeler projeye özeldir; aynı adlı liste varsa yeniden kullanılır, yoksa eklenir.
 *  - Dokunulmamış (boş) ortak varsayılan listeler kaldırılır (çöpten geri alınabilir).
 *  - `done` işaretli liste tamamlanan sütun olur (kapsamda en fazla bir tane).
 */
export const importBoard = workspaceAction(board, async (d, ctx) => {
  const w = ctx.workspaceId;

  // --- proje ---
  const existing = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.workspaceId, w), isNull(projects.deletedAt)));
  let projectId = existing.find((p) => norm(p.name) === norm(d.project))?.id;
  if (!projectId) {
    projectId = crypto.randomUUID();
    await db.insert(projects).values({ id: projectId, workspaceId: w, name: d.project });
  }
  const pid = projectId;

  // --- dokunulmamış ortak varsayılan listeleri kaldır ---
  const shared = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.workspaceId, w), isNull(lists.deletedAt), isNull(lists.projectId)));
  const used = new Set(
    (
      await db
        .select({ listId: tasks.listId })
        .from(tasks)
        .where(and(eq(tasks.workspaceId, w), isNull(tasks.deletedAt)))
    ).map((u) => u.listId),
  );
  for (const l of shared) {
    if (l.id.startsWith(`${w}-d`) && !used.has(l.id)) {
      await db.update(lists).set({ deletedAt: new Date() }).where(eq(lists.id, l.id));
    }
  }

  // --- projenin listeleri ---
  const scope = await db
    .select()
    .from(lists)
    .where(and(eq(lists.workspaceId, w), isNull(lists.deletedAt), eq(lists.projectId, pid)))
    .orderBy(asc(bytes(lists.position)));
  const byTitle = new Map(scope.map((l) => [norm(l.title), l]));

  let lastPos = scope.at(-1)?.position ?? null;
  let hasDone = scope.some((l) => l.isDone);
  for (const l of d.lists) {
    if (byTitle.has(norm(l.title))) continue;
    const position = generateKeyBetween(lastPos, null);
    lastPos = position;
    const isDone = !!l.done && !hasDone;
    if (isDone) hasDone = true;
    const row = { id: crypto.randomUUID(), workspaceId: w, title: l.title, projectId: pid, isDone, position };
    await db.insert(lists).values(row);
    byTitle.set(norm(l.title), { ...row, createdAt: new Date(), deletedAt: null });
  }

  // --- kartlar ---
  let count = 0;
  for (const l of d.lists) {
    if (!l.cards.length) continue;
    const target = byTitle.get(norm(l.title))!;
    const [tail] = await db
      .select({ position: tasks.position })
      .from(tasks)
      .where(and(eq(tasks.listId, target.id), eq(tasks.workspaceId, w), isNull(tasks.deletedAt)))
      .orderBy(desc(bytes(tasks.position)))
      .limit(1);
    const keys = generateNKeysBetween(tail?.position ?? null, null, l.cards.length);
    await db.insert(tasks).values(
      l.cards.map((c, i) => {
        const due = c.due ? new Date(c.due) : null;
        return {
          id: crypto.randomUUID(),
          workspaceId: w,
          creatorId: ctx.userId,
          listId: target.id,
          projectId: pid,
          title: c.title,
          description: c.description ?? "",
          tags: c.labels ?? [],
          dueDate: due && !Number.isNaN(due.getTime()) ? due : null,
          position: keys[i],
          isCompleted: target.isDone,
        };
      }),
    );
    count += l.cards.length;
  }
  return { cards: count, lists: d.lists.length };
});
