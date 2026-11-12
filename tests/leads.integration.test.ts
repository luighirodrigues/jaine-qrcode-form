import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { getPool } from "../src/lib/db";
import { saveLead, SubmissionConflictError } from "../src/lib/leads";
import type { LeadData } from "../src/lib/lead-validation";

// Each fixture is synthetic. Cleanup is restricted to IDs returned for our own inserts.
const createdIds = new Set<string>();
const fixture = (): LeadData => ({ name: "Pessoa de teste", phone: "+5511912345678", email: "teste@example.com", submissionKey: randomUUID() });
async function saveTracked(data: LeadData) {
  const result = await saveLead(data);
  createdIds.add(result.id);
  return result;
}

afterAll(async () => {
  const pool = getPool();
  if (createdIds.size) await pool.query("DELETE FROM leads WHERE id = ANY($1::uuid[])", [[...createdIds]]);
  await pool.end();
});

describe("PostgreSQL lead persistence", () => {
  it("stores all normalized data and preserves a timezone-aware creation date", async () => {
    const data = fixture();
    const saved = await saveTracked(data);
    expect(saved.created).toBe(true);
    const result = await getPool().query("SELECT id, name, phone, email, created_at, submission_key FROM leads WHERE id = $1", [saved.id]);
    expect(result.rows[0]).toMatchObject({ id: saved.id, name: data.name, phone: data.phone, email: data.email, submission_key: data.submissionKey });
    expect(result.rows[0].created_at).toBeInstanceOf(Date);
  });

  it("returns the existing ID on an identical retry", async () => {
    const data = fixture();
    const first = await saveTracked(data);
    expect(await saveTracked(data)).toEqual({ id: first.id, created: false });
  });

  it("does not duplicate a submission sent concurrently", async () => {
    const data = fixture();
    const results = await Promise.all(Array.from({ length: 8 }, () => saveTracked(data)));
    expect(new Set(results.map((result) => result.id)).size).toBe(1);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    const count = await getPool().query("SELECT count(*)::int AS count FROM leads WHERE submission_key = $1", [data.submissionKey]);
    expect(count.rows[0].count).toBe(1);
  });

  it.each(["name", "phone", "email"] as const)("rejects reuse of a submission key with a different %s", async (field) => {
    const data = fixture();
    await saveTracked(data);
    const alternatives = { name: "Outra pessoa", phone: "+5511987654321", email: "outro@example.com" };
    await expect(saveLead({ ...data, [field]: alternatives[field] })).rejects.toBeInstanceOf(SubmissionConflictError);
  });

  it("allows repeated contacts using separate submission keys", async () => {
    const data = fixture();
    const first = await saveTracked(data);
    const second = await saveTracked({ ...data, submissionKey: randomUUID() });
    expect(second.id).not.toBe(first.id);
    expect(second.created).toBe(true);
  });
});
