import { previousCycles, type Cycle } from "@/lib/cycles";
import { averageMonthlyExpenses, type ExpenseAverage, type ExpenseBase } from "@/lib/expenses";
import { monthsBetween } from "@/lib/dates";
import { formatARS } from "@/lib/format";
import { monthsToTarget, project, requiredMonthly } from "@/lib/savings";
import type { Goal, SavingsData } from "@/lib/savings-data";
import { createClient } from "@/lib/supabase/server";

export type GoalView = {
  goal: Goal;
  saved: number; // USD juntados para esta meta
  targetUsd: number | null; // null = sin tope, o no se pudo calcular todavía
  targetNote: string | null; // cómo se calculó el monto, o por qué no se pudo
  thisCycle: number; // USD asignados a esta meta en el ciclo actual
  pace: number; // USD por mes, a tu ritmo actual
  monthsToGo: number | null; // 0 = ya llegaste, null = no llegás o no hay tope
  needMonthly: number | null; // USD por mes para llegar a tiempo
  atDate: number | null; // USD que tendrías en la fecha de la meta, a tu ritmo
};

// Une las metas con lo que se asignó a cada una. Los aportes nuevos rinden como la cuenta de destino.
export async function buildGoalViews(data: SavingsData, today: string): Promise<GoalView[]> {
  if (data.goals.length === 0) return [];

  const supabase = await createClient();
  const { data: period } = await supabase
    .from("periods")
    .select("start_date, end_date")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  const current: Cycle | null = period ? { start: period.start_date, end: period.end_date } : null;
  const previous = current ? previousCycles(current.start, 3) : [];
  const fx = data.lastFx?.rate ?? null;
  const rate = data.accounts.find((a) => a.id === data.contribAccountId)?.annualRate ?? 0;

  const averages = new Map<ExpenseBase, ExpenseAverage | null>();
  for (const g of data.goals) {
    if (g.targetMonths && !averages.has(g.expenseBase)) {
      averages.set(g.expenseBase, await averageMonthlyExpenses(g.expenseBase));
    }
  }

  return data.goals.map((goal) => {
    const mine = data.entries.filter((e) => e.goalId === goal.id);
    const saved = goal.initialAmount + mine.reduce((s, e) => s + e.amountUsd, 0);

    let targetUsd = goal.target;
    let targetNote: string | null = null;
    if (goal.targetMonths) {
      const avg = averages.get(goal.expenseBase) ?? null;
      if (!avg) {
        targetNote = "Todavía no hay gastos cargados para calcular el monto.";
      } else if (!fx) {
        targetNote = "Cargá una cotización (en un aporte) para pasar tus gastos a dólares.";
      } else {
        targetUsd = (goal.targetMonths * avg.amountArs) / fx;
        targetNote =
          `${goal.targetMonths} ${goal.targetMonths === 1 ? "mes" : "meses"} de gastos: ${formatARS(avg.amountArs)} por mes ` +
          `(${goal.expenseBase === "todos" ? "todos tus gastos" : "solo necesidades"}), al dólar de $${fx}` +
          (avg.partial ? ". Estimado con el ciclo en curso." : ".");
      }
    }

    const aportesIn = (c: Cycle) =>
      mine
        .filter((e) => e.type === "aporte" && e.occurredOn >= c.start && e.occurredOn <= c.end)
        .reduce((s, e) => s + e.amountUsd, 0);
    const thisCycle = current ? aportesIn(current) : 0;
    const past = previous.map(aportesIn).filter((v) => v > 0);
    const pace = past.length > 0 ? past.reduce((s, v) => s + v, 0) / past.length : thisCycle;

    const acc = [{ id: "g", balance: saved, annualRate: rate }];
    const monthsLeft = goal.targetDate ? monthsBetween(today, goal.targetDate) : null;

    return {
      goal,
      saved,
      targetUsd,
      targetNote,
      thisCycle,
      pace,
      monthsToGo: targetUsd ? monthsToTarget(acc, "g", pace, targetUsd) : null,
      needMonthly:
        targetUsd && monthsLeft !== null && monthsLeft > 0 ? requiredMonthly(acc, "g", targetUsd, monthsLeft) : null,
      atDate: monthsLeft !== null && monthsLeft > 0 ? project(acc, "g", pace, monthsLeft)[monthsLeft].total : null,
    };
  });
}
