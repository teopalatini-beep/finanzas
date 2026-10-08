// Fechas de tarjeta: funciones puras, usables tanto en servidor como en el navegador.
// No conocen los feriados: los "días hábiles" son de lunes a viernes.

// closingDay null = la tarjeta cierra el último día hábil del mes.
// dueBusinessDay N = vence el día hábil N del mes siguiente al cierre. Si es null, se usa dueDay (día fijo).
export type CardRules = {
  closingDay: number | null;
  dueDay: number | null;
  dueBusinessDay: number | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1-12
const mk = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(Math.min(d, lastDay(y, m)))}`;
const shift = (y: number, m: number, delta: number): [number, number] => {
  const t = y * 12 + (m - 1) + delta;
  return [Math.floor(t / 12), (t % 12) + 1];
};
const isWeekday = (y: number, m: number, d: number) => {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow !== 0 && dow !== 6;
};

// Último día hábil (lunes a viernes) de un mes.
export function lastBusinessDay(year: number, month: number): string {
  let d = lastDay(year, month);
  while (!isWeekday(year, month, d)) d--;
  return mk(year, month, d);
}

// El día hábil número n de un mes (el 1.º es el primer lunes a viernes).
export function nthBusinessDay(year: number, month: number, n: number): string {
  let count = 0;
  for (let d = 1; d <= lastDay(year, month); d++) {
    if (isWeekday(year, month, d) && ++count === n) return mk(year, month, d);
  }
  return mk(year, month, lastDay(year, month));
}

const closingIn = (y: number, m: number, rules: CardRules) =>
  rules.closingDay ? mk(y, m, rules.closingDay) : lastBusinessDay(y, m);

// Primer cierre de tarjeta en o después de la fecha de compra.
export function nextClosing(dateISO: string, rules: CardRules) {
  const [y, m] = dateISO.split("-").map(Number);
  const thisMonth = closingIn(y, m, rules);
  if (dateISO <= thisMonth) return thisMonth;
  const [ny, nm] = shift(y, m, 1);
  return closingIn(ny, nm, rules);
}

// Vencimiento del resumen que cerró en closingISO.
export function dueFor(closingISO: string, rules: CardRules) {
  const [y, m] = closingISO.split("-").map(Number);
  if (rules.dueBusinessDay) {
    const [ny, nm] = shift(y, m, 1);
    return nthBusinessDay(ny, nm, rules.dueBusinessDay);
  }
  const dueDay = rules.dueDay ?? 15;
  const sameMonth = mk(y, m, dueDay);
  if (sameMonth > closingISO) return sameMonth;
  const [ny, nm] = shift(y, m, 1);
  return mk(ny, nm, dueDay);
}
