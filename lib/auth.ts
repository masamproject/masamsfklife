import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { createPersonalWorkspace } from "@/lib/workspace";

const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  databaseHooks: {
    user: {
      create: {
        // Yeni kullanıcı => boş "Kişisel Masam" workspace
        after: async (user) => {
          await createPersonalWorkspace(user.id);
        },
      },
    },
    session: {
      create: {
        // Oturum açılırken ilk workspace'i aktif yap
        before: async (session) => {
          const [first] = await db
            .select({ workspaceId: schema.workspaceMembers.workspaceId })
            .from(schema.workspaceMembers)
            .where(eq(schema.workspaceMembers.userId, session.userId))
            .orderBy(asc(schema.workspaceMembers.joinedAt))
            .limit(1);
          return { data: { ...session, activeOrganizationId: first?.workspaceId ?? null } };
        },
      },
    },
  },
  plugins: [
    organization({
      // Better Auth "organization" => bizim workspaces tabloları
      schema: {
        organization: {
          modelName: "workspaces",
          additionalFields: {
            plan: { type: "string", required: false, defaultValue: "free", input: false },
            ownerId: { type: "string", required: false, input: false },
          },
        },
        member: {
          modelName: "workspaceMembers",
          fields: { organizationId: "workspaceId", createdAt: "joinedAt" },
        },
        invitation: {
          modelName: "invitations",
          fields: { organizationId: "workspaceId" },
        },
      },
      organizationHooks: {
        beforeCreateOrganization: async ({ organization, user }) => ({
          data: { ...organization, ownerId: user.id, plan: "free" },
        }),
      },
      sendInvitationEmail: async (data) => {
        // TODO: e-posta sağlayıcısı (Resend vb.) bağlanınca gerçek mail gönder
        const link = `${process.env.NEXT_PUBLIC_APP_URL}/davet/${data.id}`;
        console.log(`[davet] ${data.email} -> ${link}`);
      },
    }),
    nextCookies(), // her zaman son sırada
  ],
});

export type Session = typeof auth.$Infer.Session;
