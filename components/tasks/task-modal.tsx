"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "@/db/schema";
import { listsFor, useDataActions, useWorkspaceData, type Data } from "@/lib/hooks/use-data";
import { useSaver } from "@/lib/hooks/use-saver";
import { fromDateInput, parseTags, PRIORITY_LABEL, toDateInput } from "@/lib/ui";
import { cn } from "@/lib/utils";

/** ?card=<id> ile açılan görev penceresi; sayfadan ayrılmadan her görünümde açılır. */
export function TaskModal() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.get("card");
  const { data } = useWorkspaceData();
  const task = id ? data?.tasks.find((t) => t.id === id && !t.deletedAt) : undefined;
  const close = () => router.replace(pathname, { scroll: false });

  return (
    <Dialog open={!!id && !!task} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        {task && data && <Body key={task.id} task={task} data={data} onClose={close} />}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={htmlFor} className="font-mono text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Body({ task, data, onClose }: { task: Task; data: Data; onClose: () => void }) {
  const a = useDataActions();
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const [tags, setTags] = useState(task.tags.join(", "));
  const saver = useSaver<Pick<Task, "title" | "description" | "tags">>((p) => a.patchTask(task.id, p));

  // Geri al / rollback gibi dış değişikliklerde yerel taslağı eşitle
  useEffect(() => setTitle(task.title), [task.title]);
  useEffect(() => setDesc(task.description), [task.description]);

  const note = task.noteId ? data.notes.find((n) => n.id === task.noteId && !n.deletedAt) : undefined;
  const projects = data.projects.filter((p) => !p.archivedAt);

  return (
    <div className="space-y-3">
      <DialogTitle asChild>
        <input
          value={title}
          placeholder="Görev başlığı"
          aria-label="Başlık"
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.trim()) saver.set({ title: e.target.value.trim() });
          }}
          className="w-full bg-transparent py-1 pr-6 text-xl font-semibold tracking-tight outline-none"
        />
      </DialogTitle>
      <DialogDescription className="sr-only">Görev ayrıntıları</DialogDescription>

      <div className="flex items-center gap-2">
        <Checkbox
          id="m-done"
          checked={task.isCompleted}
          onCheckedChange={(v) => {
            saver.flush();
            a.setDone(data, task, v === true);
          }}
        />
        <Label htmlFor="m-done">Tamamlandı</Label>
      </div>

      <Textarea
        id="m-desc"
        rows={5}
        value={desc}
        aria-label="Açıklama"
        placeholder="Açıklama, bağlantı, ayrıntı…"
        onChange={(e) => {
          setDesc(e.target.value);
          saver.set({ description: e.target.value });
        }}
        className="min-h-[110px] resize-y leading-relaxed"
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
        <Field label="Liste" htmlFor="m-col">
          <NativeSelect
            id="m-col"
            value={task.listId ?? ""}
            onChange={(e) => {
              saver.flush();
              a.moveTask(task.id, e.target.value, a.endPosition(data, e.target.value, task.id));
            }}
          >
            {(() => {
              // Görevin panosundaki listeler (+ şu an bulunduğu liste farklı kapsamdaysa o da)
              const scope = listsFor(data, task.projectId);
              const cur = data.lists.find((l) => l.id === task.listId);
              return (cur && !scope.some((l) => l.id === cur.id) ? [cur, ...scope] : scope).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ));
            })()}
          </NativeSelect>
        </Field>
        <Field label="Proje" htmlFor="m-proj">
          <NativeSelect
            id="m-proj"
            value={task.projectId ?? ""}
            onChange={(e) => {
              const projectId = e.target.value || null;
              a.patchTask(task.id, { projectId });
              // Yeni projenin panosunda bu liste yoksa ilk listesine taşı
              const scope = listsFor(data, projectId);
              if (scope.length && !scope.some((l) => l.id === task.listId)) {
                a.moveTask(task.id, scope[0].id, a.endPosition(data, scope[0].id, task.id));
              }
            }}
          >
            <option value="">Proje yok</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Son tarih" htmlFor="m-due">
          <Input id="m-due" type="date" value={toDateInput(task.dueDate)} onChange={(e) => a.patchTask(task.id, { dueDate: fromDateInput(e.target.value) })} />
        </Field>
        <Field label="Öncelik" htmlFor="m-pri">
          <NativeSelect id="m-pri" value={task.priority ?? ""} onChange={(e) => a.patchTask(task.id, { priority: (e.target.value || null) as Task["priority"] })}>
            <option value="">Yok</option>
            {(Object.keys(PRIORITY_LABEL) as (keyof typeof PRIORITY_LABEL)[]).map((k) => (
              <option key={k} value={k}>
                {PRIORITY_LABEL[k]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Atanan" htmlFor="m-asg">
          <NativeSelect id="m-asg" value={task.assigneeId ?? ""} onChange={(e) => a.patchTask(task.id, { assigneeId: e.target.value || null })}>
            <option value="">Atanmamış</option>
            {data.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Etiketler" htmlFor="m-tags">
          <Input
            id="m-tags"
            value={tags}
            placeholder="iş, evrak, ev"
            onChange={(e) => {
              setTags(e.target.value);
              saver.set({ tags: parseTags(e.target.value) });
            }}
          />
        </Field>
      </div>

      {note && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/toplanti?note=${note.id}`}>Bağlı not: {note.title || "Başlıksız"}</Link>
        </Button>
      )}

      <div className={cn("flex flex-wrap items-center justify-between gap-2 pt-2")}>
        <span className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              saver.flush();
              onClose();
              a.archive("task", task.id);
            }}
          >
            Arşivle
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              saver.discard();
              onClose();
              a.trash("task", task.id);
            }}
          >
            Çöpe taşı
          </Button>
        </span>
        <Button onClick={onClose}>Bitti</Button>
      </div>
    </div>
  );
}
