"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
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

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

// Guarda el tema elegido (modo día o modo oscuro) en una cookie, para que el servidor lo conozca desde la primera carga.
export async function setThemeCookie(theme: string) {
  if (theme !== "day" && theme !== "dark") return;
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
