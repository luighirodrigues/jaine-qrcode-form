import { createHmac, timingSafeEqual } from "node:crypto";

export const DOWNLOAD_COOKIE_NAME = "pdf_access";
export const DOWNLOAD_TTL_SECONDS = 3600;

export type DownloadPayload = {
  leadId: string;
  purpose: "pdf-download";
  expiresAt: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function sign(encoded: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(encoded).digest();
}

/** `now` is Unix time in whole seconds; the cookie lasts one hour. */
export function createDownloadToken(leadId: string, secret: string, now = Math.floor(Date.now() / 1000)): string {
  if (secret.length < 32 || !UUID_PATTERN.test(leadId) || !Number.isSafeInteger(now)) throw new Error("Não foi possível autorizar o download.");
  const payload: DownloadPayload = { leadId, purpose: "pdf-download", expiresAt: now + DOWNLOAD_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, secret).toString("base64url")}`;
}

/** Returns null for an invalid/expired token. `now` is Unix time in whole seconds. */
export function verifyDownloadToken(token: string, secret: string, now = Math.floor(Date.now() / 1000)): DownloadPayload | null {
  if (secret.length < 32 || token.length > 2048 || !Number.isSafeInteger(now)) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
    const [encoded, encodedSignature] = parts;
    const supplied = Buffer.from(encodedSignature, "base64url");
    const expected = sign(encoded, secret);
    if (supplied.toString("base64url") !== encodedSignature || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const decoded: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!decoded || typeof decoded !== "object") return null;
    const payload = decoded as Partial<DownloadPayload>;
    if (payload.purpose !== "pdf-download" || typeof payload.leadId !== "string" || !UUID_PATTERN.test(payload.leadId) || !Number.isSafeInteger(payload.expiresAt) || payload.expiresAt! <= now) return null;
    return { leadId: payload.leadId, purpose: "pdf-download", expiresAt: payload.expiresAt! };
  } catch {
    return null;
  }
}
