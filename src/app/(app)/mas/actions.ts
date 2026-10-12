"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { lastBusinessDay } from "@/lib/card-dates";
import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error: string | null; saved: boolean };

const validDay = (n: number) => Number.isInteger(n) && n >= 1 && n <= 31;

export async function updateSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const closingMode = String(formData.get("closing_mode") ?? "");
  const dueMode = String(formData.get("due_mode") ?? "");
  const closingDay = Number(formData.get("closing_day"));
  const dueDay = Number(formData.get("due_day"));
  const dueBusinessDay = Number(formData.get("due_business_day"));

  if (!["last_business_day", "fixed"].includes(closingMode)) return { error: "Elegí cómo cierra la tarjeta.", saved: false };
  if (!["business_day", "fixed"].includes(dueMode)) return { error: "Elegí cómo vence la tarjeta.", saved: false };
  if (closingMode === "fixed" && !validDay(closingDay)) {
    return { error: "El día de cierre tiene que estar entre 1 y 31.", saved: false };
  }
  if (dueMode === "fixed" && !validDay(dueDay)) {
    return { error: "El día de vencimiento tiene que estar entre 1 y 31.", saved: false };
  }
  if (dueMode === "business_day" && !(Number.isInteger(dueBusinessDay) && dueBusinessDay >= 1 && dueBusinessDay <= 20)) {
    return { error: "El día hábil de vencimiento tiene que estar entre 1 y 20.", saved: false };
  }

  const minRaw = String(formData.get("visa_min") ?? "").trim();
  const maxRaw = String(formData.get("visa_max") ?? "").trim();
  const visaMin = minRaw ? Number(minRaw) : null;
  const visaMax = maxRaw ? Number(maxRaw) : null;
  if ((visaMin === null) !== (visaMax === null)) {
    return { error: "Completá el mínimo y el máximo del resumen, o dejá los dos vacíos.", saved: false };
  }
  if (visaMin !== null && visaMax !== null) {
    if (!Number.isFinite(visaMin) || !Number.isFinite(visaMax) || visaMin <= 0 || visaMax < visaMin) {
      return { error: "El máximo del resumen tiene que ser mayor o igual al mínimo.", saved: false };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Volvé a entrar.", saved: false };

  // update (no upsert): solo toca los campos de la tarjeta.
  const { error } = await supabase
    .from("settings")
    .update({
      card_closing_day: closingMode === "fixed" ? closingDay : null,
      card_due_business_day: dueMode === "business_day" ? dueBusinessDay : null,
      ...(dueMode === "fixed" ? { card_due_day: dueDay } : {}),
    })
    .eq("user_id", user.id);
  if (error) return { error: "No se pudieron guardar los ajustes.", saved: false };

  // Aparte, para que el resto de los ajustes se guarde aunque falte correr la migración del rango.
  const { error: visaError } = await supabase
    .from("settings")
    .update({ visa_typical_min: visaMin, visa_typical_max: visaMax })
    .eq("user_id", user.id);
  if (visaError) return { error: `No se pudo guardar el rango de la Visa: ${visaError.message}`, saved: false };

  // Cambia cuándo cae cada gasto con tarjeta, así que se recalculan todas las pantallas.
  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

export type BudgetsState = { error: string | null; saved: boolean };

const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Fija el monto de cada sobre y la fecha desde la que rigen los presupuestos.
export async function updateBudgets(_prev: BudgetsState, formData: FormData): Promise<BudgetsState> {
  const fromRaw = String(formData.get("budgets_from") ?? "").trim();
  if (fromRaw && !/^\d{4}-\d{2}-\d{2}$/.test(fromRaw)) return { error: "La fecha no es válida.", saved: false };

  const amounts: { id: string; amount: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("amount_")) continue;
    const id = key.slice("amount_".length);
    const amount = Number(value);
    if (!isUUID(id)) return { error: "Hay un sobre que no es válido.", saved: false };
    if (!Number.isFinite(amount) || amount < 0) return { error: "Los montos no pueden ser negativos.", saved: false };
    amounts.push({ id, amount });
  }

  const floorRaw = String(formData.get("balance_floor") ?? "").trim();
  const floor = floorRaw ? Number(floorRaw) : null;
  if (floor !== null && (!Number.isFinite(floor) || floor < 0)) {
    return { error: "El piso no puede ser negativo.", saved: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Volvé a entrar.", saved: false };

  for (const a of amounts) {
    const { error } = await supabase.from("envelopes").update({ monthly_amount: a.amount }).eq("id", a.id);
    if (error) return { error: "No se pudieron guardar los montos.", saved: false };
  }
  const { error } = await supabase
    .from("settings")
    .update({ budgets_from: fromRaw || null })
    .eq("user_id", user.id);
  if (error) return { error: "No se pudo guardar la fecha.", saved: false };

  // Aparte: si falta la migración del piso, los topes igual se guardan.
  const { error: floorError } = await supabase.from("settings").update({ balance_floor: floor }).eq("user_id", user.id);
  if (floorError) return { error: `No se pudo guardar el piso: ${floorError.message}`, saved: false };

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

// Guarda el tema elegido (modo día o modo oscuro) en una cookie, para que el servidor lo conozca desde la primera carga.
export async function setThemeCookie(theme: string) {
  if (theme !== "day" && theme !== "dark") return;
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export type SimpleState = { error: string | null; saved: boolean };

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

// Fija con cuánta plata arranca tu cuenta y desde qué día se descuentan los gastos.
export async function saveOpeningBalance(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const balance = Number(formData.get("balance"));
  const on = String(formData.get("on") ?? "");
  if (!Number.isFinite(balance)) return { error: "Poné el saldo de tu cuenta.", saved: false };
  if (!isDate(on)) return { error: "La fecha no es válida.", saved: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Volvé a entrar.", saved: false };

  const { error } = await supabase
    .from("settings")
    .update({ opening_balance: balance, opening_balance_on: on })
    .eq("user_id", user.id);
  if (error) return { error: `No se pudo guardar el saldo: ${error.message}`, saved: false };

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

// Registra un sueldo: crea el ciclo que arranca ese día (o corrige el sueldo si ya existe).
// El ciclo termina el día anterior al próximo cobro (último día hábil del mes siguiente).
export async function saveSalary(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const amount = Number(formData.get("amount"));
  const on = String(formData.get("on") ?? "");
  if (!isDate(on)) return { error: "La fecha no es válida.", saved: false };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El sueldo tiene que ser mayor a cero.", saved: false };

  const [y, m] = on.split("-").map(Number);
  const nextPayday = m === 12 ? lastBusinessDay(y + 1, 1) : lastBusinessDay(y, m + 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Volvé a entrar.", saved: false };

  const { error } = await supabase
    .from("periods")
    .upsert(
      { user_id: user.id, start_date: on, end_date: addDays(nextPayday, -1), income: amount },
      { onConflict: "user_id,start_date" },
    );
  if (error) return { error: `No se pudo guardar el sueldo: ${error.message}`, saved: false };

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}
