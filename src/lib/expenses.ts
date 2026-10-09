import { getCardSettings, loadTransactions } from "@/lib/cashflow";
import { previousCycles, type Cycle } from "@/lib/cycles";
import { todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type ExpenseBase = "todos" | "necesidades";
export type ExpenseAverage = { amountArs: number; cyclesUsed: number; partial: boolean };

type FixedRow = {
  amount: number;
  categories: { kind: string } | null;
  payment_methods: { type: string } | null;
};

// Gasto mensual típico, para dimensionar el colchón. Usa los ciclos completos que tengan gastos
// cargados; si todavía no hay ninguno, estima con el ciclo en curso.
export async function averageMonthlyExpenses(base: ExpenseBase): Promise<ExpenseAverage | null> {
  const supabase = await createClient();
  const today = todayISO();

  const { data: period } = await supabase
    .from("periods")
    .select("start_date, end_date")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();
  if (!period) return null;

  const current: Cycle = { start: period.start_date, end: period.end_date };
  const previous = previousCycles(current.start, 3);
  const card = await getCardSettings();

  const [all, { data: fixedData }] = await Promise.all([
    loadTransactions({ start_date: previous[0].start, end_date: current.end }, card),
    supabase.from("fixed_expenses").select("amount, categories(kind), payment_methods(type)").eq("active", true),
  ]);

  const counts = (kind: string | null) => kind === "necesidad" || (base === "todos" && kind === "gusto");

  // Los fijos con tarjeta ya vienen en el resumen: no se suman dos veces.
  const fixedPerCycle = ((fixedData ?? []) as unknown as FixedRow[])
    .filter((f) => f.payment_methods?.type !== "tarjeta_credito" && counts(f.categories?.kind ?? null))
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const totalFor = (c: Cycle) => {
    const txs = all.filter((t) => t.cashDate >= c.start && t.cashDate <= c.end);
    if (txs.length === 0) return null;
    return fixedPerCycle + txs.filter((t) => counts(t.kind)).reduce((sum, t) => sum + t.amount, 0);
  };

  const complete = previous.map(totalFor).filter((v): v is number => v !== null);
  if (complete.length > 0) {
    return { amountArs: complete.reduce((s, v) => s + v, 0) / complete.length, cyclesUsed: complete.length, partial: false };
  }
  const now = totalFor(current);
  return now === null ? null : { amountArs: now, cyclesUsed: 1, partial: true };
}
