import type { CardRules } from "@/lib/card-dates";
import { getCardSettings, loadCycle, loadNextCycleCommitment } from "@/lib/cashflow";
import { loadSavings } from "@/lib/savings-data";
import { createClient } from "@/lib/supabase/server";
import { addDays, addMonths, daysBetween, monthsBetween, monthName, todayISO } from "@/lib/dates";

export type EnvelopeSummary = {
  id: string;
  name: string;
  emoji: string;
  budget: number;
  spent: number;
};

export type InstallmentSummary = {
  description: string;
  perMonth: number;
  current: number; // cuota de este mes (ej. 3)
  total: number; // ej. 6
  remaining: number; // cuotas que faltan después de la de este mes
  lastMonth: string; // "enero"
};

export type HoyData = {
  period: { start: string; end: string; nextPayday: string; daysLeft: number; income: number };
  envelopes: EnvelopeSummary[];
  installments: InstallmentSummary[];
  nextCycle: { amount: number; count: number; firstDueDate: string | null };
  // Para "¿Puedo comprarlo?": cómo se paga y qué ya está comprometido para el próximo ciclo.
  methods: { id: string; name: string; type: string }[];
  card: CardRules;
  nextCycleCommitted: number;
  today: string;
  todayExpenses: { total: number; items: TodayItem[] };
  // Presupuestos: antes de budgetsFrom la app solo mide cuánto gastás.
  budgetsActive: boolean;
  budgetsFrom: string | null;
  // Lo que te queda libre: sueldo − fijos − ahorro − lo gastado en el ciclo.
  free: { amount: number; fixed: number; savings: number; spent: number };
  nextBase: number; // sobre qué monto se mide el próximo ciclo (presupuestos, o lo libre si todavía no rigen)
};

export type TodayItem = {
  id: string;
  title: string;
  amount: number;
  emoji: string;
  method: string | null;
};

// Devuelve null si todavía no hay un ciclo vigente (ej. no corriste seed.sql).
export async function getHoyData(): Promise<HoyData | null> {
  const supabase = await createClient();
  const today = todayISO();

  const { data: period } = await supabase
    .from("periods")
    .select("start_date, end_date, income")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  if (!period) return null;

  const card = await getCardSettings();
  const nextCycle = await loadNextCycleCommitment(period, card);

  const [{ data: envelopes }, cycleTxs, { data: plans }, { data: methods }] = await Promise.all([
    supabase
      .from("envelopes")
      .select("id, name, emoji, monthly_amount, categories(id)")
      .eq("is_fixed", false)
      .order("sort_order"),
    // Gastos por fecha de pago (la tarjeta cuenta cuando vence el resumen).
    loadCycle(period, card),
    supabase
      .from("installment_plans")
      .select("description, total_amount, installments_count, first_installment"),
    supabase.from("payment_methods").select("id, name, type").order("created_at"),
  ]);

  // Gastado por sobre: cada gasto apunta a una categoría, y la categoría a un sobre.
  const spentByCategory = new Map<string, number>();
  for (const t of cycleTxs) {
    if (!t.categoryId) continue;
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amount);
  }

  const envelopeSummaries: EnvelopeSummary[] = (envelopes ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    emoji: e.emoji ?? "💰",
    budget: Number(e.monthly_amount),
    spent: (e.categories ?? []).reduce((sum, c) => sum + (spentByCategory.get(c.id) ?? 0), 0),
  }));

  const installments: InstallmentSummary[] = [];
  for (const p of plans ?? []) {
    const current = monthsBetween(p.first_installment, today) + 1;
    if (current < 1 || current > p.installments_count) continue; // todavía no empezó o ya terminó
    installments.push({
      description: p.description,
      perMonth: Number(p.total_amount) / p.installments_count,
      current,
      total: p.installments_count,
      remaining: p.installments_count - current,
      lastMonth: monthName(addMonths(p.first_installment, p.installments_count - 1)),
    });
  }

  // Lo que cargaste hoy (por fecha del gasto, sin importar cuándo se paga).
  const { data: todayRows } = await supabase
    .from("transactions")
    .select("id, amount, description, categories(name, envelopes(emoji)), payment_methods(name)")
    .eq("occurred_on", today)
    .order("created_at", { ascending: false });

  type TodayRow = {
    id: string;
    amount: number;
    description: string | null;
    categories: { name: string; envelopes: { emoji: string | null } | null } | null;
    payment_methods: { name: string } | null;
  };
  const todayItems: TodayItem[] = ((todayRows ?? []) as unknown as TodayRow[]).map((r) => ({
    id: r.id,
    title: r.description ?? r.categories?.name ?? "Gasto",
    amount: Number(r.amount),
    emoji: r.categories?.envelopes?.emoji ?? "💰",
    method: r.payment_methods?.name ?? null,
  }));

  // ---- Libre del ciclo (para cuando todavía no hay presupuestos) ----
  const [{ data: settingsRow }, { data: fixedRows }, savings] = await Promise.all([
    supabase.from("settings").select("budgets_from").maybeSingle(),
    supabase.from("fixed_expenses").select("amount, payment_methods(type)").eq("active", true),
    loadSavings(),
  ]);
  const budgetsFrom: string | null = settingsRow?.budgets_from ?? null;
  const budgetsActive = !budgetsFrom || period.start_date >= budgetsFrom;

  // Los fijos con tarjeta ya vienen en el resumen: se suman solo los que no pasan por la tarjeta.
  const fixedOffCard = ((fixedRows ?? []) as unknown as { amount: number; payment_methods: { type: string } | null }[])
    .filter((f) => f.payment_methods?.type !== "tarjeta_credito")
    .reduce((sum, f) => sum + Number(f.amount), 0);

  // Ahorro: lo que ya aportaste este ciclo (en USD × tu cotización) o el objetivo, lo que sea mayor.
  const aportadoArs = savings.entries
    .filter((e) => e.type === "aporte" && e.occurredOn >= period.start_date && e.occurredOn <= period.end_date)
    .reduce((sum, e) => sum + e.amountUsd * (e.fxRate ?? savings.lastFx?.rate ?? 0), 0);
  const reservadoArs = savings.lastFx ? savings.monthlyGoalUsd * savings.lastFx.rate : 0;
  const savingsArs = Math.max(aportadoArs, reservadoArs);

  const income = Number(period.income);
  const spentCycle = cycleTxs.reduce((sum, t) => sum + t.amount, 0);
  const nextStart = addDays(period.end_date, 1);
  const nextActive = !budgetsFrom || nextStart >= budgetsFrom;

  const nextPayday = addDays(period.end_date, 1);
  return {
    period: {
      start: period.start_date,
      end: period.end_date,
      nextPayday,
      daysLeft: daysBetween(today, nextPayday),
      income: Number(period.income),
    },
    envelopes: envelopeSummaries,
    installments,
    nextCycle,
    methods: methods ?? [],
    card,
    // Tarjeta ya cargada + una cuota más de cada plan que sigue abierto.
    nextCycleCommitted:
      nextCycle.amount + installments.filter((i) => i.remaining > 0).reduce((sum, i) => sum + i.perMonth, 0),
    today,
    todayExpenses: { total: todayItems.reduce((sum, i) => sum + i.amount, 0), items: todayItems },
    budgetsActive,
    budgetsFrom,
    free: { amount: income - fixedOffCard - savingsArs - spentCycle, fixed: fixedOffCard, savings: savingsArs, spent: spentCycle },
    nextBase: nextActive
      ? envelopeSummaries.reduce((sum, e) => sum + e.budget, 0)
      : income - fixedOffCard - savingsArs,
  };
}
