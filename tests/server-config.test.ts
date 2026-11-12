import { afterEach, describe, expect, it, vi } from "vitest";
import { isAbsolute } from "node:path";
import { getServerConfig } from "../src/lib/server-config";

afterEach(() => vi.unstubAllEnvs());

function setup() {
  vi.stubEnv("APP_URL", "http://localhost:3000/");
  vi.stubEnv("PDF_PATH", "private/material.pdf");
  vi.stubEnv("PDF_DOWNLOAD_NAME", "Material de apoio.pdf");
  vi.stubEnv("DOWNLOAD_COOKIE_SECRET", "test-secret-012345678901234567890123456789");
}

describe("server configuration", () => {
  it("reads configuration on demand and canonicalizes the application origin", () => {
    setup();
    const config = getServerConfig();
    expect(config.appUrl).toBe("http://localhost:3000");
    expect(isAbsolute(config.pdfPath)).toBe(true);
    expect(config.pdfDownloadName).toBe("Material de apoio.pdf");
  });

  it.each(["", "not-a-url", "https://user:password@example.com", "https://example.com/path", "https://example.com?key=value", "file:///private"])("rejects invalid APP_URL configuration", (appUrl) => {
    setup(); vi.stubEnv("APP_URL", appUrl);
    expect(() => getServerConfig()).toThrow("Configuração do servidor indisponível.");
  });

  it("rejects missing private file configuration and weak secrets", () => {
    setup(); vi.stubEnv("PDF_PATH", "");
    expect(() => getServerConfig()).toThrow();
    setup(); vi.stubEnv("DOWNLOAD_COOKIE_SECRET", "short");
    expect(() => getServerConfig()).toThrow();
  });
});
