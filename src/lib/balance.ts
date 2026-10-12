import { getCardSettings, loadTransactions } from "@/lib/cashflow";
import { loadSavings } from "@/lib/savings-data";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";

export type BalanceData = {
  balance: number;
  openingBalance: number;
  openingOn: string;
  salaries: number; // sueldos de ciclos que arrancaron después del saldo inicial
  spent: number; // gastos que ya salieron de tu cuenta (tarjeta: el día que vence el resumen)
  saved: number; // lo que pasaste a ahorro, en pesos (aportes menos retiros)
};

// "En tu cuenta hoy": saldo inicial + sueldos cargados − lo que salió desde esa fecha.
// Devuelve null si todavía no cargaste el saldo (o falta correr la migración).
export async function getBalance(): Promise<BalanceData | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("settings")
    .select("opening_balance, opening_balance_on")
    .maybeSingle();
  if (error || row?.opening_balance == null || !row.opening_balance_on) return null;

  const openingOn: string = row.opening_balance_on;
  const today = todayISO();
  const card = await getCardSettings();

  const [{ data: periods }, txs, savings] = await Promise.all([
    supabase.from("periods").select("income").gt("start_date", openingOn).lte("start_date", today),
    loadTransactions({ start_date: openingOn, end_date: today }, card),
    loadSavings(),
  ]);

  const salaries = (periods ?? []).reduce((sum, p) => sum + Number(p.income), 0);
  const spent = txs.filter((t) => t.cashDate >= openingOn && t.cashDate <= today).reduce((sum, t) => sum + t.amount, 0);
  const saved = savings.entries
    .filter((e) => e.occurredOn >= openingOn && e.occurredOn <= today && (e.type === "aporte" || e.type === "retiro"))
    .reduce((sum, e) => {
      const ars = e.amountUsd * (e.fxRate ?? savings.lastFx?.rate ?? 0);
      return sum + (e.type === "aporte" ? ars : -ars);
    }, 0);

  const openingBalance = Number(row.opening_balance);
  return {
    balance: openingBalance + salaries - spent - saved,
    openingBalance,
    openingOn,
    salaries,
    spent,
    saved,
  };
}
