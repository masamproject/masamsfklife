"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { FileRow as F } from "@/db/schema";
import { extOf } from "@/lib/files";
import { useDataActions, type Data } from "@/lib/hooks/use-data";
import { fmtSize, fmtStamp } from "@/lib/ui";

export function FileRow({ file, data, inProject }: { file: F; data: Data; inProject: boolean }) {
  const a = useDataActions();
  const url = `/api/files/${file.id}`;
  const isImage = file.contentType.startsWith("image/");
  return (
    <div className="flex items-center gap-2.5 border-t px-3 py-[9px] first:border-t-0">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" className="h-[38px] w-[38px] shrink-0 rounded-md bg-muted object-cover" />
      ) : (
        <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-muted font-mono text-[11px] font-medium uppercase text-muted-foreground">
          {(extOf(file.name) || "dosya").slice(0, 4)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground [overflow-wrap:anywhere] hover:text-primary hover:underline">
          {file.name}
        </a>
        <div className="font-mono text-xs text-muted-foreground">
          {fmtSize(file.size)} · {fmtStamp(file.createdAt)}
        </div>
      </div>
      {!inProject && (
        <NativeSelect
          aria-label="Proje"
          value={file.projectId ?? ""}
          onChange={(e) => a.patchFile(file.id, e.target.value || null)}
          className="h-8 w-auto max-w-[150px]"
        >
          <option value="">Proje yok</option>
          {data.projects
            .filter((p) => !p.archivedAt)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </NativeSelect>
      )}
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => a.archive("file", file.id)}>
        Arşivle
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Çöpe taşı" title="Çöpe taşı" onClick={() => a.trash("file", file.id)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
