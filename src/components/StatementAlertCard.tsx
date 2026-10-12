import Link from "next/link";
import { FileWarning } from "lucide-react";
import type { StatementAlert } from "@/lib/data";
import { longDate } from "@/lib/dates";

// Aviso de datos incompletos: el libre se arma mejor cuando subís el resumen de la tarjeta.
export function StatementAlertCard({ alert }: { alert: StatementAlert }) {
  const overdue = alert.daysToDue < 0;
  return (
    <section className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
      <FileWarning size={20} className="mt-0.5 shrink-0 text-warn" aria-hidden />
      <div className="text-sm">
        <p className="font-medium">
          {overdue
            ? `Falta el resumen de la Visa que cerró el ${longDate(alert.closing)}`
            : `Falta subir el resumen de la Visa que cerró el ${longDate(alert.closing)}`}
        </p>
        <p className="mt-1 text-muted">
          {overdue
            ? `Venció el ${longDate(alert.due)}. `
            : `Vence el ${longDate(alert.due)} (${alert.daysToDue === 0 ? "hoy" : `en ${alert.daysToDue} ${alert.daysToDue === 1 ? "día" : "días"}`}). `}
          Hasta que lo subas, tu saldo puede estar inflado.
        </p>
        <Link
          href="/gastos/importar"
          className="mt-2 inline-flex min-h-11 items-center font-medium text-accent-fg underline underline-offset-2"
        >
          Subir resumen
        </Link>
      </div>
    </section>
  );
}
