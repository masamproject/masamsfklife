import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { FilterProvider } from "@/components/providers/filter-provider";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { TaskModal } from "@/components/tasks/task-modal";
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
      <FilterProvider>
        <div className="flex h-[100dvh] flex-col bg-background">
          <Topbar />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <Sidebar />
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-3 pb-6 md:p-5">{children}</main>
          </div>
        </div>
        <Suspense>
          <TaskModal />
        </Suspense>
      </FilterProvider>
    </WorkspaceProvider>
  );
}
