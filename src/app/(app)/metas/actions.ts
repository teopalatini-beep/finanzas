"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error: string | null; ok: boolean };
const fail = (error: string): FormState => ({ error, ok: false });
const done: FormState = { error: null, ok: true };

const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

function refresh() {
  revalidatePath("/metas");
  revalidatePath("/proyeccion");
}

export async function addEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const accountId = String(formData.get("account_id") ?? "");
  const type = String(formData.get("entry_type") ?? "");
  const amount = Number(formData.get("amount"));
  const fxRaw = String(formData.get("fx_rate") ?? "").trim();
  const fx = fxRaw === "" ? null : Number(fxRaw);
  const date = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const goalRaw = String(formData.get("goal_id") ?? "");

  if (goalRaw && !isUUID(goalRaw)) return fail("La meta no es válida.");
  if (!isUUID(accountId)) return fail("Elegí la cuenta.");
  if (!["aporte", "retiro", "ajuste"].includes(type)) return fail("Elegí el tipo de movimiento.");
  if (!Number.isFinite(amount) || amount === 0) return fail("Ingresá un monto en dólares.");
  if (type !== "ajuste" && amount < 0) return fail("En aportes y retiros el monto va en positivo.");
  if (!isDate(date)) return fail("La fecha no es válida.");
  if (fx !== null && (!Number.isFinite(fx) || fx <= 0)) return fail("La cotización no es válida.");
  if (type !== "ajuste" && fx === null) return fail("Cargá la cotización de ese día.");

  const supabase = await createClient();
  const { error } = await supabase.from("savings_entries").insert({
    account_id: accountId,
    occurred_on: date,
    amount_usd: type === "retiro" ? -amount : amount,
    fx_rate: fx,
    entry_type: type,
    note,
    // Solo los aportes y retiros se asignan a una meta; el rendimiento queda sin asignar.
    goal_id: type !== "ajuste" && goalRaw ? goalRaw : null,
  });
  if (error) return fail("No se pudo guardar el movimiento.");

  refresh();
  return done;
}

export async function deleteEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!isUUID(id)) return;
  const supabase = await createClient();
  await supabase.from("savings_entries").delete().eq("id", id);
  refresh();
}

export async function createGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const goalType = String(formData.get("goal_type") ?? "");
  const target = Number(formData.get("target"));
  const months = Number(formData.get("target_months"));
  const base = String(formData.get("expense_base") ?? "todos");
  const initial = Number(formData.get("initial_amount") || 0);
  const dateRaw = String(formData.get("target_date") ?? "").trim();

  if (!name) return fail("Poné un nombre para la meta.");
  if (!["fixed", "months", "open"].includes(goalType)) return fail("Elegí el tipo de meta.");
  if (goalType === "fixed" && !(Number.isFinite(target) && target > 0)) {
    return fail("El monto de la meta tiene que ser mayor a cero.");
  }
  if (goalType === "months" && !(Number.isInteger(months) && months >= 1 && months <= 120)) {
    return fail("Los meses de gastos tienen que estar entre 1 y 120.");
  }
  if (!["todos", "necesidades"].includes(base)) return fail("Elegí qué gastos cuentan.");
  if (!Number.isFinite(initial) || initial < 0) return fail("Lo que ya tenés ahorrado no puede ser negativo.");
  if (dateRaw && !isDate(dateRaw)) return fail("La fecha no es válida.");

  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert({
    name,
    target_amount: goalType === "fixed" ? target : null,
    target_months: goalType === "months" ? months : null,
    expense_base: base,
    initial_amount: initial,
    target_date: dateRaw || null,
  });
  if (error) return fail("No se pudo crear la meta.");

  refresh();
  return done;
}

export async function deleteGoal(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!isUUID(id)) return;
  const supabase = await createClient();
  await supabase.from("goals").delete().eq("id", id);
  refresh();
}

export async function updateRate(_prev: FormState, formData: FormData): Promise<FormState> {
  const accountId = String(formData.get("account_id") ?? "");
  const rate = Number(formData.get("annual_rate"));
  if (!isUUID(accountId)) return fail("Cuenta no válida.");
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return fail("El rendimiento va entre 0 y 100.");

  const supabase = await createClient();
  const { error } = await supabase.from("savings_accounts").update({ annual_rate: rate }).eq("id", accountId);
  if (error) return fail("No se pudo guardar el rendimiento.");

  refresh();
  return done;
}

export async function updateMonthlyGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const usd = Number(formData.get("monthly_usd"));
  if (!Number.isFinite(usd) || usd < 0) return fail("El objetivo no puede ser negativo.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Tu sesión venció. Volvé a entrar.");

  // update (no upsert): no pisa el cierre ni el vencimiento de la tarjeta.
  const { error } = await supabase.from("settings").update({ monthly_savings_usd: usd }).eq("user_id", user.id);
  if (error) return fail("No se pudo guardar el objetivo.");

  refresh();
  return done;
}
