"use client";

import { useEffect, useRef, useState } from "react";

// Campo de monto con puntos de miles mientras escribís: 1360000 -> 1.360.000.
// Lo que se envía al servidor es el número limpio (con punto decimal), en un campo oculto.
const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function format(raw: string) {
  if (!raw) return "";
  const negative = raw.startsWith("-");
  const [int, dec] = (negative ? raw.slice(1) : raw).split(",");
  return `${negative ? "-" : ""}${group(int ?? "")}${dec !== undefined ? `,${dec}` : ""}`;
}

type Props = {
  name: string;
  initial?: string; // número limpio, ej. "500000"
  allowNegative?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  onValueChange?: (clean: string) => void; // número limpio, ej. "1360000.5"
};

export function MoneyInput({
  name,
  initial = "",
  allowNegative = false,
  required,
  autoFocus,
  placeholder,
  className,
  onValueChange,
}: Props) {
  const toRaw = (clean: string) => clean.replace(".", ",");
  const [raw, setRaw] = useState(toRaw(initial)); // "1360000,5": la coma es el decimal
  const ref = useRef<HTMLInputElement>(null);
  const notify = useRef(onValueChange);
  useEffect(() => {
    notify.current = onValueChange;
  });

  // Si el formulario se limpia (por ejemplo, después de guardar), el campo vuelve al valor inicial.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const onReset = () => {
      setRaw(toRaw(initial));
      notify.current?.(initial);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [initial]);

  const clean = raw.replace(",", ".");

  function handleChange(value: string) {
    const negative = allowNegative && value.trimStart().startsWith("-");
    // Solo dígitos y una coma; los puntos que se ven son de formato y no cuentan.
    let body = value.replace(/[^\d,]/g, "");
    const firstComma = body.indexOf(",");
    if (firstComma !== -1) {
      body = body.slice(0, firstComma + 1) + body.slice(firstComma + 1).replace(/,/g, "").slice(0, 2);
    }
    const next = `${negative ? "-" : ""}${body}`;
    setRaw(next);
    notify.current?.(next.replace(",", "."));
  }

  return (
    <>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={format(raw)}
        onChange={(e) => handleChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={className}
      />
      <input type="hidden" name={name} value={clean} />
    </>
  );
}
