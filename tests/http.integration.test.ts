import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createDownloadToken, DOWNLOAD_COOKIE_NAME } from "../src/lib/download-access";

const baseURL = process.env.TEST_BASE_URL ?? process.env.APP_URL ?? "http://localhost:3000";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const keys: string[] = [];
function lead() {
  const submissionKey = randomUUID(); keys.push(submissionKey);
  return { name: "Pessoa HTTP Teste", phone: "51998765432", email: "http.test@example.com", submissionKey };
}
function post(body: unknown, origin = baseURL) {
  return fetch(`${baseURL}/api/cadastros`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

afterAll(async () => {
  try { await pool.query("DELETE FROM leads WHERE submission_key = ANY($1::uuid[])", [keys]); }
  finally { await pool.end(); }
});

describe("HTTP real com aplicação e PostgreSQL", () => {
  it("bloqueia a confirmação e o PDF sem cadastro", async () => {
    for (const path of ["/obrigado", "/api/download"]) {
      const response = await fetch(`${baseURL}${path}`, { redirect: "manual" });
      expect([303, 307]).toContain(response.status);
      expect(response.headers.get("location")).toContain("status=expired");
      expect(response.headers.get("content-type")).not.toBe("application/pdf");
    }
  });

  it("entrada inválida não grava nem emite cookie", async () => {
    const data = { ...lead(), phone: "123", email: "invalido" };
    const response = await post(data);
    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect((await pool.query("SELECT id FROM leads WHERE submission_key = $1", [data.submissionKey])).rowCount).toBe(0);
  });

  it("origem externa não grava", async () => {
    const data = lead();
    expect((await post(data, "https://outra-origem.example")).status).toBe(403);
    expect((await pool.query("SELECT id FROM leads WHERE submission_key = $1", [data.submissionKey])).rowCount).toBe(0);
  });

  it("persiste antes de autorizar, reenvia sem duplicar e entrega bytes PDF", async () => {
    const data = lead();
    const first = await post(data);
    expect(first.status).toBe(201);
    expect(await first.json()).toEqual({ redirectTo: "/obrigado" });
    const row = (await pool.query("SELECT name, phone, email FROM leads WHERE submission_key = $1", [data.submissionKey])).rows;
    expect(row).toEqual([{ name: data.name, phone: "+5551998765432", email: data.email }]);
    const cookie = first.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toMatch(/samesite=lax/i);
    expect(cookie).toContain("Max-Age=3600");
    expect((await post(data)).status).toBe(200);
    expect((await pool.query("SELECT id FROM leads WHERE submission_key = $1", [data.submissionKey])).rowCount).toBe(1);
    expect((await post({ ...data, name: "Outro Nome" })).status).toBe(409);
    const download = await fetch(`${baseURL}/api/download`, { headers: { Cookie: cookie.split(";")[0] }, redirect: "manual" });
    expect(download.status).toBe(200);
    expect(download.headers.get("content-type")).toBe("application/pdf");
    expect(download.headers.get("content-disposition")).toContain("attachment;");
    expect(download.headers.get("cache-control")).toContain("no-store");
    expect(Buffer.from(await download.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("cookie expirado ou adulterado não libera arquivo", async () => {
    const secret = process.env.DOWNLOAD_COOKIE_SECRET!;
    const expired = createDownloadToken(randomUUID(), secret, Math.floor(Date.now() / 1000) - 3601);
    for (const token of [expired, "payload.adulterado"]) {
      const response = await fetch(`${baseURL}/api/download`, { headers: { Cookie: `${DOWNLOAD_COOKIE_NAME}=${token}` }, redirect: "manual" });
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain("status=expired");
    }
  });
});
