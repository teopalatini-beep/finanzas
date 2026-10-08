"use client";

import { Trash2 } from "lucide-react";

// Botón de borrar con confirmación. La acción de servidor se pasa desde la página.
export function ConfirmDelete({
  id,
  action,
  question,
  label,
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
  question: string;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(question)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={label}
        className="flex size-11 items-center justify-center rounded-xl text-muted"
      >
        <Trash2 size={18} aria-hidden />
      </button>
    </form>
  );
}
