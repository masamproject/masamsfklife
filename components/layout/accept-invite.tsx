"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function AcceptInvite({ invitationId, email }: { invitationId: string; email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await authClient.organization.acceptInvitation({ invitationId });
    if (res.error) {
      setBusy(false);
      setError(res.error.message ?? "Davet kabul edilemedi.");
      return;
    }
    const orgId = res.data?.invitation?.organizationId;
    if (orgId) await authClient.organization.setActive({ organizationId: orgId });
    router.replace("/pano");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-4 text-center">
      <h1 className="text-xl font-bold">Çalışma alanı daveti</h1>
      <p className="text-sm text-muted-foreground">
        <b>{email}</b> hesabıyla daveti kabul ediyorsun.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={accept} disabled={busy} className="w-full">
        Daveti kabul et
      </Button>
    </div>
  );
}
