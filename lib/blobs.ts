import { del, get, put } from "@vercel/blob";

/** Dosya içerikleri Vercel Blob'da (private store) tutulur; erişim /api/files/[id] üzerinden yetkili. */
export async function putBlob(key: string, data: ArrayBuffer, contentType?: string) {
  await put(key, data, {
    access: "private",
    addRandomSuffix: false,
    contentType,
  });
}

export async function getBlob(key: string) {
  const res = await get(key, { access: "private" });
  return res && res.statusCode === 200 ? res.stream : null;
}

export async function deleteBlob(key: string) {
  try {
    await del(key);
  } catch {
    /* blob zaten silinmiş olabilir */
  }
}
