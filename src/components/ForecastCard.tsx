import { CircleAlert, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import type { ForecastData } from "@/lib/data";
import { formatARS } from "@/lib/format";

const signed = (n: number) => (n < 0 ? `−${formatARS(-n)}` : formatARS(n));

const TONE = {
  ok: { Icon: CheckCircle2, cls: "text-ok-fg", text: "Llegás con margen en todo el rango." },
  warn: { Icon: AlertTriangle, cls: "text-warn-fg", text: "Llegás en el caso central, pero en el peor caso te faltaría plata antes de cobrar." },
  over: { Icon: CircleAlert, cls: "text-over-fg", text: "A este ritmo no llegarías a cobrar con plata." },
} as const;

// "¿Llego a fin de ciclo?": proyecta lo que te queda libre según cómo venís gastando día a día.
export function ForecastCard({ forecast }: { forecast: ForecastData }) {
  if (forecast.status === "wait") {
    return (
      <section className="rounded-2xl border border-dashed border-border p-4">
        <h2 className="flex items-center gap-2 font-medium">
          <TrendingUp size={18} className="text-muted" aria-hidden /> Pronóstico de fin de ciclo
        </h2>
        <p className="mt-1 text-sm text-muted">
          Aparece desde el día {forecast.fromDay} del ciclo, cuando ya hay datos suficientes para proyectar. Hoy vas por
          el día {forecast.day}.
        </p>
      </section>
    );
  }

  if (forecast.status === "empty") {
    return (
      <section className="rounded-2xl border border-dashed border-border p-4">
        <h2 className="flex items-center gap-2 font-medium">
          <TrendingUp size={18} className="text-muted" aria-hidden /> Pronóstico de fin de ciclo
        </h2>
        <p className="mt-1 text-sm text-muted">
          Todavía hay muy pocos gastos cargados para proyectar. Cuando tengas unos días de gastos en efectivo o débito,
          te digo con cuánto llegás a cobrar.
        </p>
      </section>
    );
  }

  const f = forecast;
  const tone = f.mid < 0 ? "over" : f.low < 0 ? "warn" : "ok";
  const { Icon, cls, text } = TONE[tone];

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        <TrendingUp size={18} aria-hidden /> Si seguís así, terminás el ciclo con
      </h2>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">~{signed(f.mid)}</p>
      <p className="text-sm text-muted">
        Entre {signed(f.low)} y {signed(f.high)}
      </p>
      <p className={`mt-2 flex items-start gap-2 text-sm font-medium ${cls}`}>
        <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
        <span>{text}</span>
      </p>

      {f.gustoCut > 0 && (
        <p className="mt-2 text-sm">
          Si bajás los gustos un 10%, te sobrarían <span className="font-medium">{formatARS(f.gustoCut)}</span> más.
        </p>
      )}

      <details className="mt-3 text-sm">
        <summary className="min-h-9 cursor-pointer font-medium text-accent-fg">¿Cómo se calcula?</summary>
        <ul className="mt-1 space-y-1 text-muted">
          <li>
            Tu gasto diario típico en efectivo, débito y transferencias es de{" "}
            <span className="font-medium text-foreground">{formatARS(f.dailyPace)}</span> (con {f.sample}{" "}
            {f.sample === 1 ? "gasto" : "gastos"} en {f.day} {f.day === 1 ? "día" : "días"} de seguimiento).
          </li>
          <li>Se simulan los {f.remaining} días que faltan con ese comportamiento, y el rango deja afuera los extremos.</li>
          <li>No incluye fijos, cuotas ni compras con la tarjeta: lo que pagues con la Visa cae en el próximo ciclo.</li>
          {f.excluded > 0 && (
            <li>
              Dejé afuera {f.excluded} {f.excluded === 1 ? "compra grande" : "compras grandes"} (más del 10% del sueldo,{" "}
              {formatARS(f.excludedAmount)} en total): ya están descontadas del libre, pero no se proyectan.
            </li>
          )}
          {f.sample < 8 && (
            <li className="font-medium text-warn-fg">
              Hay pocos gastos en efectivo cargados: el ritmo puede no ser representativo.
            </li>
          )}
        </ul>
      </details>
    </section>
  );
}
