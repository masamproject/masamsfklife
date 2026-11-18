"use client";

import { matches, useFilter } from "@/components/providers/filter-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataActions, useWorkspaceData, type Kind } from "@/lib/hooks/use-data";
import { fmtStamp } from "@/lib/ui";

type Item = { id: string; name: string; archivedAt: Date };

export function ArchiveView() {
  const { q } = useFilter();
  const { data, isLoading } = useWorkspaceData();
  const a = useDataActions();
  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;

  const pick = <T extends { id: string; archivedAt: Date | null }>(arr: T[], nameOf: (x: T) => string): Item[] =>
    arr
      .filter((x): x is T & { archivedAt: Date } => !!x.archivedAt)
      .sort((x, y) => y.archivedAt.getTime() - x.archivedAt.getTime())
      .map((x) => ({ id: x.id, name: nameOf(x), archivedAt: x.archivedAt }));

  const sets: [string, Kind, Item[]][] = [
    ["Projeler", "project", pick(data.projects, (x) => x.name)],
    ["Görevler", "task", pick(data.tasks, (x) => x.title)],
    ["Notlar ve toplantılar", "note", pick(data.notes, (x) => x.title)],
    ["Dosyalar", "file", pick(data.files, (x) => x.name)],
  ];

  if (!sets.some((s) => s[2].length)) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <h1 className="mb-3.5 text-xl font-semibold tracking-tight">Arşiv</h1>
        <EmptyState title="Arşiv boş">
          Biten görev, not, proje ve dosyalardaki Arşivle düğmesi bunları buraya kaldırır. Listelerinden kalkar ama silinmez.
        </EmptyState>
      </div>
    );
  }

  let shown = 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="mb-3.5 text-xl font-semibold tracking-tight">Arşiv</h1>
      <div className="grid flex-1 content-start gap-x-6 rounded-lg border bg-card p-4 xl:grid-cols-2">
      {sets.map(([title, kind, all]) => {
        const items = all.filter((x) => matches(q, x.name));
        if (!items.length) return null;
        shown++;
        return (
          <section key={kind} className="mb-5 min-w-0">
            <h2 className="mb-1.5 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
              <span>{items.length}</span>
            </h2>
            <div className="rounded-lg border bg-background">
              {items.map((x) => (
                <div key={x.id} className="flex items-center gap-2.5 border-t px-3 py-[9px] first:border-t-0">
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{x.name || "Başlıksız"}</span>
                  <span className="font-mono text-xs text-muted-foreground">{fmtStamp(x.archivedAt)}</span>
                  <Button variant="outline" size="sm" onClick={() => a.unarchive(kind, x.id)}>
                    Geri çıkar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => a.trash(kind, x.id)}>
                    Çöpe taşı
                  </Button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      </div>
      {!shown && <EmptyState title="Eşleşen kayıt yok" className="mt-3" />}
    </div>
  );
}
