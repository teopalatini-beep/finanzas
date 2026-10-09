"use client";

import { useActionState } from "react";
import { updateBudgets, type BudgetsState } from "@/app/(app)/mas/actions";

type EnvelopeOption = { id: string; name: string; emoji: string; amount: number };

const field =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-ok";

export function BudgetsForm({ envelopes, budgetsFrom }: { envelopes: EnvelopeOption[]; budgetsFrom: string | null }) {
  const [state, action, pending] = useActionState<BudgetsState, FormData>(updateBudgets, {
    error: null,
    saved: false,
  });
  const total = envelopes.reduce((sum, e) => sum + e.amount, 0);

  return (
    <form action={action} className="space-y-4">
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
            <input
              name={`amount_${e.id}`}
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              defaultValue={e.amount}
              required
              className={field}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">Suma de los sobres que tenés guardada hoy: ${total.toLocaleString("es-AR")}.</p>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-over">
          {state.error}
        </p>
      )}
      {state.saved && <p className="text-sm font-medium text-ok">Guardado.</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-ok px-5 font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar presupuestos"}
      </button>
    </form>
  );
}
