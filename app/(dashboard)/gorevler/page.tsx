import { TaskBoard } from "@/components/tasks/task-board";

export default function GorevlerPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="mb-3.5 shrink-0 text-xl font-semibold tracking-tight">Görevler</h1>
      <TaskBoard />
    </div>
  );
}
