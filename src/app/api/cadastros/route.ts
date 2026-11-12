import { NextResponse } from "next/server";
import { validateLead } from "@/lib/lead-validation";
import { saveLead, SubmissionConflictError } from "@/lib/leads";
import { createDownloadToken, DOWNLOAD_COOKIE_NAME, DOWNLOAD_TTL_SECONDS } from "@/lib/download-access";
import { getServerConfig } from "@/lib/server-config";
import { hasExpectedOrigin, readLimitedJson, RequestBodyError } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store" };

function failure(status: number, message: string) {
  return NextResponse.json({ errors: { form: message } }, { status, headers: privateHeaders });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const config = getServerConfig();
    if (!hasExpectedOrigin(request, config.appUrl)) return failure(403, "Não foi possível autorizar este envio. Atualize a página.");
    const validation = validateLead(await readLimitedJson(request));
    if (!validation.success) return NextResponse.json({ errors: validation.errors }, { status: 400, headers: privateHeaders });

    const saved = await saveLead(validation.data);
    const token = createDownloadToken(saved.id, config.downloadCookieSecret);
    const response = NextResponse.json({ redirectTo: "/obrigado" }, { status: saved.created ? 201 : 200, headers: privateHeaders });
    response.cookies.set(DOWNLOAD_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: DOWNLOAD_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof RequestBodyError) return failure(error.status, error.status === 413 ? "Os dados enviados excedem o tamanho permitido." : "Não foi possível processar os dados enviados.");
    if (error instanceof SubmissionConflictError) return failure(409, "Este envio já foi utilizado. Atualize a página e tente novamente.");
    return failure(503, "Não foi possível concluir seu cadastro agora. Tente novamente em instantes.");
  }
}
