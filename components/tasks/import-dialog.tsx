"use client";

import { Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importBoard } from "@/lib/actions/import";
import { unwrap } from "@/lib/actions/unwrap";
import { useDataActions, useWorkspaceData } from "@/lib/hooks/use-data";
import { parseImport } from "@/lib/import-parse";

/** Trello (JSON olarak dışa aktar) veya Masam JSON'u ile pano içe aktarır. */
export function ImportDialog() {
  const { data } = useWorkspaceData();
  const a = useDataActions();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [project, setProject] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const b = parseImport(text);
      const lists = b.lists.filter((l) => l.title.trim()).map((l) => ({ ...l, cards: l.cards.filter((c) => c.title.trim()) }));
      return { ok: true as const, board: { ...b, lists }, cards: lists.reduce((n, l) => n + l.cards.length, 0) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Okunamadı." };
    }
  }, [text]);

  const name = project.trim() || (parsed?.ok ? (parsed.board.name ?? "") : "");

  async function run() {
    if (!parsed?.ok || !name) return;
    setBusy(true);
    try {
      const r = await unwrap(importBoard({ project: name, lists: parsed.board.lists }));
      toast.success(`${r.cards} kart ve ${r.lists} liste içe aktarıldı`);
      a.refreshAll();
      setOpen(false);
      setText("");
      setProject("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "İçe aktarılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-1.5 h-3.5 w-3.5" /> İçe aktar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogTitle>Pano içe aktar</DialogTitle>
        <DialogDescription>
          Trello panosunda Menü, Yazdır ve dışa aktar, JSON olarak dışa aktar yolundan aldığın dosyayı ya da Masam JSON&apos;unu yapıştır. Listeler ve kartlar eklenir, son liste
          &quot;tamamlanan&quot; olur. Aynı panoyu iki kez aktarırsan kartlar tekrar eklenir.
        </DialogDescription>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="imp-project">Proje</Label>
            <Input id="imp-project" list="imp-projects" value={project} onChange={(e) => setProject(e.target.value)} placeholder={parsed?.ok && parsed.board.name ? parsed.board.name : "IoTPazar"} />
            <datalist id="imp-projects">
              {(data?.projects ?? []).filter((p) => !p.archivedAt).map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="imp-json">JSON</Label>
              <Button variant="ghost" size="sm" onClick={() => file.current?.click()}>
                Dosya seç
              </Button>
              <input
                ref={file}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) setText(await f.text());
                }}
              />
            </div>
            <Textarea id="imp-json" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder='{"lists":[{"title":"Yapılacak","cards":[{"title":"İlk kart"}]}]}' className="font-mono text-xs" />
          </div>

          {parsed && (
            <p className={parsed.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
              {parsed.ok ? `${parsed.board.lists.length} liste, ${parsed.cards} kart bulundu.` : parsed.error}
            </p>
          )}

          <Button className="w-full" disabled={!parsed?.ok || !name || busy || parsed.cards === 0} onClick={run}>
            {busy ? "Aktarılıyor…" : "İçe aktar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
