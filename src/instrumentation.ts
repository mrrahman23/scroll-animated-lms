/**
 * Runs once when the server starts:
 * 1. Fills in missing content files in data/ from data-initial/ (shipped in the cPanel package).
 *    Existing files are never overwritten, so content edited in the admin survives redeploys.
 * 2. With DATABASE_URL set, applies database migrations and performs the one-time import of
 *    /data records (see src/lib/db/setup.ts).
 * Problems are logged, not fatal — check the app's stderr.log on cPanel.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  try {
    const { seedContent } = await import("./lib/content-seed");
    await seedContent();
  } catch (err) {
    console.error("[content] seeding data/ failed:", err instanceof Error ? err.message : err);
  }
  if (!process.env.DATABASE_URL) return;
  const { setupDatabase } = await import("./lib/db/setup");
  try {
    await setupDatabase();
  } catch (err) {
    // Drizzle wraps the database error; its `cause` holds MySQL/MariaDB's actual message
    const cause = err instanceof Error && err.cause instanceof Error ? ` — ${err.cause.message}` : "";
    console.error("[db] setup failed:", (err instanceof Error ? err.message : String(err)) + cause);
  }
}
