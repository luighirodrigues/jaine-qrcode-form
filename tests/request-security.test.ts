import { describe, expect, it } from "vitest";
import { hasExpectedOrigin, readLimitedJson } from "../src/lib/request-security";

describe("request security", () => {
  it("requires the exact configured Origin", () => {
    const make = (origin?: string) => new Request("http://localhost:3000/api/cadastros", { headers: origin ? { origin } : {} });
    expect(hasExpectedOrigin(make("http://localhost:3000"), "http://localhost:3000")).toBe(true);
    for (const origin of [undefined, "null", "http://127.0.0.1:3000", "https://evil.example", "http://localhost:3000.evil.example", "http://localhost:3000/path"]) {
      expect(hasExpectedOrigin(make(origin), "http://localhost:3000")).toBe(false);
    }
  });

  it("reads JSON with charset", async () => {
    const request = new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: '{"name":"Ana"}' });
    await expect(readLimitedJson(request)).resolves.toEqual({ name: "Ana" });
  });

  it("rejects unsupported content types and malformed JSON", async () => {
    await expect(readLimitedJson(new Request("http://localhost/api", { method: "POST", body: "{}" }))).rejects.toMatchObject({ status: 415 });
    await expect(readLimitedJson(new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).rejects.toMatchObject({ status: 400 });
  });

  it("limits actual streamed bytes even without Content-Length", async () => {
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('"' + "é".repeat(4096) + '"')); controller.close(); } });
    const request = new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body, duplex: "half" } as RequestInit);
    await expect(readLimitedJson(request)).rejects.toMatchObject({ status: 413 });
  });

  it("rejects oversized declared bodies before reading", async () => {
    const request = new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json", "content-length": "8193" }, body: "{}" });
    await expect(readLimitedJson(request)).rejects.toMatchObject({ status: 413 });
  });
});
