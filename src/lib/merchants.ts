// Agrupa descripciones parecidas del resumen en un mismo comercio.
// "MERPAGO*RAPPI 0123" y "Rappi" terminan en la misma clave.
export function merchantKey(description: string): string {
  return description
    .toLowerCase()
    .replace(/[0-9*#_/.\-]+/g, " ")
    .replace(/\b(merpago|mercadopago|mp)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function prettyName(description: string): string {
  const cleaned = description.replace(/^(merpago|mercadopago|mp)\s*[*\-]?\s*/i, "").replace(/\s+/g, " ").trim();
  return cleaned.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
