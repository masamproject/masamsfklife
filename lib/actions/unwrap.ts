import type { ActionResult } from "@/lib/actions/safe-action";

/** Server action sonucunu açar; hata varsa throw eder (TanStack Query onError/rollback için). */
export async function unwrap<T>(p: Promise<ActionResult<T>>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.error);
  return r.data;
}
