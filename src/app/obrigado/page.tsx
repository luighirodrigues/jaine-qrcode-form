import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BrandHeader, Footer } from "@/components/brand";
import { Icon } from "@/components/icons";
import { DOWNLOAD_COOKIE_NAME, verifyDownloadToken } from "@/lib/download-access";
import { getServerConfig } from "@/lib/server-config";
import { siteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function ThankYou({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(DOWNLOAD_COOKIE_NAME)?.value;
  const config = getServerConfig();
  if (!token || !verifyDownloadToken(token, config.downloadCookieSecret)) redirect("/?status=expired");
  const { error } = await searchParams;

  return <div className="app-frame">
    <BrandHeader />
    <main className="page-shell">
      <div className="success-mark"><Icon name="check" /></div>
      <h1 className="page-heading">Tudo pronto! Seu PDF está liberado.</h1>
      <p className="page-description">Obrigada pelo seu interesse. Agora é só baixar o material e aproveitar a leitura.</p>
      <div className="download-panel">
        <div className="document-icon"><Icon name="file" /></div>
        <div><strong>{siteContent.materialName}</strong><p>Pronto para baixar</p></div>
      </div>
      {error === "file" ? <p className="feedback feedback-error" role="alert">O arquivo está indisponível no momento. Seus dados já foram recebidos. Tente baixar novamente em instantes.</p> : null}
      <a className="primary-button" href="/api/download"><Icon name="download" />Baixar PDF</a>
      <p className="download-note">Se o arquivo abrir no navegador, use a opção de compartilhar ou salvar do seu celular.</p>
      <a className="secondary-link" href="/">Voltar ao início</a>
      <Footer />
    </main>
  </div>;
}
