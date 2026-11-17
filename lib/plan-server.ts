import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user, workspaces } from "@/db/schema";
import type { Plan } from "@/lib/plan";

/** Kurucu e-postaları (virgülle ayrılmış): bu kullanıcıların sahibi olduğu alanlar her zaman Pro sayılır. */
function founderEmails() {
  return (process.env.FOUNDER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Ödeme planı + kurucu muafiyeti. Plan sınırı kontrolleri bunu kullanmalı. */
export async function effectivePlan(workspaceId: string): Promise<Plan> {
  const [row] = await db
    .select({ plan: workspaces.plan, ownerEmail: user.email })
    .from(workspaces)
    .innerJoin(user, eq(user.id, workspaces.ownerId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!row) return "free";
  if (founderEmails().includes(row.ownerEmail.toLowerCase())) return "pro";
  return row.plan;
}
