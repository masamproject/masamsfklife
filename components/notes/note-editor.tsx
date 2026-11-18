"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Note, NoteAction } from "@/db/schema";
import { firstListFor, useDataActions, type Data } from "@/lib/hooks/use-data";
import { useSaver } from "@/lib/hooks/use-saver";
import { fmtStamp, fromDateInput, parseTags, toDateInput } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const MEETING_TEMPLATE = "Gündem\n- \n\nNotlar\n\n\nKararlar\n- \n";

type Patch = Pick<Note, "type" | "title" | "content" | "meetingDate" | "participants" | "tags" | "sectionId" | "projectId"> & {
  actions: NoteAction[];
};

function Field({ label, htmlFor, grow, children }: { label: string; htmlFor: string; grow?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", grow && "flex-[1_1_200px]")}>
      <Label htmlFor={htmlFor} className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function NoteEditor({ note, data, onBack, autoFocusTitle }: { note: Note; data: Data; onBack: () => void; autoFocusTitle: boolean }) {
  const a = useDataActions();
  const router = useRouter();
  const saver = useSaver<Patch>((p) => a.patchNote(note.id, p));

  // Yerel taslak: yazarken önbellek yenilemesi imleci bozmasın diye not başına bir kez başlatılır
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [kind, setKind] = useState(note.type);
  const [attendees, setAttendees] = useState(note.participants.join(", "));
  const [tags, setTags] = useState(note.tags.join(", "));
  const [actions, setActions] = useState<NoteAction[]>(note.actions);
  const [newAction, setNewAction] = useState("");
  const isMeeting = kind === "meeting";

  const saveActions = (next: NoteAction[]) => {
    setActions(next);
    saver.set({ actions: next }, 0);
  };

  const changeKind = (k: Note["type"]) => {
    if (k === kind) return;
    setKind(k);
    const p: Partial<Patch> = { type: k };
    if (k === "meeting" && !content.trim()) {
      setContent(MEETING_TEMPLATE);
      p.content = MEETING_TEMPLATE;
    }
    saver.set(p, 0);
  };

  const toTask = (act: NoteAction) => {
    const first = firstListFor(data, note.projectId);
    if (!act.text.trim() || !first) return;
    const taskId = crypto.randomUUID();
    a.addTask({ id: taskId, title: act.text.trim(), listId: first.id, noteId: note.id, projectId: note.projectId, position: a.endPosition(data, first.id) });
    saveActions(actions.map((x) => (x.id === act.id ? { ...x, taskId } : x)));
    toast.success(`Göreve çevrildi: Görevler > ${first.title}`);
  };

  const projects = data.projects.filter((p) => !p.archivedAt);

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] min-w-0 flex-1 flex-col rounded-[10px] border bg-card p-3.5 min-[1101px]:px-5 min-[1101px]:py-[18px]">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="min-[1101px]:hidden" onClick={() => (saver.flush(), onBack())}>
          ← Notlar
        </Button>
        <div role="group" aria-label="Tür" className="inline-flex overflow-hidden rounded-md border bg-card">
          {(["free", "meeting"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => changeKind(k)}
              className={cn("px-3 py-1 text-[13px] text-muted-foreground", kind === k && "bg-primary-soft font-medium text-primary")}
            >
              {k === "free" ? "Not" : "Toplantı"}
            </button>
          ))}
        </div>
      </div>

      <input
        autoFocus={autoFocusTitle}
        value={title}
        aria-label="Başlık"
        placeholder={isMeeting ? "Toplantı başlığı" : "Başlık"}
        onChange={(e) => {
          setTitle(e.target.value);
          saver.set({ title: e.target.value });
        }}
        className="w-full bg-transparent py-1 text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
      />

      {isMeeting && (
        <div className="my-2 mb-3 flex flex-wrap gap-2.5">
          <Field label="Tarih" htmlFor="n-date">
            <Input id="n-date" type="date" value={toDateInput(note.meetingDate)} onChange={(e) => saver.set({ meetingDate: fromDateInput(e.target.value) }, 0)} />
          </Field>
          <Field label="Katılımcılar" htmlFor="n-att" grow>
            <Input
              id="n-att"
              value={attendees}
              placeholder="Ayşe, Mehmet, …"
              onChange={(e) => {
                setAttendees(e.target.value);
                saver.set({ participants: parseTags(e.target.value) });
              }}
            />
          </Field>
        </div>
      )}

      <textarea
        id="n-body"
        value={content}
        aria-label="Not metni"
        placeholder={isMeeting ? "Toplantı notlarını yaz…" : "Yazmaya başla…"}
        onChange={(e) => {
          setContent(e.target.value);
          saver.set({ content: e.target.value });
        }}
        className="min-h-[260px] w-full flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-[1.65] outline-none"
      />

      {isMeeting && (
        <div>
          <div className="mb-1.5 mt-4 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">Aksiyonlar</div>
          {actions.map((act, i) => {
            const task = act.taskId ? data.tasks.find((t) => t.id === act.taskId && !t.deletedAt) : undefined;
            return (
              <div key={act.id} className="flex items-center gap-2 py-1">
                <input
                  value={act.text}
                  aria-label={`Aksiyon ${i + 1}`}
                  onChange={(e) => saveActions(actions.map((x) => (x.id === act.id ? { ...x, text: e.target.value } : x)))}
                  className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5"
                />
                {task ? (
                  <Button variant="outline" size="sm" onClick={() => router.push(`/gorevler?card=${task.id}`)}>
                    {task.isCompleted ? "Görev tamamlandı" : "Görevi aç"}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => toTask(act)}>
                    Göreve çevir
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Aksiyonu sil" onClick={() => saveActions(actions.filter((x) => x.id !== act.id))}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
          <form
            className="flex gap-2 py-1"
            onSubmit={(e) => {
              e.preventDefault();
              const v = newAction.trim();
              if (!v) return;
              setNewAction("");
              saveActions([...actions, { id: crypto.randomUUID(), text: v, taskId: "" }]);
            }}
          >
            <input
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="Aksiyon ekle, Enter'a bas"
              aria-label="Yeni aksiyon"
              className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5"
            />
          </form>
        </div>
      )}

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <Field label="Bölüm" htmlFor="n-sec">
          <NativeSelect id="n-sec" value={note.sectionId && data.sections.some((s) => s.id === note.sectionId) ? note.sectionId : ""} onChange={(e) => saver.set({ sectionId: e.target.value || null }, 0)}>
            <option value="">Bölümsüz</option>
            {data.notebooks.map((nb) => (
              <optgroup key={nb.id} label={nb.name}>
                {data.sections
                  .filter((s) => s.notebookId === nb.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Proje" htmlFor="n-proj">
          <NativeSelect id="n-proj" value={note.projectId ?? ""} onChange={(e) => saver.set({ projectId: e.target.value || null }, 0)}>
            <option value="">Proje yok</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Etiketler" htmlFor="n-tags" grow>
          <Input
            id="n-tags"
            value={tags}
            placeholder="proje, müşteri"
            onChange={(e) => {
              setTags(e.target.value);
              saver.set({ tags: parseTags(e.target.value) });
            }}
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t pt-3">
        <span className="font-mono text-xs text-muted-foreground">Oluşturuldu {fmtStamp(note.createdAt)}</span>
        <span className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              saver.flush();
              a.archive("note", note.id);
            }}
          >
            Arşivle
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              saver.flush();
              a.trash("note", note.id);
            }}
          >
            Çöpe taşı
          </Button>
        </span>
      </div>
    </div>
  );
}
