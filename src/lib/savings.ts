// Matemática del ahorro. Funciones puras, sin dependencias: solo aritmética con los supuestos que carga el usuario.

export type Acc = { id: string; balance: number; annualRate: number };
export type Point = { month: number; total: number; deposited: number };

// Tasa mensual equivalente a una anual (interés compuesto).
export const monthlyRate = (annualPct: number) => Math.pow(1 + annualPct / 100, 1 / 12) - 1;

// Cada mes: las cuentas rinden, y al final del mes entra el aporte a la cuenta elegida.
export function project(accs: Acc[], contribId: string | null, monthly: number, months: number): Point[] {
  const balances = new Map(accs.map((a) => [a.id, a.balance]));
  const rates = new Map(accs.map((a) => [a.id, monthlyRate(a.annualRate)]));
  const sum = () => [...balances.values()].reduce((s, v) => s + v, 0);

  const points: Point[] = [{ month: 0, total: sum(), deposited: 0 }];
  for (let m = 1; m <= months; m++) {
    for (const a of accs) balances.set(a.id, balances.get(a.id)! * (1 + rates.get(a.id)!));
    if (contribId && balances.has(contribId)) balances.set(contribId, balances.get(contribId)! + monthly);
    points.push({ month: m, total: sum(), deposited: m * monthly });
  }
  return points;
}

// Cuántos meses faltan para llegar a un monto. 0 si ya llegaste, null si no llegás en maxMonths.
export function monthsToTarget(
  accs: Acc[],
  contribId: string | null,
  monthly: number,
  target: number,
  maxMonths = 600,
): number | null {
  const start = accs.reduce((s, a) => s + a.balance, 0);
  if (start >= target) return 0;
  if (monthly <= 0 && accs.every((a) => a.annualRate <= 0)) return null;

  const balances = new Map(accs.map((a) => [a.id, a.balance]));
  const rates = new Map(accs.map((a) => [a.id, monthlyRate(a.annualRate)]));
  for (let m = 1; m <= maxMonths; m++) {
    for (const a of accs) balances.set(a.id, balances.get(a.id)! * (1 + rates.get(a.id)!));
    if (contribId && balances.has(contribId)) balances.set(contribId, balances.get(contribId)! + monthly);
    if ([...balances.values()].reduce((s, v) => s + v, 0) >= target) return m;
  }
  return null;
}

// Aporte mensual necesario para llegar a un monto en N meses.
export function requiredMonthly(accs: Acc[], contribId: string | null, target: number, months: number): number {
  if (months <= 0) return Math.max(0, target - accs.reduce((s, a) => s + a.balance, 0));
  const withoutNew = project(accs, contribId, 0, months)[months].total;
  const gap = target - withoutNew;
  if (gap <= 0) return 0;
  const r = monthlyRate(accs.find((a) => a.id === contribId)?.annualRate ?? 0);
  const factor = r === 0 ? months : (Math.pow(1 + r, months) - 1) / r;
  return gap / factor;
}
