import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL antes de migrar.");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
  options: "-c timezone=UTC",
});

try {
  await client.connect();
  await client.query("SELECT pg_advisory_lock(871234001)");
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const directory = resolve("db/migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const existing = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
    if (existing.rowCount) continue;
    const sql = await readFile(resolve(directory, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`Migração aplicada: ${file}`);
    } catch {
      await client.query("ROLLBACK");
      throw new Error(`Falha ao aplicar ${file}. Confira a conexão e a estrutura do banco.`);
    }
  }
  console.log("Banco atualizado.");
} catch {
  console.error("Migração não concluída. Confira DATABASE_URL e a disponibilidade do PostgreSQL.");
  process.exitCode = 1;
} finally {
  await client.end();
}
