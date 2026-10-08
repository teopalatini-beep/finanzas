"use client";

import { useActionState, useState } from "react";
import { addExpense, type ExpenseState } from "@/app/(app)/gastos/actions";
import { adviceFor } from "@/lib/advice";
import type { CardRules } from "@/lib/card-dates";

type Group = {
  envelopeId: string;
  envelope: string;
  emoji: string;
  categories: { id: string; name: string }[];
};
type Method = { id: string; name: string; type: string };

export type AdviceContext = {
  envelopes: { id: string; name: string; budget: number; spent: number }[];
  card: CardRules;
  cycleEnd: string;
  nextCycleCommitted: number;
};

const initial: ExpenseState = { error: null };
const field =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-ok";
const tone = { ok: "text-ok", warn: "text-warn", over: "text-over" } as const;

export function ExpenseForm({
  groups,
  methods,
  today,
  advice,
}: {
  groups: Group[];
  methods: Method[];
  today: string;
  advice: AdviceContext | null;
}) {
  const [state, action, pending] = useActionState(addExpense, initial);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(today);
  const [methodId, setMethodId] = useState(
    (methods.find((m) => m.type === "efectivo") ?? methods[0])?.id ?? "",
  );
  const [inInstallments, setInInstallments] = useState(false);
  const [installments, setInstallments] = useState("3");

  const method = methods.find((m) => m.id === methodId);
  const canInstall = method?.type === "tarjeta_credito";

  // En cuotas, lo que pesa ahora es el valor de una cuota, no el total.
  const total = Number(amount);
  const count = inInstallments && canInstall ? Math.max(2, Number(installments) || 2) : 1;
  const effective = total / count;

  const envelopeId = groups.find((g) => g.categories.some((c) => c.id === categoryId))?.envelopeId;
  const envelope = advice?.envelopes.find((e) => e.id === envelopeId) ?? null;

  const message =
    advice && categoryId
      ? adviceFor({
          amount: effective,
          envelope,
          isCard: canInstall,
          date,
          card: advice.card,
          cycleEnd: advice.cycleEnd,
          nextCycleCommitted: advice.nextCycleCommitted,
          nextBudget: advice.envelopes.reduce((sum, e) => sum + e.budget, 0),
        })
      : null;

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Monto</span>
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          step="any"
          min="1"
          required
          autoFocus
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 min-h-14 w-full rounded-xl border border-border bg-surface px-3 text-3xl font-semibold tabular-nums outline-none focus:border-ok"
        />
      </label>

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

      <fieldset>
        <legend className="text-sm font-medium">Cómo pagaste</legend>
        <input type="hidden" name="payment_method_id" value={methodId} />
        <div className="mt-1 flex flex-wrap gap-2">
          {methods.map((m) => {
            const selected = m.id === methodId;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setMethodId(m.id);
                  if (m.type !== "tarjeta_credito") setInInstallments(false);
                }}
                className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${
                  selected ? "border-ok bg-ok text-white" : "border-border bg-surface"
                }`}
              >
                {m.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {canInstall && (
        <div className="rounded-xl border border-border bg-surface p-3">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={inInstallments}
              onChange={(e) => setInInstallments(e.target.checked)}
              className="size-5 accent-[var(--ok)]"
            />
            <span className="text-sm font-medium">¿En cuotas?</span>
          </label>
          {inInstallments && (
            <label className="mt-2 block">
              <span className="text-sm text-muted">
                Cantidad de cuotas (el monto de arriba es el total)
              </span>
              <input
                name="installments"
                type="number"
                inputMode="numeric"
                min="2"
                max="48"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                required
                className={field}
              />
            </label>
          )}
        </div>
      )}

      <label className="block">
        <span className="text-sm font-medium">Descripción (opcional)</span>
        <input name="description" type="text" maxLength={120} placeholder="Ej: cena con amigos" className={field} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Fecha</span>
        <input
          name="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={field}
        />
      </label>

      <div aria-live="polite">
        {message && (
          <p className={`rounded-xl border border-border bg-surface p-3 text-sm font-medium ${tone[message.tone]}`}>
            {message.text}
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-over">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-ok font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar gasto"}
      </button>
    </form>
  );
}
