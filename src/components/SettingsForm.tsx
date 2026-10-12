"use client";

import { useState } from "react";
import { updateSettings, type SettingsState } from "@/app/(app)/mas/actions";
import { useActionForm } from "@/components/useActionForm";
import type { CardRules } from "@/lib/card-dates";

const field =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-accent";

export function SettingsForm({
  card,
  visaMin,
  visaMax,
}: {
  card: CardRules;
  visaMin: number | null;
  visaMax: number | null;
}) {
  const [state, onSubmit, pending] = useActionForm<SettingsState>(updateSettings, { error: null, saved: false });
  const [closingMode, setClosingMode] = useState(card.closingDay ? "fixed" : "last_business_day");
  const [dueMode, setDueMode] = useState(card.dueBusinessDay ? "business_day" : "fixed");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">La Visa cierra</legend>
        <select
          name="closing_mode"
          value={closingMode}
          onChange={(e) => setClosingMode(e.target.value)}
          className={field}
        >
          <option value="last_business_day">El último día hábil del mes</option>
          <option value="fixed">Un día fijo del mes</option>
        </select>
        {closingMode === "fixed" && (
          <label className="block">
            <span className="text-xs text-muted">Día del mes</span>
            <input
              name="closing_day"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              defaultValue={card.closingDay ?? 5}
              required
              className={field}
            />
          </label>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Y vence</legend>
        <select name="due_mode" value={dueMode} onChange={(e) => setDueMode(e.target.value)} className={field}>
          <option value="business_day">Un día hábil del mes siguiente</option>
          <option value="fixed">Un día fijo del mes</option>
        </select>
        {dueMode === "business_day" ? (
          <label className="block">
            <span className="text-xs text-muted">Día hábil número (ej. 7 = el séptimo día hábil)</span>
            <input
              name="due_business_day"
              type="number"
              inputMode="numeric"
              min="1"
              max="20"
              defaultValue={card.dueBusinessDay ?? 7}
              required
              className={field}
            />
          </label>
        ) : (
          <label className="block">
            <span className="text-xs text-muted">Día del mes</span>
            <input
              name="due_day"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              defaultValue={card.dueDay ?? 15}
              required
              className={field}
            />
          </label>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Resumen típico de la Visa</legend>
        <p className="text-xs text-muted">
          Cuánto suele venir tu resumen. Con esto la app estima el próximo, hasta que tenga suficientes resúmenes reales.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-muted">Mínimo ($)</span>
            <input name="visa_min" type="number" inputMode="numeric" min="0" step="1000" defaultValue={visaMin ?? ""} className={field} />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Máximo ($)</span>
            <input name="visa_max" type="number" inputMode="numeric" min="0" step="1000" defaultValue={visaMax ?? ""} className={field} />
          </label>
        </div>
      </fieldset>

      <p className="text-xs text-muted">Los días hábiles son de lunes a viernes: todavía no cuento los feriados.</p>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-over-fg">
          {state.error}
        </p>
      )}
      {state.saved && <p className="text-sm font-medium text-ok-fg">Guardado.</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-accent-strong px-5 font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar ajustes"}
      </button>
    </form>
  );
}
