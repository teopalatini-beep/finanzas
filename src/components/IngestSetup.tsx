"use client";

import { useState, useTransition } from "react";
import { generateIngestToken, type TokenState } from "@/app/(app)/gastos/inbox-actions";

// Crea la clave del script de Google y la muestra una sola vez.
export function IngestSetup({ hasToken }: { hasToken: boolean }) {
  const [state, setState] = useState<TokenState>({ error: null, token: null });
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function create() {
    if (hasToken && !state.token && !confirm("Ya hay una clave. Si generás otra, la anterior deja de funcionar. ¿Seguro?")) return;
    start(async () => {
      setCopied(false);
      setState(await generateIngestToken());
    });
  }

  async function copy() {
    if (!state.token) return;
    try {
      await navigator.clipboard.writeText(state.token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {hasToken || state.token ? "La conexión tiene una clave creada." : "Todavía no creaste la clave de la conexión."}
      </p>
      <button
        type="button"
        onClick={create}
        disabled={pending}
        className="min-h-11 rounded-xl border border-border px-4 font-medium disabled:opacity-60"
      >
        {pending ? "Creando…" : hasToken || state.token ? "Generar una clave nueva" : "Crear clave"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-over-fg">
          {state.error}
        </p>
      )}
      {state.token && (
        <div className="space-y-2 rounded-xl border border-border bg-background p-3">
          <p className="text-sm font-medium">Copiala ahora: no se vuelve a mostrar.</p>
          <p className="break-all font-mono text-xs">{state.token}</p>
          <button type="button" onClick={copy} className="min-h-11 rounded-xl bg-accent-strong px-4 font-medium text-white">
            {copied ? "Copiada" : "Copiar clave"}
          </button>
        </div>
      )}
    </div>
  );
}
