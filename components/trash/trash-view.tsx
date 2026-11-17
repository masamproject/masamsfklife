"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Skeleton } from "@/components/ui/skeleton";
import * as api from "@/lib/actions/data";
import { unwrap } from "@/lib/actions/unwrap";
import { dataKey, trashKey, useDataActions, type Kind } from "@/lib/hooks/use-data";
import { fmtStamp } from "@/lib/ui";

const GROUPS: [string, keyof NonNullable<Awaited<ReturnType<typeof load>>>, Kind][] = [
  ["Görevler", "tasks", "task"],
  ["Notlar", "notes", "note"],
  ["Projeler", "projects", "project"],
  ["Dosyalar", "files", "file"],
  ["Defterler", "notebooks", "notebook"],
  ["Bölümler", "sections", "section"],
  ["Listeler", "lists", "list"],
];
const load = () => unwrap(api.getTrash());

export function TrashView() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const a = useDataActions();
  const canPurge = ws.role === "owner" || ws.role === "admin";
  const { data, isLoading } = useQuery({ queryKey: trashKey(ws.id), queryFn: load });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: trashKey(ws.id) });
    qc.invalidateQueries({ queryKey: dataKey(ws.id) });
  };
  const purge = useMutation({
    mutationFn: (v: { kind: Kind; id: string }) => unwrap(api.purgeItem(v)),
    onSuccess: refresh,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Silinemedi."),
  });
  const empty = useMutation({
    mutationFn: () => unwrap(api.emptyTrash()),
    onSuccess: refresh,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Boşaltılamadı."),
  });

  if (isLoading || !data) return <Skeleton className="h-40 w-full max-w-3xl" />;
  const total = GROUPS.reduce((n, [, k]) => n + data[k].length, 0);

  return (
    <div className="max-w-[760px]">
      <div className="mb-3.5 flex items-center gap-3">
        <h1 className="flex-1 text-xl font-semibold tracking-tight">Çöp</h1>
        {total > 0 && canPurge && <ConfirmButton label="Çöpü boşalt" onConfirm={() => empty.mutate()} />}
      </div>

      {total === 0 && (
        <div className="px-2 py-7 text-center text-muted-foreground">
          <strong className="mb-1 block text-base text-foreground">Çöp boş</strong>
          Sildiğin görev, not, proje ve dosyalar burada durur, istersen geri alırsın.
        </div>
      )}

      {GROUPS.map(([title, key, kind]) => {
        const items = data[key];
        if (!items.length) return null;
        return (
          <section key={key} className="mb-[22px]">
            <h2 className="mb-1.5 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
              <span>{items.length}</span>
            </h2>
            <div className="rounded-lg border bg-card">
              {items.map((x) => (
                <div key={x.id} className="flex items-center gap-2.5 border-t px-3 py-[9px] first:border-t-0">
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{x.title || "Başlıksız"}</span>
                  <span className="font-mono text-xs text-muted-foreground">{x.deletedAt ? fmtStamp(x.deletedAt) : ""}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      a.restore(kind, x.id).then(refresh, (e) => toast.error(e instanceof Error ? e.message : "Geri alınamadı."))
                    }
                  >
                    Geri al
                  </Button>
                  {canPurge && <ConfirmButton label="Kalıcı sil" onConfirm={() => purge.mutate({ kind, id: x.id })} />}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
