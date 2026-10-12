"use client";

import { saveOpeningBalance, saveSalary, type SimpleState } from "@/app/(app)/mas/actions";
import { MoneyInput } from "@/components/MoneyInput";
import { useActionForm } from "@/components/useActionForm";

const field =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-accent";
const button =
  "min-h-11 rounded-xl bg-accent-strong px-5 font-semibold text-white transition-opacity disabled:opacity-60";

function Feedback({ state }: { state: SimpleState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-over-fg">
          {state.error}
        </p>
      )}
      {state.saved && <p className="text-sm font-medium text-ok-fg">Guardado.</p>}
    </>
  );
}

export function OpeningBalanceForm({ balance, on, today }: { balance: number | null; on: string | null; today: string }) {
  const [state, onSubmit, pending] = useActionForm<SimpleState>(saveOpeningBalance, { error: null, saved: false });
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium">Lo que tenés hoy en la cuenta ($)</span>
        <MoneyInput name="balance" initial={balance === null ? "" : String(balance)} allowNegative required className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Fecha de ese saldo</span>
        <input name="on" type="date" defaultValue={on ?? today} required className={field} />
        <span className="text-xs text-muted">
          Se descuentan los gastos desde esa fecha inclusive: cargá solo los que hiciste después de mirar tu saldo.
        </span>
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Guardando…" : "Guardar saldo"}
      </button>
    </form>
  );
}

export function SalaryForm({ today }: { today: string }) {
  const [state, onSubmit, pending] = useActionForm<SimpleState>(saveSalary, { error: null, saved: false });
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium">Día que cobraste</span>
        <input name="on" type="date" defaultValue={today} required className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Sueldo ($)</span>
        <MoneyInput name="amount" required className={field} />
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Guardando…" : "Guardar sueldo"}
      </button>
    </form>
  );
}
