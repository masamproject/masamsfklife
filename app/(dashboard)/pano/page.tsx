import { getActiveWorkspace } from "@/lib/actions/workspace";
import { requireSession } from "@/lib/session";

export default async function PanoPage() {
  const session = await requireSession();
  const ws = await getActiveWorkspace();
  return (
    <div className="space-y-2 p-8">
      <h1 className="text-xl font-semibold">Merhaba, {session.user.name}</h1>
      <p className="text-muted-foreground">
        Aktif workspace: {ws.ok ? `${ws.data.name} (${ws.data.role})` : ws.error}
      </p>
      <p className="text-sm text-muted-foreground">Pano — Aşama 4</p>
    </div>
  );
}
