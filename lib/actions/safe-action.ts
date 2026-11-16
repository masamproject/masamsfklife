import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { z } from "zod";
import { db } from "@/db";
import { workspaceMembers } from "@/db/schema";
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
export function workspaceAction<S extends z.ZodTypeAny, R>(
  input: S,
  handler: (data: z.infer<S>, ctx: ActionContext) => Promise<R>,
  options: Options = {},
) {
  return async (raw: z.input<S>): Promise<ActionResult<R>> => {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) return { ok: false, error: "Oturum bulunamadı." };

      const workspaceId = session.session.activeOrganizationId;
      if (!workspaceId) return { ok: false, error: "Aktif çalışma alanı yok." };

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
      if (!member) return { ok: false, error: "Bu çalışma alanına erişimin yok." };

      if (ROLE_RANK[member.role] < ROLE_RANK[options.minRole ?? "member"]) {
        return { ok: false, error: "Bu işlem için yetkin yok." };
      }

      const parsed = input.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi." };
      }

      const data = await handler(parsed.data, {
        userId: session.user.id,
        workspaceId,
        role: member.role,
      });
      return { ok: true, data };
    } catch (e) {
      console.error("[action]", e);
      return { ok: false, error: "Beklenmeyen bir hata oluştu." };
    }
  };
}
