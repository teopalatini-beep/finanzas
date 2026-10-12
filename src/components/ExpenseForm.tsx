"use client";

import { useState } from "react";
import { addExpense, type ExpenseState } from "@/app/(app)/gastos/actions";
import { adviceFor } from "@/lib/advice";
import { MoneyInput } from "@/components/MoneyInput";
import { useActionForm } from "@/components/useActionForm";
import type { SpokenDraft } from "@/lib/spoken-types";
import type { CardRules } from "@/lib/card-dates";

type Group = {
  envelopeId: string;
  envelope: string;
  emoji: string;
  categories: { id: string; name: string; description: string | null }[];
};
type Method = { id: string; name: string; type: string };

export type AdviceContext = {
  envelopes: { id: string; name: string; budget: number; spent: number }[];
  card: CardRules;
  cycleEnd: string;
  nextCycleCommitted: number;
  nextBase: number;
  budgetsActive: boolean;
  free: number;
};

const initial: ExpenseState = { error: null };
const field =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-accent";
const tone = { ok: "text-ok-fg", warn: "text-warn-fg", over: "text-over-fg" } as const;

export function ExpenseForm({
  groups,
  methods,
  today,
  advice,
  draft = null,
}: {
  groups: Group[];
  methods: Method[];
  today: string;
  advice: AdviceContext | null;
  draft?: SpokenDraft | null; // lo que se interpretó de un dictado: completa el formulario
}) {
  const [state, onSubmit, pending] = useActionForm(addExpense, initial);
  const draftAmount = draft?.amount ? String(draft.amount) : "";
  const [amount, setAmount] = useState(draftAmount);
  const [categoryId, setCategoryId] = useState(draft?.categoryId ?? "");
  const [date, setDate] = useState(draft?.date ?? today);
  const [methodId, setMethodId] = useState(
    draft?.methodId ?? (methods.find((m) => m.type === "efectivo") ?? methods[0])?.id ?? "",
  );
  const draftCard = methods.find((m) => m.id === draft?.methodId)?.type === "tarjeta_credito";
  const [inInstallments, setInInstallments] = useState(Boolean(draft?.installments) && draftCard);
  const [installments, setInstallments] = useState(String(draft?.installments ?? 3));

  const method = methods.find((m) => m.id === methodId);
  const canInstall = method?.type === "tarjeta_credito";

  // En cuotas, lo que pesa ahora es el valor de una cuota, no el total.
  const total = Number(amount);
  const count = inInstallments && canInstall ? Math.max(2, Number(installments) || 2) : 1;
  const effective = total / count;

  const categoryDescription =
    groups.flatMap((g) => g.categories).find((c) => c.id === categoryId)?.description ?? null;

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
          nextBudget: advice.nextBase,
          budgetsActive: advice.budgetsActive,
          free: advice.free,
        })
      : null;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Monto</span>
        <MoneyInput
          name="amount"
          initial={draftAmount}
          required
          autoFocus={!draft}
          placeholder="0"
          onValueChange={setAmount}
          className="mt-1 min-h-14 w-full rounded-xl border border-border bg-surface px-3 text-3xl font-semibold tabular-nums outline-none focus:border-accent"
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

      {categoryDescription && <p className="-mt-3 text-sm text-muted">{categoryDescription}</p>}

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
                  selected ? "border-accent bg-accent-strong text-white" : "border-border bg-surface"
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
              className="size-5 accent-[var(--accent)]"
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
        <input
          name="description"
          type="text"
          maxLength={120}
          defaultValue={draft?.description ?? ""}
          placeholder="Ej: cena con amigos"
          className={field}
        />
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
        <p role="alert" className="text-sm font-medium text-over-fg">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-accent-strong font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar gasto"}
      </button>
    </form>
  );
}
