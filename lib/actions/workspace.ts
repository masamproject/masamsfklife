"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { workspaceAction } from "@/lib/actions/safe-action";
import { effectivePlan } from "@/lib/plan-server";

export const getActiveWorkspace = workspaceAction(z.void(), async (_, ctx) => {
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.id, ctx.workspaceId)))
    .limit(1);
  return { ...ws, plan: await effectivePlan(ctx.workspaceId), role: ctx.role };
});
