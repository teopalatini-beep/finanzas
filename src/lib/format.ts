const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const formatARS = (n: number) => ars.format(n);

export type Status = "ok" | "warn" | "over";

// Semáforo: siempre se muestra con ícono + texto, nunca solo color.
export function statusFor(spent: number, budget: number): Status {
  const ratio = budget === 0 ? 0 : spent / budget;
  if (ratio > 1) return "over";
  if (ratio >= 0.7) return "warn";
  return "ok";
}

export const STATUS_LABEL: Record<Status, string> = {
  ok: "Holgado",
  warn: "Cuidado",
  over: "Te pasaste",
};

const usd = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usd2 = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatUSD = (n: number) => usd.format(n);
export const formatUSD2 = (n: number) => usd2.format(n);
