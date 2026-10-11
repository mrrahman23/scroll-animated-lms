import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  // Only needed for `drizzle-kit studio` / `push`; `generate` works offline.
  dbCredentials: { url: process.env.DATABASE_URL ?? "mysql://localhost/nyti" },
});
