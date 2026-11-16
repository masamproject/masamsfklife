import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: (process.env.NETLIFY_DB_URL ??
      process.env.NETLIFY_DATABASE_URL ??
      process.env.DATABASE_URL)!,
  },
});
