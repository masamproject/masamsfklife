"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { FileRow } from "@/components/files/file-row";
import { matches, useFilter } from "@/components/providers/filter-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { TaskRow } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/db/schema";
import { useDataActions, useWorkspaceData, type Data } from "@/lib/hooks/use-data";
import { useUpload } from "@/lib/hooks/use-upload";
import { newNote } from "@/lib/new-note";
import { fmtDay, fmtStamp } from "@/lib/ui";

const itemsOf = (d: Data, pid: string) => ({
  tasks: d.tasks.filter((t) => t.projectId === pid && !t.archivedAt),
  notes: d.notes.filter((n) => n.projectId === pid && !n.archivedAt),
  files: d.files.filter((f) => f.projectId === pid && !f.archivedAt),
});

function SectionHead({ title, extra, children }: { title: string; extra?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2.5">
      <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>
      {extra && <span className="font-mono text-muted-foreground">{extra}</span>}
      <span className="flex-1" />
      {children}
    </div>
  );
}

export function ProjectsView() {
  const { q } = useFilter();
  const { data, isLoading } = useWorkspaceData();
  const a = useDataActions();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  if (isLoading || !data) return <Skeleton className="h-40 w-full max-w-3xl" />;

  const projects = data.projects.filter((p) => !p.archivedAt);
  const id = params.get("id");
  const current = id ? projects.find((p) => p.id === id) : undefined;
  const open = (pid: string | null) => router.replace(pid ? `${pathname}?id=${pid}` : pathname, { scroll: false });

  if (current) return <Detail project={current} data={data} onBack={() => open(null)} />;

  const list = projects.filter((p) => matches(q, p.name, p.description));
  return (
    <div className="max-w-[980px]">
      <h1 className="mb-3.5 text-xl font-semibold tracking-tight">Projeler</h1>
      <form
        className="mb-5 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = name.trim();
          if (!v) return;
          a.addProject(crypto.randomUUID(), v);
          setName("");
          nameRef.current?.focus();
        }}
      >
        <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Yeni proje adı, Enter'a bas" aria-label="Yeni proje adı" className="h-10 min-w-0 flex-[1_1_220px]" />
        <Button type="submit" className="h-10">
          Proje ekle
        </Button>
      </form>
      {projects.length === 0 ? (
        <div className="px-2 py-7 text-center text-muted-foreground">
          <strong className="mb-1 block text-base text-foreground">Henüz proje yok</strong>
          Bir proje oluştur. Sonra görev, toplantı notu ve dosyalarını o projeye bağlarsın.
        </div>
      ) : list.length === 0 ? (
        <div className="px-2 py-7 text-center text-muted-foreground">Eşleşen proje yok.</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {list.map((p) => {
            const it = itemsOf(data, p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => open(p.id)}
                className="flex min-w-0 flex-col gap-1.5 rounded-[10px] border bg-card px-4 py-3.5 text-left hover:border-primary hover:shadow-md"
              >
                <span className="text-[15px] font-semibold [overflow-wrap:anywhere]">{p.name}</span>
                <span className="line-clamp-2 min-h-[21px] text-muted-foreground">{p.description}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {it.tasks.filter((t) => !t.isCompleted).length} açık görev · {it.notes.length} not · {it.files.length} dosya
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detail({ project: p, data, onBack }: { project: Project; data: Data; onBack: () => void }) {
  const ws = useWorkspace();
  const a = useDataActions();
  const router = useRouter();
  const upload = useUpload();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(p.name);
  const [desc, setDesc] = useState(p.description);
  const [task, setTask] = useState("");
  const it = itemsOf(data, p.id);
  const open = it.tasks.filter((t) => !t.isCompleted).sort((x, y) => (x.dueDate?.getTime() ?? Infinity) - (y.dueDate?.getTime() ?? Infinity));
  const done = it.tasks.filter((t) => t.isCompleted);
  const first = data.lists[0];

  return (
    <div className="max-w-[980px]">
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          ← Projeler
        </Button>
        <input
          value={name}
          aria-label="Proje adı"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => (name.trim() && name.trim() !== p.name ? a.patchProject(p.id, { name: name.trim() }) : setName(p.name))}
          className="min-w-0 flex-1 bg-transparent py-0.5 text-[22px] font-semibold tracking-tight"
        />
        <Button variant="outline" size="sm" onClick={() => (onBack(), a.archive("project", p.id))}>
          Arşivle
        </Button>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => (onBack(), a.trash("project", p.id))}>
          Çöpe taşı
        </Button>
      </div>

      <textarea
        value={desc}
        aria-label="Proje açıklaması"
        placeholder="Proje açıklaması, hedef, notlar…"
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => desc !== p.description && a.patchProject(p.id, { description: desc })}
        className="mb-[22px] min-h-16 w-full resize-y rounded-md border bg-card px-2.5 py-2 leading-relaxed"
      />

      <section className="mb-[22px]">
        <SectionHead title="Görevler" extra={`${open.length} açık`} />
        <form
          className="mb-2.5 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = task.trim();
            if (!v || !first) return;
            setTask("");
            a.addTask({ id: crypto.randomUUID(), title: v, listId: first.id, projectId: p.id, position: a.endPosition(data, first.id) });
          }}
        >
          <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Bu projeye görev ekle, Enter'a bas" aria-label="Yeni görev" className="min-w-0 flex-[1_1_220px]" />
          <Button type="submit">Ekle</Button>
        </form>
        {it.tasks.length ? (
          <div className="rounded-lg border bg-card">
            {[...open, ...done].map((t) => (
              <TaskRow key={t.id} task={t} data={data} inProject />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground">Bu projede görev yok.</div>
        )}
      </section>

      <section className="mb-[22px]">
        <SectionHead title="Notlar ve toplantılar">
          {(["meeting", "free"] as const).map((k) => (
            <Button
              key={k}
              variant="outline"
              size="sm"
              onClick={() => {
                const n = newNote(ws, k, { projectId: p.id });
                a.addNote(n);
                router.push(`/toplanti?note=${n.id}`);
              }}
            >
              {k === "meeting" ? "+ Toplantı notu" : "+ Not"}
            </Button>
          ))}
        </SectionHead>
        {it.notes.length ? (
          <div className="rounded-lg border bg-card">
            {[...it.notes]
              .sort((x, y) => y.updatedAt.getTime() - x.updatedAt.getTime())
              .map((n) => (
                <button key={n.id} type="button" onClick={() => router.push(`/toplanti?note=${n.id}`)} className="block w-full border-t px-3 py-[9px] text-left first:border-t-0 hover:bg-background">
                  <div className="font-medium [overflow-wrap:anywhere]">{n.title || (n.type === "meeting" ? "Başlıksız toplantı" : "Başlıksız not")}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {n.type === "meeting" ? `Toplantı · ${n.meetingDate ? fmtDay(n.meetingDate, true) : ""}` : `Not · ${fmtStamp(n.updatedAt)}`}
                  </div>
                </button>
              ))}
          </div>
        ) : (
          <div className="text-muted-foreground">Bu projede not yok.</div>
        )}
      </section>

      <section>
        <SectionHead title="Dosyalar">
          <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
            + Dosya yükle
          </Button>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const f = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = "";
              if (f.length) upload(f, p.id);
            }}
          />
        </SectionHead>
        {it.files.length ? (
          <div className="rounded-lg border bg-card">
            {it.files.map((f) => (
              <FileRow key={f.id} file={f} data={data} inProject />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground">Bu projede dosya yok.</div>
        )}
      </section>
    </div>
  );
}

