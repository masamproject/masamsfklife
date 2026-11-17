import { getStore } from "@netlify/blobs";

const store = () => getStore({ name: "files", consistency: "strong" });

export async function putBlob(key: string, data: ArrayBuffer, metadata: Record<string, string>) {
  await store().set(key, data, { metadata });
}

export async function getBlob(key: string) {
  return store().get(key, { type: "stream" });
}

export async function deleteBlob(key: string) {
  try {
    await store().delete(key);
  } catch {
    /* blob zaten silinmiş olabilir */
  }
}
