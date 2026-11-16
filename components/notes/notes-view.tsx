"use client";

import { CalendarDays, FileText, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NoteEditor } from "@/components/notes/note-editor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Note } from "@/db/schema";
import { MEETING_TEMPLATE, useNoteActions, useNotes } from "@/lib/hooks/use-notes";
import { cn } from "@/lib/utils";

export function NotesView() {
  const { data: notes, isLoading } = useNotes();
  const { create } = useNoteActions();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = params.get("note");
  const selected = notes?.find((n) => n.id === selectedId);

  const open = (id: string | null) =>
    router.replace(id ? `${pathname}?note=${id}` : pathname, { scroll: false });

  function newNote(type: Note["type"]) {
    const id = crypto.randomUUID();
    const now = new Date();
    create({
      id,
      workspaceId: "",
      authorId: "",
      type,
      title: type === "meeting" ? "Toplantı notu" : "",
      content: type === "meeting" ? MEETING_TEMPLATE : "",
      meetingDate: type === "meeting" ? now : null,
      participants: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    open(id);
  }

  return (
    <div className="flex h-full">
      {/* Liste: mobilde bir not seçiliyse gizlenir */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r md:w-72",
          selected ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex gap-2 border-b p-3">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => newNote("free")}>
            <Plus className="mr-1 h-4 w-4" /> Not
          </Button>
          <Button size="sm" className="flex-1" onClick={() => newNote("meeting")}>
            <Plus className="mr-1 h-4 w-4" /> Toplantı
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && <Skeleton className="h-16 w-full" />}
          {notes?.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">Henüz not yok.</p>
          )}
          {notes?.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n.id)}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-accent",
                n.id === selectedId && "bg-accent",
              )}
            >
              {n.type === "meeting" ? (
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{n.title || "Başlıksız not"}</span>
                <span className="block text-xs text-muted-foreground">
                  {new Date(n.updatedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className={cn("min-w-0 flex-1 overflow-y-auto", !selected && "hidden md:block")}>
        {selected ? (
          <div className="h-full">
            <Button variant="ghost" size="sm" className="m-2 md:hidden" onClick={() => open(null)}>
              ← Notlar
            </Button>
            <NoteEditor key={selected.id} note={selected} onDeleted={() => open(null)} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            Bir not seç ya da yeni bir not oluştur.
          </div>
        )}
      </section>
    </div>
  );
}
