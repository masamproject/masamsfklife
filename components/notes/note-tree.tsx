"use client";

import { generateKeyBetween } from "fractional-indexing";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Note, Notebook, Section } from "@/db/schema";
import { useDataActions } from "@/lib/hooks/use-data";
import { PALETTE } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type Scope = { nb: string; sec: string };

/** Notun geçerli (silinmemiş) bölümü; yoksa boş. */
export function sectionOf(n: Pick<Note, "sectionId">, sections: Section[], notebooks: Notebook[]) {
  const s = n.sectionId ? sections.find((x) => x.id === n.sectionId) : undefined;
  return s && notebooks.some((nb) => nb.id === s.notebookId) ? s : undefined;
}

type Edit = { type: "nb" | "sec"; id: string } | null;
type Add = { type: "nb" } | { type: "sec"; nb: string } | null;

export function NoteTree({
  notes,
  notebooks,
  sections,
  scope,
  onScope,
}: {
  notes: Note[];
  notebooks: Notebook[];
  sections: Section[];
  scope: Scope;
  onScope: (s: Scope) => void;
}) {
  const a = useDataActions();
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<Edit>(null);
  const [add, setAdd] = useState<Add>(null);

  const counts: Record<string, number> = {};
  for (const n of notes) {
    const k = sectionOf(n, sections, notebooks)?.id ?? "none";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  const secsOf = (nb: string) => sections.filter((s) => s.notebookId === nb);
  const isEdit = (t: "nb" | "sec", id: string) => edit?.type === t && edit.id === id;
  const toggleEdit = (t: "nb" | "sec", id: string) => setEdit(isEdit(t, id) ? null : { type: t, id });

  const row = "flex items-center gap-0.5 rounded-md hover:bg-muted";
  const rowSel = "bg-card font-semibold shadow-[inset_0_0_0_1px_hsl(var(--border))]";
  const main = "flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5 text-left";

  const newNotebook = (name: string) => {
    const id = crypto.randomUUID();
    a.addNotebook({ id, name, color: PALETTE[notebooks.length % PALETTE.length], position: generateKeyBetween(notebooks.at(-1)?.position ?? null, null) });
    setAdd(null);
    onScope({ nb: id, sec: "" });
  };
  const newSection = (nb: string, name: string) => {
    const list = secsOf(nb);
    const id = crypto.randomUUID();
    a.addSection({ id, notebookId: nb, name, color: PALETTE[list.length % PALETTE.length], position: generateKeyBetween(list.at(-1)?.position ?? null, null) });
    setAdd(null);
    setClosed((c) => {
      const n = new Set(c);
      n.delete(nb);
      return n;
    });
    onScope({ nb, sec: id });
  };

  const panel = (type: "nb" | "sec", item: Notebook | Section) => (
    <div className="my-0.5 ml-6 mr-1 flex flex-col items-start gap-2 rounded-lg border bg-card p-2">
      <input
        defaultValue={item.name}
        aria-label="Ad"
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (!v || v === item.name) return;
          if (type === "nb") a.patchNotebook(item.id, { name: v });
          else a.patchSection(item.id, { name: v });
        }}
        className="w-full rounded-md border bg-background px-2 py-1.5"
      />
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={`Renk ${i + 1}`}
            style={{ background: c }}
            onClick={() => {
              if (type === "nb") a.patchNotebook(item.id, { color: c });
              else a.patchSection(item.id, { color: c });
            }}
            className={cn("h-5 w-5 rounded-full border-2 border-transparent p-0", item.color === c && "border-foreground")}
          />
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => {
          setEdit(null);
          if (type === "nb" && scope.nb === item.id) onScope({ nb: "", sec: "" });
          if (type === "sec" && scope.sec === item.id) onScope({ nb: scope.nb, sec: "" });
          a.trash(type === "nb" ? "notebook" : "section", item.id);
        }}
      >
        Çöpe taşı
      </Button>
    </div>
  );

  const form = (onSubmit: (v: string) => void, placeholder: string, indent: boolean) => (
    <form
      className={indent ? "py-1 pl-[30px] pr-2" : "px-2 py-1"}
      onSubmit={(e) => {
        e.preventDefault();
        const v = (new FormData(e.currentTarget).get("name") as string).trim();
        if (v) onSubmit(v);
        else setAdd(null);
      }}
    >
      <input
        autoFocus
        name="name"
        placeholder={placeholder}
        aria-label={placeholder}
        onKeyDown={(e) => e.key === "Escape" && setAdd(null)}
        className="w-full rounded-md border border-primary bg-card px-2 py-1.5 outline-none"
      />
    </form>
  );

  const allSel = !scope.nb && !scope.sec;
  return (
    <div className="max-h-[46vh] overflow-y-auto border-b pb-2">
      <div className={cn(row, allSel && rowSel)}>
        <button type="button" className={main} onClick={() => onScope({ nb: "", sec: "" })}>
          <span className="min-w-0 flex-1 truncate">Tüm notlar</span>
          <span className="font-mono text-[11px] font-medium text-muted-foreground">{notes.length}</span>
        </button>
      </div>

      {notebooks.map((nb) => {
        const open = !closed.has(nb.id);
        const secs = secsOf(nb.id);
        const total = secs.reduce((s, x) => s + (counts[x.id] ?? 0), 0);
        return (
          <div key={nb.id}>
            <div className={cn(row, "group", scope.nb === nb.id && !scope.sec && rowSel)}>
              <button
                type="button"
                aria-label={open ? "Daralt" : "Genişlet"}
                aria-expanded={open}
                className="w-[22px] py-1 text-muted-foreground"
                onClick={() =>
                  setClosed((c) => {
                    const n = new Set(c);
                    if (open) n.add(nb.id);
                    else n.delete(nb.id);
                    return n;
                  })
                }
              >
                {open ? "▾" : "▸"}
              </button>
              <button
                type="button"
                className={main}
                onClick={() => {
                  setClosed((c) => {
                    const n = new Set(c);
                    n.delete(nb.id);
                    return n;
                  });
                  onScope({ nb: nb.id, sec: "" });
                }}
              >
                <span className="h-4 w-4 shrink-0 rounded" style={{ background: nb.color }} />
                <span className="min-w-0 flex-1 truncate">{nb.name}</span>
                <span className="font-mono text-[11px] font-medium text-muted-foreground">{total}</span>
              </button>
              <button
                type="button"
                aria-label="Düzenle"
                onClick={() => toggleEdit("nb", nb.id)}
                className="rounded px-2 py-0.5 font-semibold text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              >
                …
              </button>
            </div>
            {isEdit("nb", nb.id) && panel("nb", nb)}
            {open && (
              <>
                {secs.map((s) => (
                  <div key={s.id}>
                    <div className={cn(row, "group pl-6", scope.sec === s.id && rowSel)}>
                      <button type="button" className={main} onClick={() => onScope({ nb: nb.id, sec: s.id })}>
                        <span className="h-4 w-1 shrink-0 rounded-sm" style={{ background: s.color }} />
                        <span className="min-w-0 flex-1 truncate">{s.name}</span>
                        <span className="font-mono text-[11px] font-medium text-muted-foreground">{counts[s.id] ?? 0}</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Düzenle"
                        onClick={() => toggleEdit("sec", s.id)}
                        className="rounded px-2 py-0.5 font-semibold text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                      >
                        …
                      </button>
                    </div>
                    {isEdit("sec", s.id) && panel("sec", s)}
                  </div>
                ))}
                {add?.type === "sec" && add.nb === nb.id ? (
                  form((v) => newSection(nb.id, v), "Bölüm adı, Enter'a bas", true)
                ) : (
                  <button
                    type="button"
                    onClick={() => setAdd({ type: "sec", nb: nb.id })}
                    className="block w-full rounded-md py-1 pl-[30px] pr-2 text-left text-[13px] text-primary hover:bg-muted"
                  >
                    + Yeni Bölüm
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}

      {counts.none ? (
        <div className={cn(row, scope.sec === "none" && rowSel)}>
          <button type="button" className={main} onClick={() => onScope({ nb: "", sec: "none" })}>
            <span className="min-w-0 flex-1 truncate">Bölümsüz notlar</span>
            <span className="font-mono text-[11px] font-medium text-muted-foreground">{counts.none}</span>
          </button>
        </div>
      ) : null}

      {add?.type === "nb" ? (
        form(newNotebook, "Defter adı, Enter'a bas", false)
      ) : (
        <button
          type="button"
          onClick={() => setAdd({ type: "nb" })}
          className="mt-1 block w-full rounded-md px-2 py-1 text-left text-[13px] text-primary hover:bg-muted"
        >
          + Yeni Defter
        </button>
      )}
    </div>
  );
}
