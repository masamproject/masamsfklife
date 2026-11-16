"use client";

import { Check, Link2, Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Note } from "@/db/schema";
import { parseActionItems } from "@/lib/actions-items";
import { useDataActions, useWorkspaceData } from "@/lib/hooks/use-data";
import { useNoteActions } from "@/lib/hooks/use-notes";
import { fromDateInput, toDateInput } from "@/lib/ui";

type Draft = { title: string; content: string; meetingDate: Date | null; participants: string[] };
const DEBOUNCE_MS = 500;

export function NoteEditor({ note, onDeleted }: { note: Note; onDeleted: () => void }) {
  const { save, remove } = useNoteActions();
  const data = useWorkspaceData().data;
  const a = useDataActions();

  const [draft, setDraft] = useState<Draft>({
    title: note.title,
    content: note.content,
    meetingDate: note.meetingDate,
    participants: note.participants,
  });
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [person, setPerson] = useState("");

  // Auto-save (500ms debounce); sayfadan/nottan çıkarken bekleyen yazıyı yut
  const dirty = useRef(false);
  const latest = useRef(draft);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  latest.current = draft;

  const flush = async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setStatus("saving");
    try {
      await save(note.id, latest.current);
      setStatus("saved");
    } catch (e) {
      dirty.current = true;
      setStatus("error");
      toast.error(e instanceof Error ? e.message : "Kaydedilemedi.");
    }
  };

  const edit = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    dirty.current = true;
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  };

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      void flush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Aksiyon maddeleri ↔ bu nota bağlı görevler
  const items = useMemo(() => parseActionItems(draft.content), [draft.content]);
  const linked = (data?.tasks ?? []).filter((t) => t.noteId === note.id);
  const firstList = data?.lists[0];

  const toTask = (title: string) => {
    if (!data) return;
    a.addTask({
      id: crypto.randomUUID(),
      title,
      listId: firstList?.id ?? null,
      noteId: note.id,
      position: a.endPosition(firstList?.id ?? null, data.tasks),
    });
    toast.success("Göreve çevrildi");
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-3 p-3 sm:p-6">
      <div className="flex items-center gap-2">
        <input
          value={draft.title}
          onChange={(e) => edit({ title: e.target.value })}
          placeholder={note.type === "meeting" ? "Toplantı başlığı" : "Başlık"}
          className="min-w-0 flex-1 bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground/60"
        />
        <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
          {status === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Kaydediliyor
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="h-3 w-3" /> Kaydedildi
            </>
          )}
          {status === "error" && <span className="text-destructive">Kaydedilemedi</span>}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notu sil"
          onClick={async () => {
            clearTimeout(timer.current);
            dirty.current = false;
            remove(note.id);
            onDeleted();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {note.type === "meeting" && (
        <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[auto_1fr]">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Tarih</span>
            <Input
              type="date"
              className="w-auto"
              value={toDateInput(draft.meetingDate)}
              onChange={(e) => edit({ meetingDate: fromDateInput(e.target.value) })}
            />
          </label>
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Katılımcılar</span>
            {draft.participants.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-2 pr-1 text-xs">
                {p}
                <button
                  aria-label={`${p} katılımcısını kaldır`}
                  onClick={() => edit({ participants: draft.participants.filter((x) => x !== p) })}
                  className="rounded-full p-0.5 hover:bg-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && person.trim()) {
                  e.preventDefault();
                  if (!draft.participants.includes(person.trim())) {
                    edit({ participants: [...draft.participants, person.trim()] });
                  }
                  setPerson("");
                }
              }}
              placeholder="İsim ekle (Enter)"
              className="min-w-28 flex-1 bg-transparent px-1 py-0.5 outline-none"
            />
          </div>
        </div>
      )}

      <textarea
        value={draft.content}
        onChange={(e) => edit({ content: e.target.value })}
        placeholder="Yazmaya başla… (Markdown desteklenir)"
        className="min-h-[16rem] w-full flex-1 resize-none rounded-lg border bg-background p-3 font-mono text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

      {note.type === "meeting" && (
        <section className="rounded-lg border p-3">
          <h3 className="mb-2 text-sm font-semibold">Aksiyonlar</h3>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              &quot;## Aksiyonlar&quot; başlığının altına &quot;- madde&quot; satırları ekle.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((text, i) => {
                const task = linked.find((t) => t.title === text);
                return (
                  <li key={`${i}-${text}`} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{text}</span>
                    {task ? (
                      <Link
                        href={`/pano?card=${task.id}`}
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        <Link2 className="h-3 w-3" /> Görevde
                      </Link>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => toTask(text)}>
                        Göreve Çevir
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
