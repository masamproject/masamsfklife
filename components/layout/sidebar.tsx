"use client";

import { Archive, FileText, Folder, Paperclip, SquareCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspaceData } from "@/lib/hooks/use-data";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useWorkspaceData();
  const live = <T extends { archivedAt?: Date | null }>(a: T[] | undefined) => (a ?? []).filter((x) => !x.archivedAt);

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
    <aside className="shrink-0 border-b bg-card md:flex md:w-[200px] md:flex-col md:border-b-0 md:border-r md:px-2 md:pb-3 md:pt-4">
      <nav aria-label="Bölümler" className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-1 md:flex-col md:gap-0.5 md:overflow-visible md:p-0">
        {items.map((it, i) =>
          "sep" in it ? (
            <span key={i} className="mx-1.5 mb-1.5 mt-auto hidden h-px bg-border md:block" />
          ) : (
            <Link
              key={it.href}
              href={it.href}
              aria-current={pathname.startsWith(it.href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground md:px-2.5 md:py-2",
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
                  )}
                >
                  {it.n}
                </span>
              )}
            </Link>
          ),
        )}
      </nav>
    </aside>
  );
}
