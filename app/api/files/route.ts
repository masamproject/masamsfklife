import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { files, projects } from "@/db/schema";
import { putBlob } from "@/lib/blobs";
import { extOf, FILE_TYPES, MAX_FILE_BYTES, MAX_SVG_BYTES } from "@/lib/files";
import { ActionError, resolveContext } from "@/lib/actions/safe-action";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await resolveContext();
    const form = await req.formData();
    const file = form.get("file");
    const projectIdRaw = form.get("projectId");
    if (!(file instanceof File)) return NextResponse.json({ error: "Dosya yok." }, { status: 400 });

    const type = FILE_TYPES[extOf(file.name)];
    if (!type) {
      return NextResponse.json({ error: "Bu dosya türü desteklenmiyor (Word, Excel, zip yüklenemez)." }, { status: 415 });
    }
    const limit = type === "image/svg+xml" ? MAX_SVG_BYTES : MAX_FILE_BYTES;
    if (file.size > limit) {
      return NextResponse.json({ error: `Dosya çok büyük (en fazla ${limit / 1048576} MB).` }, { status: 413 });
    }

    let projectId: string | null = null;
    if (typeof projectIdRaw === "string" && projectIdRaw) {
      const [p] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectIdRaw), eq(projects.workspaceId, ctx.workspaceId)))
        .limit(1);
      if (!p) return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });
      projectId = p.id;
    }

    const id = randomUUID();
    const blobKey = `${ctx.workspaceId}/${id}`;
    await putBlob(blobKey, await file.arrayBuffer(), { name: file.name });
    const [row] = await db
      .insert(files)
      .values({
        id,
        workspaceId: ctx.workspaceId,
        projectId,
        uploaderId: ctx.userId,
        name: file.name.slice(0, 255),
        size: file.size,
        contentType: type, // istemcinin bildirdiği türe değil, uzantı tablosuna güven
        blobKey,
      })
      .returning();
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error("[files:upload]", e);
    return NextResponse.json({ error: "Yüklenemedi." }, { status: 500 });
  }
}
