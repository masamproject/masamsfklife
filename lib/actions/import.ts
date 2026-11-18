"use server";

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import { z } from "zod";
import { db } from "@/db";
import { lists, projects, tasks } from "@/db/schema";
import { ActionError, workspaceAction } from "@/lib/actions/safe-action";
import { PLAN_LIMITS } from "@/lib/plan";
import { effectivePlan } from "@/lib/plan-server";

const card = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().max(20000).optional(),
  labels: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
  due: z.string().max(40).nullable().optional(),
  done: z.boolean().optional(),
});
const board = z.object({
  project: z.string().trim().min(1).max(200),
  lists: z
    .array(z.object({ title: z.string().trim().min(1).max(100), cards: z.array(card).max(500) }))
    .min(1)
    .max(30),
});

const norm = (s: string) => s.toLocaleLowerCase("tr-TR").trim();

/**
 * Bir panoyu (liste + kart) çalışma alanına aktarır.
 *  - Proje adı varsa o proje kullanılır, yoksa oluşturulur.
 *  - Aynı adlı liste varsa yeniden kullanılır, yoksa eklenir.
 *  - Dokunulmamış (boş) varsayılan listeler yeni listelerle yer değiştirir.
 *  - İçe aktarılan son liste "tamamlanan" (son sütun) olur.
 */
export const importBoard = workspaceAction(board, async (d, ctx) => {
  const w = ctx.workspaceId;

  // --- proje ---
  const existingProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.workspaceId, w), isNull(projects.deletedAt)));
  let projectId = existingProjects.find((p) => norm(p.name) === norm(d.project))?.id;
  if (!projectId) {
    projectId = crypto.randomUUID();
    await db.insert(projects).values({ id: projectId, workspaceId: w, name: d.project });
  }

  // --- listeler ---
  let live = await db
    .select()
    .from(lists)
    .where(and(eq(lists.workspaceId, w), isNull(lists.deletedAt)))
    .orderBy(asc(lists.position));
  const wanted = d.lists.map((l) => norm(l.title));
  const used = await db
    .select({ listId: tasks.listId })
    .from(tasks)
    .where(and(eq(tasks.workspaceId, w), isNull(tasks.deletedAt)));
  const usedIds = new Set(used.map((u) => u.listId));

  // dokunulmamış varsayılan listeleri kaldır (eşleşmeyen ve boş olanlar)
  for (const l of live) {
    if (l.id.startsWith(`${w}-d`) && !usedIds.has(l.id) && !wanted.includes(norm(l.title))) {
      await db.update(lists).set({ deletedAt: new Date() }).where(eq(lists.id, l.id));
    }
  }
  live = live.filter((l) => !(l.id.startsWith(`${w}-d`) && !usedIds.has(l.id) && !wanted.includes(norm(l.title))));

  const missing = d.lists.filter((l) => !live.some((x) => norm(x.title) === norm(l.title)));
  if ((await effectivePlan(w)) !== "pro" && live.length + missing.length > PLAN_LIMITS.free.lists) {
    throw new ActionError(
      `Bu pano ${missing.length} yeni liste ekler; Free planda en fazla ${PLAN_LIMITS.free.lists} liste olabilir. Önce boş listeleri sil veya Pro'ya geç.`,
    );
  }

  let lastPos = live.at(-1)?.position ?? null;
  const byTitle = new Map(live.map((l) => [norm(l.title), l]));
  for (const l of d.lists) {
    if (byTitle.has(norm(l.title))) continue;
    const position = generateKeyBetween(lastPos, null);
    lastPos = position;
    const row = { id: crypto.randomUUID(), workspaceId: w, title: l.title, position };
    await db.insert(lists).values(row);
    byTitle.set(norm(l.title), { ...row, createdAt: new Date(), deletedAt: null });
  }

  // içe aktarılan son liste en sona taşınır (son liste = tamamlanan)
  const lastImported = byTitle.get(norm(d.lists.at(-1)!.title))!;
  const [currentLast] = await db
    .select({ id: lists.id, position: lists.position })
    .from(lists)
    .where(and(eq(lists.workspaceId, w), isNull(lists.deletedAt)))
    .orderBy(desc(lists.position))
    .limit(1);
  if (currentLast && currentLast.id !== lastImported.id) {
    await db
      .update(lists)
      .set({ position: generateKeyBetween(currentLast.position, null) })
      .where(eq(lists.id, lastImported.id));
  }
  const lastId = lastImported.id;

  // --- kartlar ---
  let count = 0;
  for (const l of d.lists) {
    if (!l.cards.length) continue;
    const target = byTitle.get(norm(l.title))!;
    const [tail] = await db
      .select({ position: tasks.position })
      .from(tasks)
      .where(and(eq(tasks.listId, target.id), eq(tasks.workspaceId, w), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.position))
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
          projectId: projectId!,
          title: c.title,
          description: c.description ?? "",
          tags: c.labels ?? [],
          dueDate: due && !Number.isNaN(due.getTime()) ? due : null,
          position: keys[i],
          isCompleted: target.id === lastId,
        };
      }),
    );
    count += l.cards.length;
  }
  return { cards: count, lists: d.lists.length };
});
