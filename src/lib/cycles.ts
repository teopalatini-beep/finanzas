import { lastBusinessDay } from "@/lib/card-dates";
import { addDays } from "@/lib/dates";

export type Cycle = { start: string; end: string };

// Ciclos anteriores al actual, de más viejo a más nuevo. Son una aproximación:
// el cobro real puede correrse un día por un feriado.
export function previousCycles(currentStart: string, count: number): Cycle[] {
  const out: Cycle[] = [];
  let start = currentStart;
  for (let i = 0; i < count; i++) {
    const [y, m] = start.split("-").map(Number);
    const prevYear = m === 1 ? y - 1 : y;
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevStart = lastBusinessDay(prevYear, prevMonth);
    out.unshift({ start: prevStart, end: addDays(start, -1) });
    start = prevStart;
  }
  return out;
}
