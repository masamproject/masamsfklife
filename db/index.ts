import { getDatabase } from "@netlify/database";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Netlify Database bağlantısı (NETLIFY_DB_URL).
 *  - production/serverless: Neon HTTP sürücüsü
 *  - yerel (netlify dev): pg pool
 * İki sürücünün sorgu API'si aynı; transaction/batch farkı yüzünden
 * kod tarafında yalnızca ortak API kullanılır.
 */
function create() {
  const conn = getDatabase({
    connectionString:
      process.env.NETLIFY_DB_URL ??
      process.env.NETLIFY_DATABASE_URL ??
      process.env.DATABASE_URL,
  });
  if (conn.driver === "serverless") {
    return drizzleNeon(conn.httpClient, { schema });
  }
  return drizzlePg(conn.pool, { schema });
}

type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

const globalForDb = globalThis as unknown as { __db?: Db };

/** Lazy: bağlantı ilk sorguda kurulur (build sırasında env olmayabilir). */
export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = (globalForDb.__db ??= create() as unknown as Db);
    const v = Reflect.get(real as object, prop);
    return typeof v === "function" ? v.bind(real) : v;
  },
});
