"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addEntry,
  createGoal,
  updateMonthlyGoal,
  updateRate,
  type FormState,
} from "@/app/(app)/metas/actions";

const initial: FormState = { error: null, ok: false };
const field =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-ok";
const primary =
  "min-h-11 w-full rounded-xl bg-ok px-5 font-semibold text-white transition-opacity disabled:opacity-60";

type AccountOption = { id: string; name: string };

// Limpia el formulario cuando se guardó bien.
function useResetOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

function Feedback({ state, okText }: { state: FormState; okText: string }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-over">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm font-medium text-ok">{okText}</p>}
    </>
  );
}

export function EntryForm({
  accounts,
  defaultAccountId,
  today,
  lastFx,
}: {
  accounts: AccountOption[];
  defaultAccountId: string | null;
  today: string;
  lastFx: number | null;
}) {
  const [state, action, pending] = useActionState(addEntry, initial);
  const ref = useResetOnSuccess(state);
  const [type, setType] = useState("aporte");

  return (
    <form ref={ref} action={action} className="space-y-3">
      <div className="flex gap-2" role="group" aria-label="Tipo de movimiento">
        {[
          ["aporte", "Aporte"],
          ["retiro", "Retiro"],
          ["ajuste", "Rendimiento"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            onClick={() => setType(value)}
            className={`min-h-10 flex-1 rounded-lg border text-sm font-medium ${
              type === value ? "border-ok bg-ok text-white" : "border-border bg-background"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="entry_type" value={type} />

      <label className="block">
        <span className="text-sm font-medium">Cuenta</span>
        <select name="account_id" defaultValue={defaultAccountId ?? ""} required className={field}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">Monto en USD</span>
          <input name="amount" type="number" step="any" inputMode="decimal" required className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">
            Cotización{type === "ajuste" ? " (opcional)" : ""}
          </span>
          <input
            name="fx_rate"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder={lastFx ? String(lastFx) : "$ por dólar"}
            required={type !== "ajuste"}
            className={field}
          />
        </label>
      </div>
      {type === "ajuste" && (
        <p className="text-xs text-muted">
          Usalo para sumar el rendimiento que te acreditaron, o para corregir el saldo (podés poner un monto negativo).
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">Fecha</span>
          <input name="date" type="date" defaultValue={today} required className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Nota (opcional)</span>
          <input name="note" type="text" maxLength={120} className={field} />
        </label>
      </div>

      <Feedback state={state} okText="Guardado." />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Guardando…" : "Guardar movimiento"}
      </button>
    </form>
  );
}

export function GoalForm({ accounts }: { accounts: AccountOption[] }) {
  const [state, action, pending] = useActionState(createGoal, initial);
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium">Nombre</span>
        <input name="name" type="text" maxLength={80} required placeholder="Ej: gastos del viaje" className={field} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">Monto (USD)</span>
          <input name="target" type="number" step="any" inputMode="decimal" min="1" required className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Para cuándo (opcional)</span>
          <input name="target_date" type="date" className={field} />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium">¿De qué cuenta sale?</span>
        <select name="account_id" defaultValue="" className={field}>
          <option value="">Todo mi ahorro</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <Feedback state={state} okText="Meta creada." />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Creando…" : "Crear meta"}
      </button>
    </form>
  );
}

export function RateForm({ accountId, rate }: { accountId: string; rate: number }) {
  const [state, action, pending] = useActionState(updateRate, initial);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="account_id" value={accountId} />
      <label className="block">
        <span className="text-xs text-muted">Rendimiento anual (%)</span>
        <input
          name="annual_rate"
          type="number"
          step="any"
          inputMode="decimal"
          min="0"
          max="100"
          defaultValue={rate}
          required
          className="mt-1 min-h-10 w-28 rounded-xl border border-border bg-background px-3 outline-none focus:border-ok"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "…" : "Guardar"}
      </button>
      <Feedback state={state} okText="Guardado." />
    </form>
  );
}

export function MonthlyGoalForm({ value }: { value: number }) {
  const [state, action, pending] = useActionState(updateMonthlyGoal, initial);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="text-xs text-muted">Objetivo por mes (USD)</span>
        <input
          name="monthly_usd"
          type="number"
          step="any"
          inputMode="decimal"
          min="0"
          defaultValue={value}
          required
          className="mt-1 min-h-10 w-28 rounded-xl border border-border bg-background px-3 outline-none focus:border-ok"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "…" : "Guardar"}
      </button>
      <Feedback state={state} okText="Guardado." />
    </form>
  );
}
