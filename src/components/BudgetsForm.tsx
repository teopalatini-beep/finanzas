"use client";

import { updateBudgets, type BudgetsState } from "@/app/(app)/mas/actions";
import { MoneyInput } from "@/components/MoneyInput";
import { useActionForm } from "@/components/useActionForm";

type EnvelopeOption = { id: string; name: string; emoji: string; amount: number };

const field =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-ok";

export function BudgetsForm({ envelopes, budgetsFrom }: { envelopes: EnvelopeOption[]; budgetsFrom: string | null }) {
  const [state, onSubmit, pending] = useActionForm<BudgetsState>(updateBudgets, { error: null, saved: false });
  const total = envelopes.reduce((sum, e) => sum + e.amount, 0);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Los presupuestos rigen desde</span>
        <input name="budgets_from" type="date" defaultValue={budgetsFrom ?? ""} className={field} />
        <span className="text-xs text-muted">
          Antes de esa fecha la app solo mide cuánto gastás. Si lo dejás vacío, rigen siempre.
        </span>
      </label>

      <div className="space-y-3">
        {envelopes.map((e) => (
          <label key={e.id} className="block">
            <span className="text-sm font-medium">
              <span aria-hidden>{e.emoji}</span> {e.name} (por mes)
            </span>
            <MoneyInput name={`amount_${e.id}`} initial={String(e.amount)} required className={field} />
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">Suma de los sobres que tenés guardada hoy: ${total.toLocaleString("es-AR")}.</p>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-over-fg">
          {state.error}
        </p>
      )}
      {state.saved && <p className="text-sm font-medium text-ok-fg">Guardado.</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-ok-strong px-5 font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar presupuestos"}
      </button>
    </form>
  );
}
