"use client";

import { Trash2 } from "lucide-react";

// Botón de borrar con confirmación. La acción de servidor se pasa desde la página.
export function ConfirmDelete({
  id,
  action,
  question,
  label,
  text,
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
  question: string;
  label: string;
  text?: string; // si se pasa, se muestra un botón con texto en vez del ícono
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(question)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {text ? (
        <button
          type="submit"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border font-medium text-over-fg"
        >
          <Trash2 size={18} aria-hidden /> {text}
        </button>
      ) : (
        <button
          type="submit"
          aria-label={label}
          className="flex size-11 items-center justify-center rounded-xl text-muted"
        >
          <Trash2 size={18} aria-hidden />
        </button>
      )}
    </form>
  );
}
