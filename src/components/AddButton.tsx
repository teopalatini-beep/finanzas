"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

// Botón flotante para cargar un gasto desde cualquier pantalla.
export function AddButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/gastos/nuevo")) return null;

  return (
    <Link
      href="/gastos/nuevo"
      aria-label="Cargar gasto"
      className="fixed bottom-6 right-4 z-10 flex size-14 items-center justify-center rounded-full bg-accent-strong text-white shadow-lg"
    >
      <Plus size={28} aria-hidden />
    </Link>
  );
}
