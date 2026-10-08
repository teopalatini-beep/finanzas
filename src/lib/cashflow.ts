import { dueFor, nextClosing, type CardRules } from "@/lib/card-dates";
import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

// "Fecha de pago": cuándo sale realmente la plata de tu cuenta.
//  - Efectivo / débito / transferencia: el mismo día del gasto.
//  - Tarjeta de crédito: el vencimiento del resumen donde cae esa compra.

export type CardSettings = CardRules;

export async function getCardSettings(): Promise<CardSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("card_closing_day, card_due_day, card_due_business_day")
    .maybeSingle();
  // Sin configuración guardada: cierra el último día hábil y vence al 7.º día hábil del mes siguiente.
  return {
    closingDay: data ? data.card_closing_day : null,
    dueDay: data?.card_due_day ?? null,
    dueBusinessDay: data ? data.card_due_business_day : 7,
  };
}

export type CycleTx = {
  id: string;
  occurred_on: string;
  cashDate: string;
  isCard: boolean;
  amount: number;
  description: string | null;
  installment_number: number | null;
  installments_count: number | null;
  paymentMethod: string | null;
  categoryId: string | null;
  categoryName: string | null;
  kind: string | null;
  envelopeName: string | null;
  emoji: string | null;
  envelopeIsFixed: boolean;
};

type Row = {
  id: string;
  occurred_on: string;
  amount: number;
  description: string | null;
  installment_number: number | null;
  category_id: string | null;
  payment_methods: { name: string; type: string } | null;
  documents: { closing_date: string | null } | null;
  categories: {
    name: string;
    kind: string;
    envelopes: { name: string; emoji: string | null; is_fixed: boolean } | null;
  } | null;
  installment_plans: { installments_count: number } | null;
};

// Todos los gastos del rango con su fecha de pago calculada (sin filtrar por ciclo).
export async function loadTransactions(
  period: { start_date: string; end_date: string },
  card: CardSettings,
): Promise<CycleTx[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select(
      "id, occurred_on, amount, description, installment_number, category_id, payment_methods(name, type), documents(closing_date), categories(name, kind, envelopes(name, emoji, is_fixed)), installment_plans(installments_count)",
    )
    // Una compra con tarjeta se paga después de hacerla, y una cuota puede traer una fecha vieja.
    .gte("occurred_on", addDays(period.start_date, -370))
    .lte("occurred_on", period.end_date)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as Row[]).map((r): CycleTx => {
      const isCard = r.payment_methods?.type === "tarjeta_credito";
      const closing = r.documents?.closing_date ?? nextClosing(r.occurred_on, card);
      return {
        id: r.id,
        occurred_on: r.occurred_on,
        cashDate: isCard ? dueFor(closing, card) : r.occurred_on,
        isCard,
        amount: Number(r.amount),
        description: r.description,
        installment_number: r.installment_number,
        installments_count: r.installment_plans?.installments_count ?? null,
        paymentMethod: r.payment_methods?.name ?? null,
        categoryId: r.category_id,
        categoryName: r.categories?.name ?? null,
        kind: r.categories?.kind ?? null,
        envelopeName: r.categories?.envelopes?.name ?? null,
        emoji: r.categories?.envelopes?.emoji ?? null,
        envelopeIsFixed: r.categories?.envelopes?.is_fixed ?? false,
      };
  });
}

// Gastos cuya fecha de pago cae dentro del ciclo.
export async function loadCycle(
  period: { start_date: string; end_date: string },
  card: CardSettings,
): Promise<CycleTx[]> {
  const all = await loadTransactions(period, card);
  return all.filter((t) => t.cashDate >= period.start_date && t.cashDate <= period.end_date);
}

// Lo ya cargado con tarjeta que se paga DESPUÉS de este ciclo (afecta al próximo).
export async function loadNextCycleCommitment(
  period: { start_date: string; end_date: string },
  card: CardSettings,
): Promise<{ amount: number; count: number; firstDueDate: string | null }> {
  const all = await loadTransactions(period, card);
  const later = all.filter((t) => t.cashDate > period.end_date);
  return {
    amount: later.reduce((sum, t) => sum + t.amount, 0),
    count: later.length,
    firstDueDate: later.length ? later.map((t) => t.cashDate).sort()[0] : null,
  };
}
