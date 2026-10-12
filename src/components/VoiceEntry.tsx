"use client";

import { useEffect, useRef } from "react";
import { interpretSpoken } from "@/app/(app)/gastos/nuevo/voice-actions";
import { useActionForm } from "@/components/useActionForm";
import type { SpokenDraft, SpokenState } from "@/lib/spoken-types";

const initial: SpokenState = { status: "idle" };

// "Contame el gasto": se dicta con el micrófono del teclado del iPhone y la IA completa el formulario.
export function VoiceEntry({ onDraft }: { onDraft: (key: number, draft: SpokenDraft) => void }) {
  const [state, onSubmit, pending] = useActionForm(interpretSpoken, initial);
  const lastKey = useRef(0);

  // Cada interpretación nueva completa el formulario de abajo.
  useEffect(() => {
    if (state.status === "ready" && state.key !== lastKey.current) {
      lastKey.current = state.key;
      onDraft(state.key, state.draft);
    }
  }, [state, onDraft]);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">Contame el gasto</h2>
      <p className="mt-1 text-sm text-muted">
        Tocá el <span className="font-medium">micrófono del teclado</span> y decilo como te salga. Por ejemplo:
        “café tres mil quinientos con la Visa”.
      </p>

      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <label className="block">
          <span className="sr-only">Contame el gasto</span>
          <textarea
            name="text"
            rows={2}
            maxLength={500}
            required
            placeholder="Ej: ayer gasté 20 lucas en el súper en efectivo"
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-xl bg-accent-strong font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {pending ? "Interpretando…" : "Completar el formulario"}
        </button>
      </form>

      <div aria-live="polite" className="mt-3 space-y-1 text-sm">
        {state.status === "error" && (
          <p role="alert" className="font-medium text-over-fg">
            {state.error}
          </p>
        )}
        {state.status === "ready" && (
          <>
            <p className="font-medium text-ok-fg">Listo: revisá el formulario de abajo antes de guardar.</p>
            {state.draft.amount === null && (
              <p className="font-medium text-warn-fg">No entendí el monto: completalo vos.</p>
            )}
            {state.draft.more && (
              <p className="font-medium text-warn-fg">
                Mencionaste más de un gasto: cargué el primero. Después dictá el otro.
              </p>
            )}
          </>
        )}
        <p className="text-xs text-muted">Lo que dictás se envía a la IA de Anthropic para interpretarlo. No se guarda audio.</p>
      </div>
    </section>
  );
}
