import { CreditCard } from "lucide-react";
import type { VisaProjection } from "@/lib/data";
import { longDate } from "@/lib/dates";
import { formatARS } from "@/lib/format";

const signed = (n: number) => (n < 0 ? `−${formatARS(-n)}` : formatARS(n));

// "¿De cuánto viene la Visa?": el resumen que cierra a fin de mes se paga con la plata del próximo ciclo.
export function VisaProjectionCard({ projection, nextBase }: { projection: VisaProjection; nextBase: number }) {
  const p = projection;
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        <CreditCard size={18} aria-hidden /> Tu próximo resumen de la Visa
      </h2>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {formatARS(p.low)} – {formatARS(p.high)}
      </p>
      <p className="text-sm text-muted">Cierra el {longDate(p.closing)} y vence el {longDate(p.due)}.</p>
      <p className="mt-2 text-sm">
        Al próximo ciclo llegarías con <span className="font-medium">{signed(nextBase - p.high)}</span> a{" "}
        <span className="font-medium">{signed(nextBase - p.low)}</span> libres para el resto de los gastos.
      </p>
      <p className="mt-1 text-xs text-muted">
        Es el rango que cargaste en Más → Ajustes; no suma los gastos de tarjeta que ya subiste.
      </p>
    </section>
  );
}
