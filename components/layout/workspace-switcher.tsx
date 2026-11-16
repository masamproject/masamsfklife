"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown, Plus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InviteDialog } from "@/components/layout/invite-dialog";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function WorkspaceSwitcher() {
  const ws = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: orgs } = authClient.useListOrganizations();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(id: string) {
    if (id === ws.id) return;
    await authClient.organization.setActive({ organizationId: id });
    qc.clear();
    router.replace("/pano");
    router.refresh();
  }

  async function create() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError(null);
    const slug = `${n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ekip"}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const res = await authClient.organization.create({ name: n, slug });
    if (res.error || !res.data) {
      setBusy(false);
      setError(res.error?.message ?? "Oluşturulamadı.");
      return;
    }
    await authClient.organization.setActive({ organizationId: res.data.id });
    setBusy(false);
    setCreateOpen(false);
    setName("");
    qc.clear();
    router.replace("/pano");
    router.refresh();
  }

  const canInvite = ws.role === "owner" || ws.role === "admin";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="max-w-[11rem] gap-2 px-2.5">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{ws.name}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Çalışma alanları</DropdownMenuLabel>
          {orgs?.map((o) => (
            <DropdownMenuItem key={o.id} onClick={() => switchTo(o.id)}>
              <span className="flex-1 truncate">{o.name}</span>
              {o.id === ws.id && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Yeni ekip alanı
          </DropdownMenuItem>
          {canInvite && (
            <DropdownMenuItem onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Üye davet et
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni ekip alanı</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Ekip adı"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button onClick={create} disabled={busy || !name.trim()}>
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
