import { randomUUID } from "node:crypto";
import { getPool } from "./db";
import type { LeadData } from "./lead-validation";

export class SubmissionConflictError extends Error {
  constructor() {
    super("Este envio já foi utilizado com outros dados.");
    this.name = "SubmissionConflictError";
  }
}

export async function saveLead(data: LeadData): Promise<{ id: string; created: boolean }> {
  const pool = getPool();
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO leads (id, name, phone, email, submission_key)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (submission_key) DO NOTHING
     RETURNING id`,
    [randomUUID(), data.name, data.phone, data.email, data.submissionKey],
  );
  if (inserted.rows[0]) return { id: inserted.rows[0].id, created: true };

  // A separate READ COMMITTED statement sees the winner of a concurrent insert.
  const existing = await pool.query<{ id: string; name: string; phone: string; email: string }>(
    "SELECT id, name, phone, email FROM leads WHERE submission_key = $1",
    [data.submissionKey],
  );
  const row = existing.rows[0];
  if (!row) throw new Error("Não foi possível concluir o cadastro.");
  if (row.name !== data.name || row.phone !== data.phone || row.email !== data.email) throw new SubmissionConflictError();
  return { id: row.id, created: false };
}
