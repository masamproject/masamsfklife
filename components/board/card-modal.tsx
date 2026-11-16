"use client";

import { ExternalLink, Trash2, X } from "lucide-react";
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
import { useDataActions, useWorkspaceData } from "@/lib/hooks/use-data";
import { fromDateInput, PRIORITY_LABEL, tagColor, toDateInput } from "@/lib/ui";
import { cn } from "@/lib/utils";

/** ?card=<id> ile açılan Trello tarzı kart detayı. Sayfadan ayrılmaz. */
export function CardModal() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.get("card");
  const { data } = useWorkspaceData();
  const task = id ? data?.tasks.find((t) => t.id === id) : undefined;

  const close = () => router.replace(pathname, { scroll: false });

  return (
    <Dialog open={!!id && !!task} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {task && data && <CardBody key={task.id} task={task} data={data} onClose={close} />}
      </DialogContent>
    </Dialog>
  );
}

function CardBody({
  task,
  data,
  onClose,
}: {
  task: Task;
  data: NonNullable<ReturnType<typeof useWorkspaceData>["data"]>;
  onClose: () => void;
}) {
  const a = useDataActions();
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const [tagInput, setTagInput] = useState("");

  // Başka yerden (geri alma, rollback) değişirse yerel taslağı senkronla
  useEffect(() => setTitle(task.title), [task.title]);
  useEffect(() => setDesc(task.description), [task.description]);

  const commitTitle = () => {
    const t = title.trim();
    if (t && t !== task.title) a.patchTask({ id: task.id, title: t });
    else setTitle(task.title);
  };
  const addTag = () => {
    const t = tagInput.trim().replace(/,$/, "");
    setTagInput("");
    if (t && !task.tags.includes(t) && task.tags.length < 20) {
      a.patchTask({ id: task.id, tags: [...task.tags, t] });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 pr-6">
        <Checkbox
          className="mt-2.5"
          checked={task.isCompleted}
          onCheckedChange={(v) => a.patchTask({ id: task.id, isCompleted: v === true })}
          aria-label="Tamamlandı"
        />
        <DialogTitle asChild>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className={cn(
              "w-full rounded border border-transparent bg-transparent px-2 py-1 text-xl font-semibold outline-none hover:border-input focus:border-input",
              task.isCompleted && "line-through opacity-60",
            )}
          />
        </DialogTitle>
      </div>
      <DialogDescription className="sr-only">Kart ayrıntıları</DialogDescription>

      {task.noteId && (
        <Link
          href={`/notlar?note=${task.noteId}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Kaynak Nota Git
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Liste</Label>
          <NativeSelect
            value={task.listId ?? ""}
            onChange={(e) => {
              const listId = e.target.value;
              if (listId && listId !== task.listId) {
                a.moveTask({
                  id: task.id,
                  listId,
                  position: a.endPosition(
                    listId,
                    data.tasks.filter((t) => t.id !== task.id),
                  ),
                });
              }
            }}
          >
            {!task.listId && <option value="">Listesiz</option>}
            {data.lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>Atanan</Label>
          <NativeSelect
            value={task.assigneeId ?? ""}
            onChange={(e) => a.patchTask({ id: task.id, assigneeId: e.target.value || null })}
          >
            <option value="">Atanmamış</option>
            {data.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>Son tarih</Label>
          <div className="flex gap-1">
            <Input
              type="date"
              value={toDateInput(task.dueDate)}
              onChange={(e) => a.patchTask({ id: task.id, dueDate: fromDateInput(e.target.value) })}
            />
            {task.dueDate && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Tarihi kaldır"
                onClick={() => a.patchTask({ id: task.id, dueDate: null })}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Öncelik</Label>
          <NativeSelect
            value={task.priority}
            onChange={(e) => a.patchTask({ id: task.id, priority: e.target.value as Task["priority"] })}
          >
            {(Object.keys(PRIORITY_LABEL) as Task["priority"][]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Etiketler</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {task.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-2 pr-1 text-xs"
            >
              <span className={cn("h-2 w-2 rounded-full", tagColor(t))} />
              {t}
              <button
                aria-label={`${t} etiketini kaldır`}
                onClick={() => a.patchTask({ id: task.id, tags: task.tags.filter((x) => x !== t) })}
                className="rounded-full p-0.5 hover:bg-background"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="Etiket ekle…"
            className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Açıklama</Label>
        <Textarea
          rows={5}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => desc !== task.description && a.patchTask({ id: task.id, description: desc })}
          placeholder="Ayrıntı ekle…"
        />
      </div>

      <div className="flex justify-end border-t pt-3">
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            a.removeTask({ id: task.id });
            onClose();
          }}
        >
          <Trash2 className="mr-1.5 h-4 w-4" /> Sil
        </Button>
      </div>
    </div>
  );
}
