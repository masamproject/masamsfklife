"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { useFilter } from "@/components/providers/filter-provider";
import { useIsFetching } from "@tanstack/react-query";
import { usePendingWrites, useWorkspaceData } from "@/lib/hooks/use-data";

export function Topbar() {
  const { q, setQ, pf, setPf } = useFilter();
  const pathname = usePathname();
  const { data, isError } = useWorkspaceData();
  const pending = usePendingWrites();
  const fetching = useIsFetching({ queryKey: ["data"] });

  const hideProject = ["/projeler", "/arsiv", "/cop"].some((p) => pathname.startsWith(p));
  const projects = (data?.projects ?? []).filter((p) => !p.archivedAt);
  const sorted = [...projects].sort((x, y) => x.name.localeCompare(y.name, "tr"));
  // Silinen/arşivlenen proje seçiliyse filtreyi sıfırla
  const pfValid = !pf || projects.some((p) => p.id === pf);

  const status = isError ? "Veriye ulaşılamıyor" : !data && fetching ? "Yükleniyor…" : pending ? "Kaydediliyor…" : "Kaydedildi";

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-card px-3 py-2.5 sm:px-4">
      <Link href="/gorevler" className="w-[188px] text-[17px] font-semibold tracking-tight max-md:hidden">
        Masam
      </Link>
      {!hideProject && (
        <nav
          aria-label="Proje filtresi"
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:thin] max-md:basis-full max-md:order-last"
        >
          {sorted.map((p) => {
            const active = pfValid && pf === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => setPf(active ? "" : p.id)}
                className={
                  "h-8 shrink-0 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                {p.name}
              </button>
            );
          })}
        </nav>
      )}
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={pathname.startsWith("/cop")}
        placeholder="Ara…"
        aria-label="Ara"
        autoComplete="off"
        className="ml-auto h-9 min-w-0 max-w-[260px] flex-1 basis-40 rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
      />
      <span className="whitespace-nowrap font-mono text-xs text-muted-foreground" aria-live="polite">
        {status}
      </span>
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
