import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";

export async function createPersonalWorkspace(userId: string) {
  const id = randomUUID();
  await db.insert(workspaces).values({
    id,
    name: "Kişisel Masam",
    slug: `kisisel-${id.slice(0, 8)}`,
    plan: "free",
    ownerId: userId,
  });
  try {
    await db.insert(workspaceMembers).values({
      id: randomUUID(),
      workspaceId: id,
      userId,
      role: "owner",
    });
  } catch (e) {
    // neon-http transaction desteklemez: telafi ile yarım kaydı temizle
    await db.delete(workspaces).where(eq(workspaces.id, id));
    throw e;
  }
  return id;
}
