import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";

export async function createPersonalWorkspace(userId: string) {
  const id = randomUUID();
  // neon-http transaction desteklemez => batch (tek round-trip, atomik)
  await db.batch([
    db.insert(workspaces).values({
      id,
      name: "Kişisel Masam",
      slug: `kisisel-${id.slice(0, 8)}`,
      plan: "free",
      ownerId: userId,
    }),
    db.insert(workspaceMembers).values({
      id: randomUUID(),
      workspaceId: id,
      userId,
      role: "owner",
    }),
  ]);
  return id;
}
