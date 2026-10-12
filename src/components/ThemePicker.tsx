"use client";

import { useEffect, useState, useTransition } from "react";
import { setThemeCookie } from "@/app/(app)/mas/actions";

type Theme = "day" | "dark";

const OPTIONS: { value: Theme; label: string; hint: string; bg: string; surface: string; text: string; accent: string }[] = [
  { value: "dark", label: "Modo oscuro", hint: "Noche azul", bg: "#060e1f", surface: "#0e1a33", text: "#eaf0ff", accent: "#4f8cff" },
  { value: "day", label: "Modo día", hint: "Navy y coral", bg: "#f4f6f5", surface: "#ffffff", text: "#14233c", accent: "#14233c" },
];

// Elegir el tema: se aplica al instante y se guarda en una cookie (vía el servidor).
export function ThemePicker({ initial }: { initial: Theme | null }) {
  const [theme, setTheme] = useState<Theme | null>(initial);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
  }, [theme]);

  function choose(next: Theme) {
    setTheme(next);
    startTransition(() => {
      void setThemeCookie(next);
    });
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Apariencia" className="grid grid-cols-2 gap-3">
        {OPTIONS.map((o) => {
          const selected = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(o.value)}
              className={`rounded-2xl border p-3 text-left ${selected ? "border-accent bg-accent/10" : "border-border bg-background"}`}
            >
              <span
                aria-hidden
                className="block rounded-lg p-2"
                style={{ background: o.bg, border: `1px solid ${o.surface}` }}
              >
                <span className="block h-2 w-10 rounded-full" style={{ background: o.accent }} />
                <span className="mt-2 block rounded-md p-1.5" style={{ background: o.surface }}>
                  <span className="block h-1.5 w-14 rounded-full" style={{ background: o.text, opacity: 0.8 }} />
                  <span className="mt-1 block h-1.5 w-9 rounded-full" style={{ background: o.text, opacity: 0.35 }} />
                </span>
              </span>
              <span className="mt-2 block text-sm font-medium">{o.label}</span>
              <span className="block text-xs text-muted">{o.hint}</span>
            </button>
          );
        })}
      </div>
      {!theme && <p className="mt-2 text-xs text-muted">Hoy la app sigue el modo de tu teléfono. Elegí uno para fijarlo.</p>}
    </div>
  );
}
