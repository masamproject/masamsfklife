import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
import { ActionError, resolveContext } from "@/lib/actions/safe-action";
import { getBlob } from "@/lib/blobs";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await resolveContext();
    const [f] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, params.id), eq(files.workspaceId, ctx.workspaceId)))
      .limit(1);
    if (!f) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

    const stream = await getBlob(f.blobKey);
    if (!stream) return NextResponse.json({ error: "Dosya içeriği yok." }, { status: 404 });

    return new Response(stream as ReadableStream, {
      headers: {
        "Content-Type": f.contentType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,
        // Kullanıcı dosyası (özellikle SVG) komut çalıştıramasın
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error("[files:get]", e);
    return NextResponse.json({ error: "Hata." }, { status: 500 });
  }
}
