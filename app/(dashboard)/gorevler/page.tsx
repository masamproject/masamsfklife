import { ImportDialog } from "@/components/tasks/import-dialog";
import { TaskBoard } from "@/components/tasks/task-board";

export default function GorevlerPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3.5 flex shrink-0 items-center gap-3">
        <h1 className="flex-1 text-xl font-semibold tracking-tight">Görevler</h1>
        <ImportDialog />
      </div>
      <TaskBoard />
    </div>
  );
}
