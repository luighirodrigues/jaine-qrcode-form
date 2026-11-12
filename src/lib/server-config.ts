import { resolve } from "node:path";

export type ServerConfig = {
  appUrl: string;
  pdfPath: string;
  pdfDownloadName: string;
  downloadCookieSecret: string;
};

/** Read at request time so builds do not require deployment secrets. */
export function getServerConfig(): ServerConfig {
  try {
    const appUrl = new URL(process.env.APP_URL ?? "");
    const pdfPath = process.env.PDF_PATH?.trim();
    const pdfDownloadName = process.env.PDF_DOWNLOAD_NAME?.trim();
    const downloadCookieSecret = process.env.DOWNLOAD_COOKIE_SECRET ?? "";
    if (!["http:", "https:"].includes(appUrl.protocol) || appUrl.username || appUrl.password || appUrl.pathname !== "/" || appUrl.search || appUrl.hash || !pdfPath || !pdfDownloadName || downloadCookieSecret.length < 32) throw new Error();
    return { appUrl: appUrl.origin, pdfPath: resolve(pdfPath), pdfDownloadName, downloadCookieSecret };
  } catch {
    throw new Error("Configuração do servidor indisponível.");
  }
}
