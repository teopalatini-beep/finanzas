"use server";

import { extractSpoken } from "@/lib/extract-spoken";
import type { SpokenState } from "@/lib/spoken-types";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Interpreta el texto dictado y devuelve un borrador para completar el formulario.
// No guarda nada: el gasto se guarda recién cuando lo revisás y lo confirmás.
export async function interpretSpoken(_prev: SpokenState, formData: FormData): Promise<SpokenState> {
  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 3) return { status: "error", error: "Contame el gasto: qué compraste y cuánto fue." };
  if (text.length > 500) return { status: "error", error: "Es muy largo: contame un solo gasto por vez." };

  // Gasta saldo de la API: se exige sesión de forma explícita, sin depender solo del proxy.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Tu sesión venció. Volvé a entrar." };

  const [{ data: envelopes }, { data: methods }] = await Promise.all([
    supabase.from("envelopes").select("name, categories(id, name, kind, description)").order("sort_order"),
    supabase.from("payment_methods").select("id, name, type").order("created_at"),
  ]);

  type Env = { name: string; categories: { id: string; name: string; kind: string; description: string | null }[] };
  const categories = ((envelopes ?? []) as Env[]).flatMap((e) =>
    e.categories.map((c) => ({
      id: c.id,
      label: `${e.name} > ${c.name} (${c.kind})${c.description ? `: ${c.description}` : ""}`,
    })),
  );
  const validCategories = new Set(categories.map((c) => c.id));
  const validMethods = new Set((methods ?? []).map((m) => m.id));

  const today = todayISO();
  const weekday = WEEKDAYS[new Date(`${today}T12:00:00Z`).getUTCDay()];

  const result = await extractSpoken({ text, today, weekday, categories, methods: methods ?? [] });
  if (!result.ok) return { status: "error", error: result.error };

  const d = result.data;
  if (d.currency === "USD") {
    return { status: "error", error: "Mencionaste dólares: por ahora los gastos se cargan en pesos." };
  }

  const validDate = d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.date <= today ? d.date : null;
  const installments = d.installments && d.installments >= 2 && d.installments <= 48 ? Math.round(d.installments) : null;

  return {
    status: "ready",
    key: Date.now(),
    heard: text,
    draft: {
      amount: d.amount && d.amount > 0 ? d.amount : null,
      description: d.description.slice(0, 120),
      categoryId: d.category_id && validCategories.has(d.category_id) ? d.category_id : null,
      methodId: d.payment_method_id && validMethods.has(d.payment_method_id) ? d.payment_method_id : null,
      date: validDate,
      installments,
      more: d.more_than_one,
    },
  };
}
