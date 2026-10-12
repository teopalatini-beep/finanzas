"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/metas", label: "Metas" },
  { href: "/proyeccion", label: "Proyección" },
  { href: "/cuotas", label: "Cuotas" },
];

// Sub-menú de la pestaña Ahorro: metas, proyección y cuotas viven juntas.
export function AhorroTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ahorro" className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      {tabs.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-10 flex-1 items-center justify-center rounded-lg text-sm ${
              active ? "bg-accent-strong font-semibold text-white" : "text-muted"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
