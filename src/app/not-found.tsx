import { BrandHeader } from "@/components/brand";

export default function NotFound() {
  return <div className="app-frame"><BrandHeader /><main className="page-shell not-found">
    <h1 className="page-heading">Vamos ao seu material?</h1>
    <p className="page-description">Essa página não foi encontrada. Acesse o formulário para liberar seu PDF.</p>
    <a className="primary-button" href="/">Ir para o formulário</a>
  </main></div>;
}
