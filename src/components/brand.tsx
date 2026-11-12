import Image from "next/image";
import { Icon } from "./icons";

export function BrandHeader() {
  return <header className="site-header">
    <div className="brand">
      <Image src="/logo.png" width={1920} height={1080}
        alt="Jaíne Teixeira Cortes — Escritório de Contabilidade e Corretora de Imóveis"
        preload sizes="660px" />
    </div>
  </header>;
}

export function Footer() {
  return <footer className="site-footer"><Icon name="lock" width={14} height={14} />
    <span>Jaíne Teixeira Cortes</span>
  </footer>;
}
