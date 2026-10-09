import { dueFor, nextClosing, type CardRules } from "@/lib/card-dates";
import { longDate } from "@/lib/dates";
import { formatARS } from "@/lib/format";

export type Advice = { text: string; tone: "ok" | "warn" | "over" };

export type AdviceInput = {
  amount: number; // lo que sale en este ciclo o en el que corresponda (en cuotas: el valor de una cuota)
  envelope: { name: string; budget: number; spent: number } | null;
  isCard: boolean;
  date: string; // fecha del gasto, YYYY-MM-DD
  card: CardRules;
  cycleEnd: string;
  nextCycleCommitted: number;
  nextBudget: number;
  budgetsActive: boolean; // false: todavía se está midiendo, sin presupuesto por sobre
  free: number; // lo que te queda libre en este ciclo
};

// Aviso que se muestra mientras cargás un gasto, antes de guardarlo.
export function adviceFor(i: AdviceInput): Advice | null {
  if (!(i.amount > 0)) return null;

  const payDate = i.isCard ? dueFor(nextClosing(i.date, i.card), i.card) : i.date;

  // Con tarjeta puede caer en el próximo ciclo: no toca lo que te queda ahora.
  if (payDate > i.cycleEnd) {
    const committed = i.nextCycleCommitted + i.amount;
    const share = i.nextBudget > 0 ? committed / i.nextBudget : 0;
    return {
      text:
        `Con la tarjeta se paga el ${longDate(payDate)}, en tu próximo ciclo. No baja lo que te queda hoy, ` +
        `pero ese ciclo ya tendría ${formatARS(committed)} comprometidos (${Math.round(share * 100)}% de tus ${formatARS(i.nextBudget)} libres).`,
      tone: share > 1 ? "over" : share >= 0.7 ? "warn" : "ok",
    };
  }

  // Sin presupuestos: el gasto sale de lo que te queda libre en el ciclo.
  if (!i.budgetsActive) {
    const left = i.free - i.amount;
    return left < 0
      ? { text: `Con este gasto te pasás ${formatARS(-left)} de lo que te queda libre este ciclo.`, tone: "over" }
      : { text: `Sale de lo que te queda libre este ciclo: te quedarían ${formatARS(left)}.`, tone: "ok" };
  }

  if (!i.envelope) return null; // gastos fijos: no tienen sobre que controlar

  const after = i.envelope.budget - i.envelope.spent - i.amount;
  if (after < 0) {
    return {
      text: `Con este gasto te pasás ${formatARS(-after)} de ${i.envelope.name}. Saldría del Colchón.`,
      tone: "over",
    };
  }
  if (after < i.envelope.budget * 0.3) {
    return { text: `Ojo: te quedarían solo ${formatARS(after)} en ${i.envelope.name}.`, tone: "warn" };
  }
  return { text: `Entra bien: te quedarían ${formatARS(after)} en ${i.envelope.name}.`, tone: "ok" };
}
