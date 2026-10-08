const TZ = "America/Argentina/Buenos_Aires";
const DAY_MS = 86_400_000;

// "YYYY-MM-DD" de hoy en Argentina (el servidor puede estar en otro huso).
export const todayISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });

const toUTC = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const addDays = (iso: string, days: number) =>
  new Date(toUTC(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);

export const daysBetween = (fromISO: string, toISO: string) =>
  Math.round((toUTC(toISO).getTime() - toUTC(fromISO).getTime()) / DAY_MS);

export const monthsBetween = (fromISO: string, toISO: string) => {
  const a = toUTC(fromISO);
  const b = toUTC(toISO);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
};

export const addMonths = (iso: string, months: number) => {
  const d = toUTC(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

export const longDate = (iso: string) =>
  toUTC(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "UTC" });

export const monthName = (iso: string) =>
  toUTC(iso).toLocaleDateString("es-AR", { month: "long", timeZone: "UTC" });
