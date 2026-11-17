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
        <div className="min-h-screen bg-background">
          <Topbar />
          <div className="md:flex md:gap-7 md:px-4">
            <Sidebar />
            <main className="min-w-0 flex-1 px-3 pb-20 pt-4 md:px-0">{children}</main>
          </div>
        </div>
        <Suspense>
          <TaskModal />
        </Suspense>
      </FilterProvider>
    </WorkspaceProvider>
  );
}
