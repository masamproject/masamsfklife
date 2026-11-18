"use client";

import { Archive, FileText, Folder, Paperclip, PanelLeftClose, PanelLeftOpen, SquareCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceData } from "@/lib/hooks/use-data";
import { cn } from "@/lib/utils";

const KEY = "masam-sidebar";

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useWorkspaceData();
  const { user } = useWorkspace();
  const live = <T extends { archivedAt?: Date | null }>(a: T[] | undefined) => (a ?? []).filter((x) => !x.archivedAt);

  // Daraltılmış menü: yalnızca simgeler; üzerine gelince geçici genişler (yerleşimi kaydırmaz)
  const [collapsed, setCollapsed] = useState(false);
  const [peek, setPeek] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(KEY) === "1");
    } catch {
      /* tercih okunamazsa açık kalır */
    }
    return () => clearTimeout(timer.current);
  }, []);
  const toggle = () => {
    clearTimeout(timer.current);
    setPeek(false);
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? "0" : "1");
      } catch {
        /* yoksay */
      }
      return !c;
    });
  };
  const peekOn = () => {
    clearTimeout(timer.current);
    if (collapsed) setPeek(true);
  };
  const peekOff = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPeek(false), 160);
  };
  const rail = collapsed && !peek; // yalnızca simge görünümü

  const archived =
    (data?.projects.filter((x) => x.archivedAt).length ?? 0) +
    (data?.tasks.filter((x) => x.archivedAt).length ?? 0) +
    (data?.notes.filter((x) => x.archivedAt).length ?? 0) +
    (data?.files.filter((x) => x.archivedAt).length ?? 0);

  // Bana atanan, bitmemiş görevler; projeye göre gruplu (tüm projeler tek yerde)
  const mine = (data?.tasks ?? []).filter((t) => t.assigneeId === user.id && !t.isCompleted && !t.archivedAt && !t.deletedAt);
  const groups = new Map<string, { name: string; tasks: typeof mine }>();
  for (const t of mine) {
    const proj = data?.projects.find((p) => p.id === t.projectId && !p.deletedAt && !p.archivedAt);
    if (t.projectId && !proj) continue; // silinmiş/arşivli projenin görevi
    const key = proj?.id ?? "-";
    const g = groups.get(key) ?? { name: proj?.name ?? "Projesiz", tasks: [] };
    g.tasks.push(t);
    groups.set(key, g);
  }
  const mineGroups = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const mineCount = mineGroups.reduce((n, g) => n + g.tasks.length, 0);

  // Dönüş bekleniyor: bitmemiş görevler, beklenen kişiye göre gruplu
  const waiting = (data?.people ?? [])
    .map((p) => ({
      person: p,
      tasks: (data?.tasks ?? []).filter(
        (t) => t.personIds.includes(p.id) && !t.isCompleted && !t.archivedAt && !t.deletedAt && (!t.projectId || data?.projects.some((x) => x.id === t.projectId && !x.deletedAt && !x.archivedAt)),
      ),
    }))
    .filter((g) => g.tasks.length > 0);
  const waitingCount = waiting.reduce((n, g) => n + g.tasks.length, 0);

  const items = [
    { href: "/projeler", label: "Projeler", icon: Folder, n: live(data?.projects).length },
    { href: "/toplanti", label: "Notlarım", icon: FileText, n: live(data?.notes).length },
    { href: "/gorevler", label: "Görevler", icon: SquareCheck, n: live(data?.tasks).filter((t) => !t.isCompleted).length },
    { href: "/dosyalar", label: "Dosyalar", icon: Paperclip, n: live(data?.files).length },
    { sep: true as const },
    { href: "/arsiv", label: "Arşiv", icon: Archive, n: archived },
    { href: "/cop", label: "Çöp Kutusu", icon: Trash2, n: undefined },
  ];

  return (
    <aside
      className={cn(
        "relative shrink-0 border-b bg-card transition-[width] duration-200 md:w-[200px] md:border-b-0",
        collapsed && "md:w-16",
      )}
      onMouseEnter={peekOn}
      onMouseLeave={peekOff}
      onFocus={peekOn}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) peekOff();
      }}
    >
      <div
        className={cn(
          "overflow-hidden bg-card transition-[width,box-shadow] duration-200 md:absolute md:inset-y-0 md:left-0 md:z-30 md:flex md:flex-col md:border-r md:px-2 md:pb-3 md:pt-2",
          rail ? "md:w-16" : "md:w-[200px]",
          collapsed && peek && "md:shadow-[10px_0_30px_rgba(0,0,0,0.18)]",
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          className="mb-1 hidden h-9 items-center gap-2.5 whitespace-nowrap rounded-md px-4 text-muted-foreground hover:bg-muted hover:text-foreground md:flex"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
          <span className="text-xs">{collapsed ? "Genişlet" : "Daralt"}</span>
        </button>
        <div
          className={cn(
            "mb-1 mt-2 hidden whitespace-nowrap px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 md:block",
            rail && "md:invisible",
          )}
        >
          Ben{mineCount > 0 && <span className="ml-1.5 font-mono normal-case">{mineCount}</span>}
        </div>
        {!rail && (
          <div className="mb-2 hidden max-h-[38%] min-h-0 shrink-0 overflow-y-auto px-1 md:block">
            {mineGroups.length === 0 ? (
              <p className="px-3 py-1 text-xs text-muted-foreground">Sana atanmış açık görev yok.</p>
            ) : (
              mineGroups.map((g) => (
                <div key={g.name} className="mb-1.5">
                  <div className="truncate px-3 pb-0.5 text-[11px] font-medium text-muted-foreground">{g.name}</div>
                  {g.tasks.map((t) => (
                    <Link
                      key={t.id}
                      href={`${pathname}?card=${t.id}`}
                      scroll={false}
                      title={`${t.title} — ${data?.lists.find((l) => l.id === t.listId)?.title ?? ""}`}
                      className="flex items-center gap-2 rounded-md px-3 py-1 text-xs text-foreground hover:bg-muted"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="truncate">{t.title}</span>
                    </Link>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
        {!rail && waiting.length > 0 && (
          <>
            <div className="mb-1 mt-1 hidden whitespace-nowrap px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 md:block">
              Dönüş Bekleniyor<span className="ml-1.5 font-mono normal-case">{waitingCount}</span>
            </div>
            <div className="mb-2 hidden max-h-[30%] min-h-0 shrink-0 overflow-y-auto px-1 md:block">
              {waiting.map((g) => (
                <div key={g.person.id} className="mb-1.5">
                  <div className="truncate px-3 pb-0.5 text-[11px] font-medium text-muted-foreground">{g.person.name}</div>
                  {g.tasks.map((t) => (
                    <Link
                      key={t.id}
                      href={`${pathname}?card=${t.id}`}
                      scroll={false}
                      title={t.title}
                      className="flex items-center gap-2 rounded-md px-3 py-1 text-xs text-foreground hover:bg-muted"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span className="truncate">{t.title}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
        <nav aria-label="Bölümler" className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-1 md:flex-col md:gap-0.5 md:overflow-visible md:p-0">
          {items.map((it, i) =>
            "sep" in it ? (
              <span key={i} className="mx-1.5 mb-1.5 mt-auto hidden h-px bg-border md:block" />
            ) : (
              <Link
                key={it.href}
                href={it.href}
                title={it.label}
                aria-current={pathname.startsWith(it.href) ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground md:px-4 md:py-2",
                  pathname.startsWith(it.href) && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
                )}
              >
                <it.icon className="h-4 w-4 shrink-0" />
                <span className="md:flex-1">{it.label}</span>
                {it.n !== undefined && (
                  <span
                    className={cn(
                      "hidden rounded-full bg-muted px-1.5 font-mono text-[12px] font-medium text-muted-foreground md:inline",
                      pathname.startsWith(it.href) && "bg-card text-primary",
                      rail && "md:absolute md:right-1 md:top-0.5 md:min-w-[15px] md:px-1 md:text-center md:text-[10px] md:leading-[15px]",
                      rail && it.n === 0 && "md:hidden",
                    )}
                  >
                    {it.n}
                  </span>
                )}
              </Link>
            ),
          )}
        </nav>
      </div>
      {/* Mobil: "Ben" ve "Dönüş Bekleniyor" listeleri açılır bölümler olarak menünün altında */}
      <div className="border-t md:hidden">
        {[
          { title: "Ben", count: mineCount, groups: mineGroups.map((g) => ({ key: g.name, name: g.name, tasks: g.tasks })), empty: "Sana atanmış açık görev yok." },
          { title: "Dönüş Bekleniyor", count: waitingCount, groups: waiting.map((g) => ({ key: g.person.id, name: g.person.name, tasks: g.tasks })), empty: "" },
        ]
          .filter((sec) => sec.groups.length > 0 || sec.empty)
          .map((sec) => (
            <details key={sec.title} className="group border-b last:border-b-0">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-semibold">
                <span>{sec.title}</span>
                <span className="font-mono text-xs text-muted-foreground">{sec.count}</span>
              </summary>
              <div className="max-h-[40vh] overflow-y-auto px-2 pb-2">
                {sec.groups.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">{sec.empty}</p>}
                {sec.groups.map((g) => (
                  <div key={g.key} className="mb-1.5">
                    <div className="truncate px-2 pb-0.5 text-[11px] font-medium text-muted-foreground">{g.name}</div>
                    {g.tasks.map((t) => (
                      <Link key={t.id} href={`${pathname}?card=${t.id}`} scroll={false} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="truncate">{t.title}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ))}
      </div>
    </aside>
  );
}
