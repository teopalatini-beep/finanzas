"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Las pestañas con "Próximamente" son lugares reservados para definir juntos.
const items = [
  { href: "/", label: "Hoy" },
  { href: "/gastos", label: "Gastos" },
  { href: "/analisis", label: "Análisis" },
  { href: "/cuotas", label: "Cuotas" },
  { href: "/proyeccion", label: "Proyección" },
  { href: "/metas", label: "Metas" },
  { href: "/mas", label: "Más" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Secciones"
      className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-xl gap-1 overflow-x-auto px-2 [scrollbar-width:none]">
        {items.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center border-b-2 px-3 text-sm ${
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
