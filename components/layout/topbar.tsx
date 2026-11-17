"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { useFilter } from "@/components/providers/filter-provider";
import { useIsFetching } from "@tanstack/react-query";
import { NativeSelect } from "@/components/ui/native-select";
import { usePendingWrites, useWorkspaceData } from "@/lib/hooks/use-data";

export function Topbar() {
  const { q, setQ, pf, setPf } = useFilter();
  const pathname = usePathname();
  const { data, isError } = useWorkspaceData();
  const pending = usePendingWrites();
  const fetching = useIsFetching({ queryKey: ["data"] });

  const hideProject = ["/projeler", "/arsiv", "/cop"].some((p) => pathname.startsWith(p));
  const projects = (data?.projects ?? []).filter((p) => !p.archivedAt);
  // Silinen/arşivlenen proje seçiliyse filtreyi sıfırla
  const pfValid = !pf || projects.some((p) => p.id === pf);

  const status = isError ? "Veriye ulaşılamıyor" : !data && fetching ? "Yükleniyor…" : pending ? "Kaydediliyor…" : "Kaydedildi";

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-card px-3 py-2.5 sm:px-4">
      <Link href="/gorevler" className="w-[188px] text-[17px] font-semibold tracking-tight max-md:hidden">
        Masam
      </Link>
      <WorkspaceSwitcher />
      {!hideProject && (
        <NativeSelect
          aria-label="Proje filtresi"
          value={pfValid ? pf : ""}
          onChange={(e) => setPf(e.target.value)}
          className="w-auto max-w-[220px] bg-background"
        >
          <option value="">Tüm projeler</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      )}
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={pathname.startsWith("/cop")}
        placeholder="Ara…"
        aria-label="Ara"
        autoComplete="off"
        className="ml-auto h-9 min-w-0 max-w-[340px] flex-1 basis-40 rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
      />
      <span className="whitespace-nowrap font-mono text-xs text-muted-foreground" aria-live="polite">
        {status}
      </span>
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
