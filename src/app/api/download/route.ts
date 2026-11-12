import { open, type FileHandle } from "node:fs/promises";
import { Readable } from "node:stream";
import { DOWNLOAD_COOKIE_NAME, verifyDownloadToken } from "@/lib/download-access";
import { getServerConfig } from "@/lib/server-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store" };

function redirect(appUrl: string, path: string): Response {
  return new Response(null, { status: 303, headers: { ...privateHeaders, Location: new URL(path, appUrl).href } });
}

function attachmentName(configured: string): string {
  const basename = configured.split(/[\\/]/).pop() ?? "material.pdf";
  const cleaned = basename.replace(/[\u0000-\u001f\u007f";]/g, "_").trim().slice(0, 180) || "material.pdf";
  const name = cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
  const fallback = name.replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(name).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const config = getServerConfig();
    const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${DOWNLOAD_COOKIE_NAME}=`));
    const token = cookie?.slice(DOWNLOAD_COOKIE_NAME.length + 1) ?? "";
    if (!verifyDownloadToken(token, config.downloadCookieSecret)) return redirect(config.appUrl, "/?status=expired");

    let handle: FileHandle | undefined;
    try {
      handle = await open(config.pdfPath, "r");
      const stat = await handle.stat();
      if (!stat.isFile()) throw new Error("Arquivo indisponível.");
      const body = Readable.toWeb(handle.createReadStream({ autoClose: true })) as ReadableStream<Uint8Array>;
      return new Response(body, {
        status: 200,
        headers: {
          ...privateHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": attachmentName(config.pdfDownloadName),
          "Content-Length": String(stat.size),
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      await handle?.close().catch(() => undefined);
      return redirect(config.appUrl, "/obrigado?error=file");
    }
  } catch {
    return Response.json({ error: "Não foi possível disponibilizar o arquivo agora. Tente novamente em instantes." }, { status: 503, headers: privateHeaders });
  }
}
