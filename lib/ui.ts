const TAG_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-pink-500",
];

/** Aynı etiket her zaman aynı rengi alır. */
export function tagColor(tag: string) {
  let h = 0;
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length];
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export type DueState = "overdue" | "today" | "soon" | "later" | "none";

export function dueState(due: Date | null, completed: boolean, now = new Date()): DueState {
  if (!due) return "none";
  const d = startOfDay(new Date(due)).getTime();
  const today = startOfDay(now).getTime();
  if (d < today) return completed ? "later" : "overdue";
  if (d === today) return "today";
  return d - today <= 2 * 86400000 ? "soon" : "later";
}

export function formatDue(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

/** <input type="date"> değeri <-> Date (öğlen 12:00: saat dilimi kaymasını önler) */
export function toDateInput(d: Date | null) {
  if (!d) return "";
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

export function fromDateInput(v: string) {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export const PRIORITY_LABEL = { low: "Düşük", medium: "Orta", high: "Yüksek" } as const;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
