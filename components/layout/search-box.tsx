"use client";

import { useQuery } from "@tanstack/react-query";
import { NotebookText, Search, SquareCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Input } from "@/components/ui/input";
import { searchAll } from "@/lib/actions/search";
import { unwrap } from "@/lib/actions/unwrap";

export function SearchBox() {
  const ws = useWorkspace();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // 250ms debounce
  useEffect(() => {
    const t = setTimeout(() => setQ(value.trim()), 250);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["search", ws.id, q],
    queryFn: () => unwrap(searchAll({ q })),
    enabled: q.length > 0,
  });

  const go = (href: string) => {
    setOpen(false);
    setValue("");
    router.push(href);
  };
  const empty = data && data.tasks.length === 0 && data.notes.length === 0;

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Görev ve notlarda ara…"
        className="pl-8"
        aria-label="Ara"
      />
      {open && q && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-96 overflow-auto rounded-lg border bg-popover p-1 shadow-lg">
          {isFetching && !data && <p className="p-3 text-sm text-muted-foreground">Aranıyor…</p>}
          {empty && <p className="p-3 text-sm text-muted-foreground">Sonuç yok.</p>}
          {data?.tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => go(`/pano?card=${t.id}`)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <SquareCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={t.isCompleted ? "truncate line-through" : "truncate"}>{t.title}</span>
            </button>
          ))}
          {data?.notes.map((n) => (
            <button
              key={n.id}
              onClick={() => go(`/notlar?note=${n.id}`)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <NotebookText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{n.title || "Başlıksız not"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
