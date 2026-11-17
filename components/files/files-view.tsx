"use client";

import { useRef, useState } from "react";
import { FileRow } from "@/components/files/file-row";
import { matches, useFilter } from "@/components/providers/filter-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceData } from "@/lib/hooks/use-data";
import { useUpload } from "@/lib/hooks/use-upload";
import { cn } from "@/lib/utils";

export function FilesView() {
  const { q, pf } = useFilter();
  const { data, isLoading } = useWorkspaceData();
  const upload = useUpload();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  if (isLoading || !data) return <Skeleton className="h-40 w-full max-w-3xl" />;
  const all = data.files.filter((f) => !f.archivedAt);
  const vis = all.filter((f) => (!pf || f.projectId === pf) && matches(q, f.name));

  return (
    <div className="max-w-[760px]">
      <h1 className="mb-3.5 text-xl font-semibold tracking-tight">Dosyalar</h1>
      <div
        onDragOver={(e) => {
          if ([...e.dataTransfer.types].includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files, pf || null);
        }}
        className={cn("mb-2 rounded-[10px] border-[1.5px] border-dashed bg-card p-[22px] text-center text-muted-foreground", over && "border-primary bg-primary-soft text-primary")}
      >
        Dosyaları buraya sürükle
        <br />
        <Button className="mt-2" onClick={() => input.current?.click()}>
          Dosya seç
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const f = e.target.files ? Array.from(e.target.files) : [];
            e.target.value = "";
            if (f.length) upload(f, pf || null);
          }}
        />
      </div>
      <p className="mb-[18px] text-xs text-muted-foreground">
        Görsel (PNG, JPG, GIF, WebP, SVG), PDF, video (MP4, WebM) ve metin (TXT, MD, CSV, JSON) yüklenir. Dosya başına en fazla 5 MB. Word, Excel, PowerPoint ve zip şimdilik yüklenemez.
      </p>
      {all.length === 0 ? (
        <div className="px-2 py-7 text-center text-muted-foreground">
          <strong className="mb-1 block text-base text-foreground">Henüz dosya yok</strong>
          Yüklediğin dosyalar burada listelenir, istersen bir projeye bağlarsın.
        </div>
      ) : vis.length === 0 ? (
        <div className="px-2 py-7 text-center text-muted-foreground">Eşleşen dosya yok.</div>
      ) : (
        <div className="rounded-lg border bg-card">
          {vis.map((f) => (
            <FileRow key={f.id} file={f} data={data} inProject={false} />
          ))}
        </div>
      )}
    </div>
  );
}
