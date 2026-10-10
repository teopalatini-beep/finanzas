"use client";

import { useActionState, useCallback, useTransition, type FormEvent } from "react";

// Igual que usar `action={...}` en un formulario, pero SIN que React borre lo que escribiste
// cuando la acción termina. Así, si hay un error, no perdés lo que ya habías completado.
export function useActionForm<S>(action: (prev: S, formData: FormData) => Promise<S>, initialState: S) {
  const [state, dispatch, pending] = useActionState(
    action as (prev: Awaited<S>, formData: FormData) => Promise<S>,
    initialState as Awaited<S>,
  );
  const [, startTransition] = useTransition();

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      startTransition(() => {
        dispatch(data);
      });
    },
    [dispatch],
  );

  return [state, onSubmit, pending] as const;
}
