import { Suspense } from "react";
import { CardModal } from "@/components/board/card-modal";
import { Topbar } from "@/components/layout/topbar";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { getActiveWorkspace } from "@/lib/actions/workspace";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(); // middleware yalnızca cookie bakar; gerçek doğrulama burada
  const ws = await getActiveWorkspace();

  if (!ws.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center text-muted-foreground">
        Çalışma alanı yüklenemedi: {ws.error}
      </div>
    );
  }

  return (
    <WorkspaceProvider
      value={{
        id: ws.data.id,
        name: ws.data.name,
        plan: ws.data.plan,
        role: ws.data.role,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      }}
    >
      <div className="flex h-screen flex-col">
        <Suspense>
          <Topbar />
        </Suspense>
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        <Suspense>
          <CardModal />
        </Suspense>
      </div>
    </WorkspaceProvider>
  );
}
