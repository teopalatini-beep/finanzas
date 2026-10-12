"use client";

import Link from "next/link";
import { useState } from "react";
import { updateExpense, type ExpenseState } from "@/app/(app)/gastos/actions";
import { MoneyInput } from "@/components/MoneyInput";
import { useActionForm } from "@/components/useActionForm";

type Group = {
  envelope: string;
  emoji: string;
  categories: { id: string; name: string; description: string | null }[];
};
type Method = { id: string; name: string; type: string };

export type EditableExpense = {
  id: string;
  amount: number;
  date: string;
  categoryId: string | null;
  methodId: string | null;
  description: string;
  installmentLabel: string | null; // "cuota 3 de 6": si hay, el monto y el medio de pago están bloqueados
};

const initial: ExpenseState = { error: null };
const field =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-accent";

export function EditExpenseForm({
  groups,
  methods,
  expense,
}: {
  groups: Group[];
  methods: Method[];
  expense: EditableExpense;
}) {
  const [state, onSubmit, pending] = useActionForm(updateExpense, initial);
  const [categoryId, setCategoryId] = useState(expense.categoryId ?? "");
  const [methodId, setMethodId] = useState(expense.methodId ?? "");
  const locked = expense.installmentLabel !== null;

  const description = groups.flatMap((g) => g.categories).find((c) => c.id === categoryId)?.description ?? null;
  const methodName = methods.find((m) => m.id === methodId)?.name ?? "";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="id" value={expense.id} />

      {locked ? (
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-sm text-muted">Monto de esta cuota</p>
          <p className="text-2xl font-semibold tabular-nums">
            {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(expense.amount)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Es la {expense.installmentLabel} de una compra en cuotas, así que el monto y el medio de pago no se pueden
            cambiar acá. Para corregirlos, borrá el gasto y volvé a cargarlo.
          </p>
          <input type="hidden" name="amount" value={expense.amount} />
        </div>
      ) : (
        <label className="block">
          <span className="text-sm font-medium">Monto</span>
          <MoneyInput
            name="amount"
            initial={String(expense.amount)}
            required
            className="mt-1 min-h-14 w-full rounded-xl border border-border bg-surface px-3 text-3xl font-semibold tabular-nums outline-none focus:border-accent"
          />
        </label>
      )}

      <label className="block">
        <span className="text-sm font-medium">Categoría</span>
        <select
          name="category_id"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={field}
        >
          <option value="" disabled>
            Elegí una categoría
          </option>
          {groups.map((g) => (
            <optgroup key={g.envelope} label={`${g.emoji} ${g.envelope}`}>
              {g.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {description && <p className="-mt-3 text-sm text-muted">{description}</p>}

      <fieldset>
        <legend className="text-sm font-medium">Cómo pagaste</legend>
        <input type="hidden" name="payment_method_id" value={methodId} />
        {locked ? (
          <p className="mt-1 rounded-xl border border-border bg-surface p-3 text-sm">{methodName}</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            {methods.map((m) => {
              const selected = m.id === methodId;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMethodId(m.id)}
                  className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${
                    selected ? "border-accent bg-accent-strong text-white" : "border-border bg-surface"
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium">Descripción (opcional)</span>
        <input
          name="description"
          type="text"
          maxLength={120}
          defaultValue={expense.description}
          placeholder="Ej: cena con amigos"
          className={field}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Fecha</span>
        <input name="date" type="date" defaultValue={expense.date} required className={field} />
      </label>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-over-fg">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/gastos"
          className="flex min-h-12 items-center justify-center rounded-xl border border-border font-medium"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-xl bg-accent-strong font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
