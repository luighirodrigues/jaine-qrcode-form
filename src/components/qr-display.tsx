"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { siteContent } from "@/lib/site-content";
import { Icon } from "./icons";

export function QrDisplay() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [siteUrl, setSiteUrl] = useState("");

  useEffect(() => {
    if (!siteUrl || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [siteUrl]);

  function restoreForm() {
    setSiteUrl("");
    triggerRef.current?.focus({ preventScroll: true });
  }

  return <>
    <button ref={triggerRef} className="qr-launcher" type="button"
      aria-label="Mostrar QR Code do site" title="Mostrar QR Code do site"
      aria-haspopup="dialog" aria-controls="site-qr-dialog"
      onClick={() => setSiteUrl(new URL("/", window.location.origin).href)}>
      <Icon name="qr" />
    </button>
    <dialog id="site-qr-dialog" ref={dialogRef} className="qr-dialog"
      aria-labelledby="site-qr-title" aria-modal="true" onClose={restoreForm}>
      <header className="qr-heading">
        <div><p className="qr-brand">Jaíne Teixeira Cortes</p>
          <h2 id="site-qr-title">Acesse o {siteContent.materialName}</h2></div>
        <button type="button" className="qr-close" aria-label="Fechar QR Code" title="Fechar QR Code"
          onClick={() => setSiteUrl("")}><Icon name="close" /></button>
      </header>
      <div className="qr-stage">
        {siteUrl ? <QRCodeSVG className="qr-code" value={siteUrl} size={1024}
          level="M" marginSize={4} bgColor="#FFFFFF" fgColor="#000000"
          role="img" aria-label="QR Code para acessar o site" /> : null}
      </div>
      <footer className="qr-caption">
        <p>Aponte a câmera do seu celular</p>
        <span>{siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
      </footer>
    </dialog>
  </>;
}
