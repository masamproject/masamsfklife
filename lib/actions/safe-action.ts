import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { z } from "zod";
import { db } from "@/db";
import { session as sessionTable, workspaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";

export type Role = "owner" | "admin" | "member";
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type ActionContext = {
  userId: string;
  workspaceId: string;
  role: Role;
};

const ROLE_RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };

type Options = {
  /** İşlem için gereken en düşük rol (varsayılan: member) */
  minRole?: Role;
};

/**
 * Güvenli Server Action sarmalayıcısı:
 *  1. Oturum doğrular
 *  2. Aktif workspace'i sunucudan okur (client'a güvenmez)
 *  3. DB'den üyelik + rol doğrular
 *  4. Girdiyi zod ile doğrular
 *  5. Hataları ActionResult olarak döner (throw yok)
 *
 * Handler içindeki HER sorgu ctx.workspaceId ile filtrelenmelidir.
 */
/** Oturum + aktif workspace + üyelik/rol doğrulaması. Hata durumunda Error fırlatır. */
export async function resolveContext(minRole: Role = "member"): Promise<ActionContext> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ActionError("Oturum bulunamadı.");

  let workspaceId = session.session.activeOrganizationId;
  if (!workspaceId) {
    // Kayıt anında oturum, workspace'ten önce oluşabilir: ilk üyeliği aktif yap ve oturuma yaz
    const [first] = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, session.user.id))
      .orderBy(asc(workspaceMembers.joinedAt))
      .limit(1);
    if (!first) throw new ActionError("Aktif çalışma alanı yok.");
    workspaceId = first.workspaceId;
    await db
      .update(sessionTable)
      .set({ activeOrganizationId: workspaceId })
      .where(eq(sessionTable.id, session.session.id));
  }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!member) throw new ActionError("Bu çalışma alanına erişimin yok.");
  if (ROLE_RANK[member.role] < ROLE_RANK[minRole]) throw new ActionError("Bu işlem için yetkin yok.");

  return { userId: session.user.id, workspaceId, role: member.role };
}

/** Kullanıcıya olduğu gibi gösterilebilecek hata. */
export class ActionError extends Error {}

/**
 * Güvenli Server Action sarmalayıcısı:
 *  1. Oturum, aktif workspace ve üyelik/rol doğrulanır (client'a güvenilmez)
 *  2. Girdi zod ile doğrulanır
 *  3. Hatalar ActionResult olarak döner (throw yok)
 *
 * Handler içindeki HER sorgu ctx.workspaceId ile filtrelenmelidir.
 */
export function workspaceAction<S extends z.ZodTypeAny, R>(
  input: S,
  handler: (data: z.infer<S>, ctx: ActionContext) => Promise<R>,
  options: Options = {},
) {
  return async (raw: z.input<S>): Promise<ActionResult<R>> => {
    try {
      const ctx = await resolveContext(options.minRole);
      const parsed = input.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi." };
      }
      return { ok: true, data: await handler(parsed.data, ctx) };
    } catch (e) {
      if (e instanceof ActionError) return { ok: false, error: e.message };
      console.error("[action]", e);
      return { ok: false, error: "Beklenmeyen bir hata oluştu." };
    }
  };
}
