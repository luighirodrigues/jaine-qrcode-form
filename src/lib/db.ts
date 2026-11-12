import { Pool } from "pg";

const globalDatabase = globalThis as typeof globalThis & { qrcodePool?: Pool };

/** One lazy pool per server process, including during development hot reloads. */
export function getPool(): Pool {
  if (globalDatabase.qrcodePool) return globalDatabase.qrcodePool;
  const connectionString = process.env.DATABASE_URL;
  try {
    const parsed = new URL(connectionString ?? "");
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error("Banco de dados indisponível.");
  }
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    options: "-c timezone=UTC",
  });
  // An idle connection failure must neither crash the process nor expose connection details.
  pool.on("error", () => { console.error("Conexão ociosa com o banco de dados indisponível."); });
  globalDatabase.qrcodePool = pool;
  return pool;
}
