import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces } from "@/db/schema";

/**
 * Ödeme webhook'u (Lemon Squeezy biçimi: X-Signature = HMAC-SHA256 hex(raw body)).
 * Checkout'a `checkout[custom][workspace_id]` geçirilir; olay `meta.custom_data.workspace_id` ile gelir.
 * Polar.sh için imza doğrulaması (standard-webhooks) ve olay adları farklıdır;
 * yalnızca `verify` ve `planFor` fonksiyonlarını uyarlamak yeterli.
 */
export const runtime = "nodejs";

function verify(raw: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

const PRO_STATUSES = new Set(["active", "on_trial", "past_due", "cancelled"]); // cancelled: dönem sonuna kadar erişim

function planFor(event: string, status?: string): "pro" | "free" | null {
  switch (event) {
    case "subscription_created":
    case "subscription_resumed":
    case "subscription_unpaused":
    case "subscription_payment_success":
      return "pro";
    case "subscription_updated":
      return status ? (PRO_STATUSES.has(status) ? "pro" : "free") : null;
    case "subscription_expired":
      return "free";
    default:
      return null; // bilinmeyen olayı yok say
  }
}

export async function POST(req: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await req.text();
  if (!verify(raw, req.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: {
    meta?: { event_name?: string; custom_data?: { workspace_id?: string } };
    data?: { attributes?: { status?: string } };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const workspaceId = body.meta?.custom_data?.workspace_id;
  const plan = planFor(body.meta?.event_name ?? "", body.data?.attributes?.status);
  if (!workspaceId || !plan) return NextResponse.json({ ok: true, ignored: true });

  await db.update(workspaces).set({ plan }).where(eq(workspaces.id, workspaceId));
  return NextResponse.json({ ok: true, plan });
}
