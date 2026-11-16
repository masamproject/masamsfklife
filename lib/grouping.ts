import type { Task } from "@/db/schema";
import { startOfDay } from "@/lib/ui";

export type GroupKey = "overdue" | "today" | "week" | "later" | "none" | "done";

export const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "overdue", label: "Gecikmiş" },
  { key: "today", label: "Bugün" },
  { key: "week", label: "Bu Hafta" },
  { key: "later", label: "Daha Sonra" },
  { key: "none", label: "Tarihsiz" },
  { key: "done", label: "Tamamlanan" },
];

/** Pazartesi başlangıçlı haftanın son günü (Pazar), gün başlangıcı olarak. */
function endOfWeek(now: Date) {
  const d = startOfDay(now);
  const dow = (d.getDay() + 6) % 7; // Pzt=0 … Paz=6
  d.setDate(d.getDate() + (6 - dow));
  return d;
}

export function groupOf(t: Task, now = new Date()): GroupKey {
  if (t.isCompleted) return "done";
  if (!t.dueDate) return "none";
  const d = startOfDay(new Date(t.dueDate)).getTime();
  const today = startOfDay(now).getTime();
  if (d < today) return "overdue";
  if (d === today) return "today";
  return d <= endOfWeek(now).getTime() ? "week" : "later";
}

export function groupTasks(tasks: Task[], now = new Date()) {
  const out: Record<GroupKey, Task[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    none: [],
    done: [],
  };
  for (const t of tasks) out[groupOf(t, now)].push(t);
  const byDue = (a: Task, b: Task) =>
    new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime() ||
    a.createdAt.getTime() - b.createdAt.getTime();
  for (const k of ["overdue", "today", "week", "later"] as const) out[k].sort(byDue);
  out.none.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  out.done.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return out;
}
