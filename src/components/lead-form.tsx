"use client";

import { useRef, useState, type FormEvent } from "react";
import { validateLead, type LeadErrors } from "@/lib/lead-validation";
import { siteContent } from "@/lib/site-content";
import { Icon } from "./icons";

function newSubmissionKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Formatar ao sair do campo mantém a edição, seleção e colagem naturais.
function formatPhone(value: string): string {
  if (!/^\+?[\d\s().-]+$/.test(value.trim())) return value;
  let digits = value.replace(/\D/g, "");
  if (value.trim().startsWith("+") && !((digits.length === 12 || digits.length === 13) && digits.startsWith("55"))) return value;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return value;
  const split = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

export function LeadForm() {
  const [errors, setErrors] = useState<LeadErrors>({});
  const [pending, setPending] = useState(false);
  const submissionKey = useRef<string | null>(null);
  const sending = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  function showErrors(nextErrors: LeadErrors, form: HTMLFormElement) {
    setErrors(nextErrors);
    requestAnimationFrame(() => {
      const first = (["name", "phone", "email"] as const).find((key) => nextErrors[key]);
      if (first) (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
      else alertRef.current?.focus();
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    submissionKey.current ??= newSubmissionKey();
    const result = validateLead({
      name: values.get("name"), phone: values.get("phone"), email: values.get("email"),
      submissionKey: submissionKey.current,
    });
    if (!result.success) { showErrors(result.errors, form); return; }
    sending.current = true;
    setPending(true);
    setErrors({});
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/cadastros", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data), signal: controller.signal,
      });
      const body = await response.json();
      if (response.ok && body.redirectTo === "/obrigado") {
        window.location.assign("/obrigado");
        return;
      }
      if (response.status === 409) {
        submissionKey.current = newSubmissionKey();
        showErrors({ form: "Seus dados foram alterados. Confira os campos e toque em liberar novamente." }, form);
      } else {
        showErrors(body.errors ?? { form: "Não foi possível liberar o material agora. Tente novamente em instantes." }, form);
      }
    } catch {
      showErrors({ form: "Não conseguimos confirmar o envio. Confira sua conexão e tente novamente." }, form);
    } finally {
      clearTimeout(timeout);
      sending.current = false;
      setPending(false);
    }
  }

  return <form className="lead-form" method="post" action="/api/cadastros" noValidate onSubmit={submit} aria-busy={pending}>
    {errors.form ? <div ref={alertRef} className="feedback feedback-error" role="alert" tabIndex={-1}>{errors.form}</div> : null}
    <div className="field">
      <label htmlFor="name">Nome</label>
      <div className="input-wrap"><Icon name="person" /><input id="name" name="name" autoComplete="name" placeholder="Como você se chama?" maxLength={120} required
        aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} /></div>
      {errors.name ? <p className="field-error" id="name-error">{errors.name}</p> : null}
    </div>
    <div className="field">
      <label htmlFor="phone">Telefone</label>
      <div className="input-wrap"><Icon name="phone" /><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" maxLength={24} required
        onBlur={(event) => { event.currentTarget.value = formatPhone(event.currentTarget.value); }}
        aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} /></div>
      {errors.phone ? <p className="field-error" id="phone-error">{errors.phone}</p> : null}
    </div>
    <div className="field">
      <label htmlFor="email">E-mail</label>
      <div className="input-wrap"><Icon name="email" /><input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="voce@exemplo.com" maxLength={254} required
        aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} /></div>
      {errors.email ? <p className="field-error" id="email-error">{errors.email}</p> : null}
    </div>
    <button className="primary-button" type="submit" disabled={pending}><Icon name="lock" />{pending ? "Liberando..." : "Liberar meu PDF"}</button>
    <div className="form-notice"><p>{siteContent.privacySummary}</p>
      <details><summary>Sobre seus dados</summary><p>{siteContent.privacyDetails}</p></details>
    </div>
    <noscript><p className="feedback">Ative o JavaScript no navegador para preencher o formulário.</p></noscript>
  </form>;
}
