const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const formatARS = (n: number) => ars.format(n);

export type Status = "ok" | "warn" | "over";

// Desde qué parte del tope se avisa que te estás acercando.
export const WARN_FROM = 0.8;

// Semáforo: siempre se muestra con ícono + texto, nunca solo color.
export function statusFor(spent: number, budget: number): Status {
  const ratio = budget === 0 ? 0 : spent / budget;
  if (ratio > 1) return "over";
  if (ratio >= WARN_FROM) return "warn";
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
