"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Cinco lugares. Ahorro reúne metas, proyección y cuotas (ver AhorroTabs).
const items = [
  { href: "/", label: "Hoy", match: ["/"] },
  { href: "/gastos", label: "Gastos", match: ["/gastos"] },
  { href: "/analisis", label: "Análisis", match: ["/analisis"] },
  { href: "/metas", label: "Ahorro", match: ["/metas", "/proyeccion", "/cuotas"] },
  { href: "/mas", label: "Más", match: ["/mas"] },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Secciones"
      className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-xl justify-between gap-1 overflow-x-auto px-2 [scrollbar-width:none]">
        {items.map(({ href, label, match }) => {
          const active = href === "/" ? pathname === "/" : match.some((m) => pathname.startsWith(m));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center justify-center border-b-2 px-2 text-sm ${
                  active
                    ? "border-accent font-semibold text-foreground"
                    : "border-transparent text-muted"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
