"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { undoExpense } from "@/app/(app)/gastos/actions";

// "Gasto guardado ✓ · Deshacer": aparece unos segundos después de cargar un gasto.
export function UndoToast({ id }: { id: string }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/", { scroll: false }), 8000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-20 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-border bg-surface py-1 pl-4 pr-2 shadow-lg"
    >
      <span className="text-sm font-medium">Gasto guardado ✓</span>
      <form action={undoExpense}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="min-h-11 rounded-xl px-3 text-sm font-semibold text-accent-fg">
          Deshacer
        </button>
      </form>
    </div>
  );
}
