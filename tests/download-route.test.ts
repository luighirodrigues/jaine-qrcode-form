import { mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/download/route";
import { createDownloadToken } from "../src/lib/download-access";

const secret = "test-secret-012345678901234567890123456789";
const leadId = "f157ce37-24a0-43b4-8b5f-9edf785ab679";
const pdf = "%PDF-1.4\nsynthetic test file\n%%EOF";
let directory: string;
let file: string;
beforeAll(async () => { directory = await mkdtemp(join(tmpdir(), "qrcode-download-test-")); file = join(directory, "test.pdf"); await writeFile(file, pdf); });
afterAll(async () => { await unlink(file); await rmdir(directory); });
beforeEach(() => {
  vi.stubEnv("APP_URL", "http://localhost:3000"); vi.stubEnv("PDF_PATH", file);
  vi.stubEnv("PDF_DOWNLOAD_NAME", "Material de orientação.pdf"); vi.stubEnv("DOWNLOAD_COOKIE_SECRET", secret);
});
afterEach(() => vi.unstubAllEnvs());
function request(token?: string) { return new Request("http://untrusted-host.example/api/download", { headers: token ? { cookie: `other=value; pdf_access=${token}` } : {} }); }

describe("GET /api/download", () => {
  it.each([undefined, "invalid", createDownloadToken(leadId, secret, 1_000)])("redirects unauthorized or expired access to the configured application", async (token) => {
    const response = await GET(request(token));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/?status=expired");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects a tampered valid token", async () => {
    const token = createDownloadToken(leadId, secret);
    const [payload, signature] = token.split(".");
    const response = await GET(request(`${payload}x.${signature}`));
    expect(response.status).toBe(303);
  });

  it("streams the private PDF as a UTF-8 attachment with no caching", async () => {
    const response = await GET(request(createDownloadToken(leadId, secret)));
    expect(response.status).toBe(200); expect(await response.text()).toBe(pdf);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(response.headers.get("content-disposition")).toContain("filename*=UTF-8''Material%20de%20orienta%C3%A7%C3%A3o.pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("sanitizes filenames before constructing response headers", async () => {
    vi.stubEnv("PDF_DOWNLOAD_NAME", '../../evil\r\n";x=y.pdf');
    const response = await GET(request(createDownloadToken(leadId, secret)));
    expect(response.status).toBe(200); expect(response.headers.get("content-disposition")).not.toMatch(/[\r\n]/);
    expect(response.headers.get("content-disposition")).not.toContain("../");
    await response.arrayBuffer();
  });

  it("redirects an authorized user to a retryable file error if the file is absent", async () => {
    vi.stubEnv("PDF_PATH", join(directory, "absent.pdf"));
    const response = await GET(request(createDownloadToken(leadId, secret)));
    expect(response.status).toBe(303); expect(response.headers.get("location")).toBe("http://localhost:3000/obrigado?error=file");
  });

  it("redirects a non-file path to the retryable confirmation error and preserves authorization", async () => {
    const token = createDownloadToken(leadId, secret);
    vi.stubEnv("PDF_PATH", directory);
    const response = await GET(request(token));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/obrigado?error=file");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    vi.stubEnv("PDF_PATH", file);
    const retry = await GET(request(token));
    expect(retry.status).toBe(200);
    expect(await retry.text()).toBe(pdf);
  });

  it("returns a safe 503 for invalid server configuration", async () => {
    vi.stubEnv("APP_URL", "invalid");
    const response = await GET(request(createDownloadToken(leadId, secret)));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("invalid");
  });
});
