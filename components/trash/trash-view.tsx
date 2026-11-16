"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookText, RotateCcw, SquareCheck, Columns3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { unwrap } from "@/lib/actions/unwrap";
import { emptyTrash, getTrash, purgeItem } from "@/lib/actions/trash";
import { useDataActions } from "@/lib/hooks/use-data";

type Kind = "list" | "task" | "note";
const META: Record<Kind, { label: string; icon: typeof NotebookText }> = {
  list: { label: "Listeler", icon: Columns3 },
  task: { label: "Görevler", icon: SquareCheck },
  note: { label: "Notlar", icon: NotebookText },
};

/** İki adımlı onay: ilk tık "Emin misin?" gösterir, ikinci tık işlemi yapar. */
function ConfirmButton({
  label,
  onConfirm,
  disabled,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        disabled={disabled}
        onClick={() => setArmed(true)}
      >
        {label}
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <span className="text-xs text-destructive">Emin misin?</span>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        Evet, sil
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setArmed(false)}>
        Vazgeç
      </Button>
    </span>
  );
}

export function TrashView() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const { restore } = useDataActions();
  const canPurge = ws.role === "owner" || ws.role === "admin";
  const key = ["trash", ws.id];

  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => unwrap(getTrash()) });

  const purge = useMutation({
    mutationFn: (v: { kind: Kind; id: string }) => unwrap(purgeItem(v)),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Silinemedi."),
  });
  const empty = useMutation({
    mutationFn: () => unwrap(emptyTrash()),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Boşaltılamadı."),
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const groups: { kind: Kind; items: { id: string; title: string; deletedAt: Date | null }[] }[] = [
    { kind: "list", items: data.lists },
    { kind: "task", items: data.tasks },
    { kind: "note", items: data.notes },
  ];
  const total = data.lists.length + data.tasks.length + data.notes.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-3 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Çöp Kutusu</h1>
        {total > 0 && canPurge && (
          <ConfirmButton label="Tümünü kalıcı sil" onConfirm={() => empty.mutate()} />
        )}
      </div>

      {total === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Çöp kutusu boş.</p>}

      {groups.map(({ kind, items }) => {
        if (items.length === 0) return null;
        const Icon = META[kind].icon;
        return (
          <section key={kind}>
            <h2 className="mb-1 text-sm font-semibold text-muted-foreground">{META[kind].label}</h2>
            <ul className="divide-y rounded-lg border bg-card">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">{it.title || "Başlıksız"}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {it.deletedAt &&
                      new Date(it.deletedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      restore(kind, it.id).then(
                        () => toast.success("Geri yüklendi"),
                        (e) => toast.error(e instanceof Error ? e.message : "Geri yüklenemedi."),
                      )
                    }
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Geri yükle
                  </Button>
                  {canPurge && (
                    <ConfirmButton label="Kalıcı sil" onConfirm={() => purge.mutate({ kind, id: it.id })} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
