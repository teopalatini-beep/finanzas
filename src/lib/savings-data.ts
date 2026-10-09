import type { Acc } from "@/lib/savings";
import { createClient } from "@/lib/supabase/server";

export type Account = { id: string; name: string; annualRate: number; balance: number };
export type Entry = {
  id: string;
  accountId: string;
  accountName: string;
  occurredOn: string;
  amountUsd: number;
  fxRate: number | null;
  type: "aporte" | "retiro" | "ajuste";
  note: string | null;
  goalId: string | null;
};
// Una meta tiene un monto fijo, o N meses de gastos, o ninguno de los dos (sin tope).
export type Goal = {
  id: string;
  name: string;
  target: number | null;
  targetMonths: number | null;
  expenseBase: "todos" | "necesidades";
  initialAmount: number;
  targetDate: string | null;
};

export type SavingsData = {
  accounts: Account[];
  entries: Entry[];
  goals: Goal[];
  monthlyGoalUsd: number;
  contribAccountId: string | null; // a dónde van los aportes nuevos por defecto
  contribGoalId: string | null; // para qué meta fue el último aporte
  lastFx: { rate: number; on: string } | null;
};

export const toAccs = (accounts: Account[]): Acc[] =>
  accounts.map((a) => ({ id: a.id, balance: a.balance, annualRate: a.annualRate }));

export async function loadSavings(): Promise<SavingsData> {
  const supabase = await createClient();
  const [{ data: accs }, { data: ents }, { data: goalRows }, { data: settings }] = await Promise.all([
    supabase.from("savings_accounts").select("id, name, annual_rate, opening_balance").order("created_at"),
    supabase
      .from("savings_entries")
      .select("id, account_id, occurred_on, amount_usd, fx_rate, entry_type, note, goal_id")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("goals")
      .select("id, name, target_amount, target_months, expense_base, initial_amount, target_date")
      .order("created_at"),
    supabase.from("settings").select("monthly_savings_usd").maybeSingle(),
  ]);

  const names = new Map((accs ?? []).map((a) => [a.id, a.name as string]));
  const entries: Entry[] = (ents ?? []).map((e) => ({
    id: e.id,
    accountId: e.account_id,
    accountName: names.get(e.account_id) ?? "",
    occurredOn: e.occurred_on,
    amountUsd: Number(e.amount_usd),
    fxRate: e.fx_rate === null ? null : Number(e.fx_rate),
    type: e.entry_type,
    note: e.note,
    goalId: e.goal_id,
  }));

  const accounts: Account[] = (accs ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    annualRate: Number(a.annual_rate),
    balance: Number(a.opening_balance) + entries.filter((e) => e.accountId === a.id).reduce((s, e) => s + e.amountUsd, 0),
  }));

  const lastAporte = entries.find((e) => e.type === "aporte");
  const lastWithFx = entries.find((e) => e.fxRate !== null);

  return {
    accounts,
    entries,
    goals: (goalRows ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      target: g.target_amount === null ? null : Number(g.target_amount),
      targetMonths: g.target_months,
      expenseBase: g.expense_base,
      initialAmount: Number(g.initial_amount),
      targetDate: g.target_date,
    })),
    monthlyGoalUsd: Number(settings?.monthly_savings_usd ?? 0),
    contribAccountId: lastAporte?.accountId ?? accounts[0]?.id ?? null,
    contribGoalId: lastAporte?.goalId ?? null,
    lastFx: lastWithFx ? { rate: lastWithFx.fxRate!, on: lastWithFx.occurredOn } : null,
  };
}
