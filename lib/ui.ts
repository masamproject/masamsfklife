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

export const PRIORITY_LABEL = { high: "Yüksek", medium: "Orta", low: "Düşük" } as const;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ---------- tarih/boyut biçimleri (prototip ile aynı) ---------- */
const dayDiff = (d: Date) => Math.round((startOfDay(new Date(d)).getTime() - startOfDay(new Date()).getTime()) / 864e5);

export function fmtDay(d: Date, withYear?: boolean) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: withYear ? "numeric" : undefined });
}

/** "Bugün", "Yarın", "3 gün gecikti", "Cuma", "12 Mar" */
export function fmtDue(d: Date) {
  const n = dayDiff(d);
  if (n === 0) return "Bugün";
  if (n === 1) return "Yarın";
  if (n === -1) return "Dün";
  if (n < 0) return `${-n} gün gecikti`;
  if (n < 7) return new Date(d).toLocaleDateString("tr-TR", { weekday: "long" });
  return fmtDay(d, new Date(d).getFullYear() !== new Date().getFullYear());
}

export function fmtStamp(d: Date) {
  return new Date(d).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtSize(b: number) {
  return b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
}

export const parseTags = (s: string) => Array.from(new Set(s.split(",").map((x) => x.trim()).filter(Boolean)));

export const PALETTE = ["#e03131", "#c2255c", "#f08c00", "#2f9e44", "#12b5a0", "#1c7ed6", "#7048e8", "#868e96"];
