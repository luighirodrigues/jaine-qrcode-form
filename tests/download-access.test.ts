import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createDownloadToken, verifyDownloadToken, DOWNLOAD_COOKIE_NAME, DOWNLOAD_TTL_SECONDS } from "../src/lib/download-access";

const secret = "test-secret-012345678901234567890123456789";
const leadId = "f157ce37-24a0-43b4-8b5f-9edf785ab679";
const now = 1_800_000_000;

describe("download authorization", () => {
  it("signs a purpose-bound payload without contact information", () => {
    const token = createDownloadToken(leadId, secret, now);
    expect(verifyDownloadToken(token, secret, now)).toEqual({ leadId, purpose: "pdf-download", expiresAt: now + 3600 });
    expect(DOWNLOAD_COOKIE_NAME).toBe("pdf_access");
    expect(DOWNLOAD_TTL_SECONDS).toBe(3600);
  });

  it("expires at exactly one hour", () => {
    const token = createDownloadToken(leadId, secret, now);
    expect(verifyDownloadToken(token, secret, now + 3599)).not.toBeNull();
    expect(verifyDownloadToken(token, secret, now + 3600)).toBeNull();
  });

  it("rejects tampering, another secret and malformed cookies", () => {
    const token = createDownloadToken(leadId, secret, now);
    const [payload, signature] = token.split(".");
    expect(verifyDownloadToken(`${payload}x.${signature}`, secret, now)).toBeNull();
    expect(verifyDownloadToken(`${payload}.${signature.slice(0, -2)}xx`, secret, now)).toBeNull();
    expect(verifyDownloadToken(token, `${secret}other`, now)).toBeNull();
    for (const candidate of ["", "a", ".", "a.b.c", "%%%.$$$", `${payload}.AA`]) {
      expect(verifyDownloadToken(candidate, secret, now)).toBeNull();
    }
  });

  it("rejects signed payloads with a different purpose or invalid structure", () => {
    for (const payload of [{ leadId, purpose: "other", expiresAt: now + 3600 }, { leadId: "invalid", purpose: "pdf-download", expiresAt: now + 3600 }, { leadId, purpose: "pdf-download", expiresAt: "later" }]) {
      const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
      expect(verifyDownloadToken(`${encoded}.${signature}`, secret, now)).toBeNull();
    }
  });

  it("requires at least 32 characters in the signing secret", () => {
    expect(() => createDownloadToken(leadId, "short", now)).toThrow();
    expect(verifyDownloadToken("a.b", "short", now)).toBeNull();
  });
});
