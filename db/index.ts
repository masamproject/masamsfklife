import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon Postgres bağlantısı (DATABASE_URL, Vercel Marketplace Neon ekleyince otomatik gelir).
 * Neon HTTP sürücüsü kullanılır; transaction/batch yerine yalnızca ortak sorgu API'si.
 */
function create() {
  const url =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("DATABASE_URL tanımlı değil.");
  return drizzleNeon(neon(url), { schema });
}

type Db = ReturnType<typeof create>;

const globalForDb = globalThis as unknown as { __db?: Db };

/** Lazy: bağlantı ilk sorguda kurulur (build sırasında env olmayabilir). */
export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = (globalForDb.__db ??= create());
    const v = Reflect.get(real as object, prop);
    return typeof v === "function" ? v.bind(real) : v;
  },
});
