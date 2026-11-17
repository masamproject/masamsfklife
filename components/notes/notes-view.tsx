"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteTree, sectionOf, type Scope } from "@/components/notes/note-tree";
import { matches, useFilter } from "@/components/providers/filter-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Note } from "@/db/schema";
import { useIsDesktop } from "@/lib/hooks/use-desktop";
import { useDataActions, useWorkspaceData } from "@/lib/hooks/use-data";
import { newNote } from "@/lib/new-note";
import { fmtDay, fmtStamp } from "@/lib/ui";
import { cn } from "@/lib/utils";

type KindFilter = "all" | Note["type"];

export function NotesView() {
  const ws = useWorkspace();
  const { q, pf } = useFilter();
  const { data, isLoading } = useWorkspaceData();
  const a = useDataActions();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const wide = useIsDesktop(1101);
  const [scope, setScope] = useState<Scope>({ nb: "", sec: "" });
  const [kind, setKind] = useState<KindFilter>("all");
  const [focusTitle, setFocusTitle] = useState<string | null>(null);

  const live = useMemo(() => (data?.notes ?? []).filter((n) => !n.archivedAt), [data?.notes]);
  const noteId = params.get("note");

  const visible = useMemo(() => {
    if (!data) return [];
    return live.filter((n) => {
      if (pf && n.projectId !== pf) return false;
      const sec = sectionOf(n, data.sections, data.notebooks);
      if (scope.sec === "none") {
        if (sec) return false;
      } else if (scope.sec) {
        if (sec?.id !== scope.sec) return false;
      } else if (scope.nb) {
        if (sec?.notebookId !== scope.nb) return false;
      }
      if (kind !== "all" && n.type !== kind) return false;
      return matches(q, n.title, n.content, n.tags, n.participants);
    });
  }, [data, live, pf, scope, kind, q]);

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;

  const open = (id: string | null) => router.replace(id ? `${pathname}?note=${id}` : pathname, { scroll: false });
  // Geniş ekranda hiçbiri seçili değilse ilk notu aç
  const selected = live.find((n) => n.id === noteId) ?? (wide ? visible[0] : undefined);

  function defaultSection() {
    if (!data) return null;
    if (scope.sec && scope.sec !== "none") return scope.sec;
    if (scope.nb) return data.sections.find((s) => s.notebookId === scope.nb)?.id ?? null;
    return null;
  }

  function create(type: Note["type"]) {
    const n = newNote(ws, type, { projectId: pf || null, sectionId: defaultSection() });
    const id = n.id;
    a.addNote(n);
    setFocusTitle(id);
    open(id);
  }

  return (
    <div className="grid items-start gap-[18px] min-[1101px]:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={cn("flex flex-col gap-2.5 min-[1101px]:sticky min-[1101px]:top-[76px] min-[1101px]:max-h-[calc(100vh-100px)]", selected && "max-[1100px]:hidden")}>
        <div className="flex flex-wrap gap-1.5">
          <Button onClick={() => create("meeting")}>+ Toplantı notu</Button>
          <Button variant="outline" onClick={() => create("free")}>
            + Not
          </Button>
        </div>
        <div role="group" aria-label="Tür filtresi" className="inline-flex self-start overflow-hidden rounded-md border bg-card">
          {(
            [
              ["all", "Hepsi"],
              ["meeting", "Toplantı"],
              ["free", "Not"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn("px-3 py-1 text-[13px] text-muted-foreground", kind === k && "bg-primary-soft font-medium text-primary")}
            >
              {l}
            </button>
          ))}
        </div>
        <NoteTree notes={live} notebooks={data.notebooks} sections={data.sections} scope={scope} onScope={setScope} />
        <div className="flex min-h-[120px] flex-[1_1_140px] flex-col gap-1 overflow-y-auto">
          {live.length === 0 && (
            <div className="px-2 py-7 text-center text-muted-foreground">
              <strong className="mb-1 block text-base text-foreground">Henüz not yok</strong>
              Toplantı notu veya serbest not ekleyerek başla.
            </div>
          )}
          {live.length > 0 && visible.length === 0 && <div className="px-2 py-7 text-center text-muted-foreground">Eşleşen not yok.</div>}
          {visible.map((n) => {
            const snippet = n.content.split("\n").map((s) => s.trim()).find((s) => s && s !== "-") ?? "";
            const sec = sectionOf(n, data.sections, data.notebooks);
            const proj = n.projectId ? data.projects.find((p) => p.id === n.projectId) : undefined;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => open(n.id)}
                className={cn("block w-full rounded-lg border border-transparent px-[11px] py-[9px] text-left hover:bg-card", n.id === selected?.id && "border-border bg-card shadow-sm")}
              >
                <div className="font-medium [overflow-wrap:anywhere]">{n.title || (n.type === "meeting" ? "Başlıksız toplantı" : "Başlıksız not")}</div>
                {snippet && <div className="line-clamp-1 text-[13px] text-muted-foreground">{snippet}</div>}
                <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] text-muted-foreground">
                  <span>{n.type === "meeting" ? `Toplantı · ${n.meetingDate ? fmtDay(n.meetingDate, true) : ""}` : `Not · ${fmtStamp(n.updatedAt)}`}</span>
                  {sec && <span>{sec.name}</span>}
                  {proj && <span>{proj.name}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className={cn(!selected && "max-[1100px]:hidden")}>
        {selected ? (
          <NoteEditor key={selected.id} note={selected} data={data} autoFocusTitle={focusTitle === selected.id} onBack={() => open(null)} />
        ) : (
          <div className="rounded-[10px] border bg-card p-7 text-center text-muted-foreground">
            <strong className="mb-1 block text-base text-foreground">Bir not seç</strong>
            Soldan bir not aç ya da yeni toplantı notu oluştur.
          </div>
        )}
      </div>
    </div>
  );
}
