export type LeadData = {
  name: string;
  phone: string;
  email: string;
  submissionKey: string;
};

export type LeadErrors = { name?: string; phone?: string; email?: string; form?: string };
export type LeadValidationResult = { success: true; data: LeadData } | { success: false; errors: LeadErrors };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BRAZILIAN_AREA_CODES = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38", "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55", "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79", "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string" || !/^\+?[\d\s().-]+$/.test(value.trim())) return null;
  let digits = value.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  else if (value.trim().startsWith("+")) return null;
  if (!BRAZILIAN_AREA_CODES.has(digits.slice(0, 2))) return null;
  if (!/^(?:\d{2}[2-9]\d{7}|\d{2}9\d{8})$/.test(digits)) return null;
  return `+55${digits}`;
}

/** Browser-safe validation shared with the server. No persistence or Node dependencies. */
export function validateLead(input: unknown): LeadValidationResult {
  const values = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const errors: LeadErrors = {};
  const name = typeof values.name === "string" ? values.name.trim() : "";
  const phone = normalizePhone(values.phone);
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const submissionKey = typeof values.submissionKey === "string" ? values.submissionKey.toLowerCase() : "";

  if (name.length < 2 || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) errors.name = "Informe seu nome, com 2 a 120 caracteres.";
  if (!phone) errors.phone = "Informe um telefone brasileiro válido, com DDD.";
  const emailPattern = /^[^\s@<>]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
  if (!email || email.length > 254 || email.split("@")[0].length > 64 || /[\u0000-\u001f\u007f]/.test(email) || !emailPattern.test(email)) errors.email = "Informe um e-mail válido.";
  if (!UUID_PATTERN.test(submissionKey)) errors.form = "Atualize a página e tente novamente.";
  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data: { name, phone: phone!, email, submissionKey } };
}
