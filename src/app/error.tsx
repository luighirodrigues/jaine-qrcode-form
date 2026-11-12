"use client";

import { BrandHeader } from "@/components/brand";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return <div className="app-frame"><BrandHeader /><main className="page-shell not-found">
    <h1 className="page-heading">Não foi possível carregar.</h1>
    <p className="page-description">Tente novamente em instantes para continuar acessando seu material.</p>
    <button className="primary-button" onClick={() => retry()}>Tentar novamente</button>
  </main></div>;
}
