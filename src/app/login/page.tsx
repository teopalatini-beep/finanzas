"use client";

import { useActionForm } from "@/components/useActionForm";
import { signIn, type LoginState } from "./actions";

const initial: LoginState = { error: null };

export default function LoginPage() {
  const [state, onSubmit, pending] = useActionForm(signIn, initial);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Finanzas</h1>
      <p className="mt-1 text-muted">Entrá para ver cuánto podés gastar.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Contraseña</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-accent"
          />
        </label>

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
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
