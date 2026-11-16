/**
 * drizzle-kit çıktısını (db/migrations/NNNN_x.sql) Netlify Database'in
 * beklediği klasöre (netlify/database/migrations) NNNN+1 önekiyle kopyalar.
 * Netlify 0000 önekini "out of order" sayıyor.
 */
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const src = "db/migrations";
const dest = "netlify/database/migrations";
mkdirSync(dest, { recursive: true });

for (const f of readdirSync(src).filter((n) => n.endsWith(".sql")).sort()) {
  const m = f.match(/^(\d+)_(.+)$/);
  if (!m) continue;
  const name = `${String(Number(m[1]) + 1).padStart(4, "0")}_${m[2]}`;
  copyFileSync(join(src, f), join(dest, name));
  console.log(`${f} -> ${dest}/${name}`);
}
