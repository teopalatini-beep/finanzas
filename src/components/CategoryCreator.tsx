"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategory, type CategoryState } from "@/app/(app)/gastos/actions";

type EnvelopeOption = { envelopeId: string; envelope: string; emoji: string };

const field =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-ok";

// "¿Falta una categoría?": se crea acá y aparece enseguida en la lista de abajo.
export function CategoryCreator({ envelopes }: { envelopes: EnvelopeOption[] }) {
  const [state, action, pending] = useActionState<CategoryState, FormData>(createCategory, {
    error: null,
    ok: false,
  });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <details className="rounded-2xl border border-border bg-surface p-4">
      <summary className="min-h-10 cursor-pointer text-sm font-medium text-ok">
        ¿Falta una categoría? Crear una nueva
      </summary>
      <form ref={ref} action={action} className="space-y-3 pt-3">
        <label className="block">
          <span className="text-sm font-medium">Nombre</span>
          <input name="name" type="text" maxLength={40} required placeholder="Ej: Peluquería" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">¿De qué sobre sale?</span>
            <select name="envelope_id" required defaultValue="" className={field}>
              <option value="" disabled>
                Elegí
              </option>
              {envelopes.map((e) => (
                <option key={e.envelopeId} value={e.envelopeId}>
                  {e.emoji} {e.envelope}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Es una</span>
            <select name="kind" defaultValue="" required className={field}>
              <option value="" disabled>
                Elegí
              </option>
              <option value="necesidad">Necesidad</option>
              <option value="gusto">Gusto</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">¿Qué va ahí? (opcional)</span>
          <input
            name="description"
            type="text"
            maxLength={140}
            placeholder="Ej: corte de pelo, barba, productos"
            className={field}
          />
        </label>
        <p className="text-xs text-muted">
          El tipo se usa en Análisis para ver cuánto de tu sueldo va a necesidades y cuánto a gustos.
        </p>
        {state.error && (
          <p role="alert" className="text-sm font-medium text-over">
            {state.error}
          </p>
        )}
        {state.ok && <p className="text-sm font-medium text-ok">Categoría creada: ya la podés elegir.</p>}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-xl bg-ok px-5 font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {pending ? "Creando…" : "Crear categoría"}
        </button>
      </form>
    </details>
  );
}
