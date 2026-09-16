import { Pool } from "pg";

/**
 * Singleton lazy pool for the doctor portal Postgres database.
 *
 * The original route handlers each instantiated a `Pool` per request and
 * called `pool.end()` in `finally`. That's fine for correctness but it
 * disables connection pooling entirely. Medusa owns the process lifecycle —
 * we should keep one pool for the life of the worker.
 */
let _pool: Pool | null = null;

/**
 * Resolve the connection string. Prefers `DOCTOR_PORTAL_DATABASE_URL` (legacy
 * env name in this repo), falls back to `DATABASE_URL` (Medusa's standard).
 * No hardcoded fallback — a missing env should fail loudly so we never
 * accidentally connect to the wrong database.
 */
function getConnectionString(): string {
  const url =
    process.env.DOCTOR_PORTAL_DATABASE_URL ||
    process.env.DR_DOCTOR_PORTAL_DB_URL ||
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No database URL configured. Set DOCTOR_PORTAL_DATABASE_URL or DATABASE_URL."
    );
  }
  return url;
}

export function getDoctorPortalPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: getConnectionString(),
      max: 5,
    });
    // Surface pool-level errors so a stray idle-client error does not crash
    // the Medusa worker silently.
    _pool.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error("[doctor-portal pool] idle client error:", err);
    });
  }
  return _pool;
}

/**
 * Test-only: reset the singleton. Production code never calls this.
 */
export async function _resetDoctorPortalPoolForTests(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
