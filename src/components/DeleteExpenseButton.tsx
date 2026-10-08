"use client";

import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/app/(app)/gastos/actions";

export function DeleteExpenseButton({ id }: { id: string }) {
  return (
    <form
      action={deleteExpense}
      onSubmit={(e) => {
        if (!confirm("¿Borrar este gasto?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label="Borrar gasto"
        className="flex size-11 items-center justify-center rounded-xl text-muted"
      >
        <Trash2 size={18} aria-hidden />
      </button>
    </form>
  );
}
