"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const ws = useWorkspace();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function invite() {
    setBusy(true);
    setError(null);
    const res = await authClient.organization.inviteMember({
      email: email.trim(),
      role,
      organizationId: ws.id,
    });
    setBusy(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "Davet gönderilemedi.");
      return;
    }
    // E-posta sağlayıcısı bağlanana kadar bağlantıyı elle paylaş
    setLink(`${window.location.origin}/davet/${res.data.id}`);
  }

  function reset(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setEmail("");
      setLink(null);
      setError(null);
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Üye davet et</DialogTitle>
          <DialogDescription>{ws.name} alanına yeni bir üye ekle.</DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Davet oluşturuldu. Bu bağlantıyı kişiye gönder (davet edilen e-postayla giriş yapmalı):
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              <Button
                variant="outline"
                size="icon"
                aria-label="Kopyala"
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="inv-email">E-posta</Label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && email && invite()}
                placeholder="kisi@ornek.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-role">Rol</Label>
              <select
                id="inv-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "member" | "admin")}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="member">Üye</option>
                <option value="admin">Yönetici</option>
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={invite} disabled={busy || !email.trim()} className="w-full">
              Davet oluştur
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
