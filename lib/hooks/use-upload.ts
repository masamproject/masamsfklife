"use client";

import { toast } from "sonner";
import type { FileRow } from "@/db/schema";
import { useDataActions } from "@/lib/hooks/use-data";
import { extOf, FILE_TYPES, MAX_FILE_BYTES, MAX_SVG_BYTES } from "@/lib/files";

/** Dosyaları sırayla yükler; hatalar toast ile gösterilir. */
export function useUpload() {
  const a = useDataActions();
  return async (list: File[] | FileList, projectId: string | null) => {
    for (const file of Array.from(list)) {
      const type = FILE_TYPES[extOf(file.name)];
      if (!type) {
        toast.error(`${file.name}: bu tür desteklenmiyor (Word, Excel, zip yüklenemez)`);
        continue;
      }
      const limit = type === "image/svg+xml" ? MAX_SVG_BYTES : MAX_FILE_BYTES;
      if (file.size > limit) {
        toast.error(`${file.name}: dosya çok büyük (en fazla ${limit / 1048576} MB)`);
        continue;
      }
      const form = new FormData();
      form.set("file", file);
      if (projectId) form.set("projectId", projectId);
      try {
        const res = await fetch("/api/files", { method: "POST", body: form });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "bilinmeyen hata");
        a.addFileLocal(json as FileRow);
      } catch (e) {
        toast.error(`${file.name} yüklenemedi: ${e instanceof Error ? e.message : "hata"}`);
      }
    }
    a.refreshAll();
  };
}
