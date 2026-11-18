"use client";

import { Archive, FileText, Folder, Paperclip, PanelLeftClose, PanelLeftOpen, SquareCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceData } from "@/lib/hooks/use-data";
import { cn } from "@/lib/utils";

const KEY = "masam-sidebar";

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useWorkspaceData();
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
          Ben
        </div>
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
    </aside>
  );
}
