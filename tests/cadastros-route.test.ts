import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/cadastros/route";
import { verifyDownloadToken } from "../src/lib/download-access";
import { SubmissionConflictError } from "../src/lib/leads";

const { persist } = vi.hoisted(() => ({ persist: vi.fn() }));
vi.mock("../src/lib/leads", async (importOriginal) => ({ ...await importOriginal<typeof import("../src/lib/leads")>(), saveLead: persist }));

const secret = "test-secret-012345678901234567890123456789";
const id = "f157ce37-24a0-43b4-8b5f-9edf785ab679";
const data = { name: " Érica ", phone: "(11) 91234-5678", email: " ERICA@example.com ", submissionKey: id };
function request(body: unknown = data, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/cadastros", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.stubEnv("APP_URL", "http://localhost:3000"); vi.stubEnv("PDF_PATH", "private/test.pdf");
  vi.stubEnv("PDF_DOWNLOAD_NAME", "Material.pdf"); vi.stubEnv("DOWNLOAD_COOKIE_SECRET", secret);
  persist.mockReset().mockResolvedValue({ id, created: true });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/cadastros", () => {
  it("persists normalized data before issuing an HttpOnly authorization cookie", async () => {
    const response = await POST(request());
    expect(persist).toHaveBeenCalledWith({ ...data, name: "Érica", phone: "+5511912345678", email: "erica@example.com" });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ redirectTo: "/obrigado" });
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/"); expect(cookie).toContain("Max-Age=3600");
    const token = cookie.match(/^pdf_access=([^;]+)/)![1];
    expect(verifyDownloadToken(token, secret)?.leadId).toBe(id);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns 200 and renews authorization after an identical retry", async () => {
    persist.mockResolvedValue({ id, created: false });
    const response = await POST(request());
    expect(response.status).toBe(200); expect(response.headers.get("set-cookie")).toContain("pdf_access=");
  });

  it("marks the cookie Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(request())).headers.get("set-cookie")).toContain("Secure");
  });

  it("rejects invalid fields without persisting or authorizing", async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(400); expect(await response.json()).toHaveProperty("errors.name");
    expect(persist).not.toHaveBeenCalled(); expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([undefined, "https://evil.example", "http://127.0.0.1:3000"])("requires the configured origin", async (origin) => {
    const req = request(); if (origin) req.headers.set("origin", origin); else req.headers.delete("origin");
    expect((await POST(req)).status).toBe(403); expect(persist).not.toHaveBeenCalled();
  });

  it("rejects wrong content types and actual oversized bodies", async () => {
    expect((await POST(request({}, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(request({ name: "a".repeat(8192) }))).status).toBe(413);
    expect(persist).not.toHaveBeenCalled();
  });

  it("returns conflict without authorizing", async () => {
    persist.mockRejectedValue(new SubmissionConflictError());
    const response = await POST(request());
    expect(response.status).toBe(409); expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns a safe infrastructure failure without a cookie", async () => {
    persist.mockRejectedValue(new Error("private credentials and personal data"));
    const response = await POST(request());
    expect(response.status).toBe(503); expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.text()).not.toContain("private credentials");
  });

  it("returns 503 for invalid server configuration before persisting", async () => {
    vi.stubEnv("APP_URL", "invalid");
    expect((await POST(request())).status).toBe(503); expect(persist).not.toHaveBeenCalled();
  });
});
