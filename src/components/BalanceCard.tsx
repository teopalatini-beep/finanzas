import Link from "next/link";
import { Landmark } from "lucide-react";
import type { BalanceData } from "@/lib/balance";
import { longDate } from "@/lib/dates";
import { formatARS } from "@/lib/format";

const signed = (n: number) => (n < 0 ? `−${formatARS(-n)}` : formatARS(n));

// El saldo de tu cuenta según lo que cargaste: arranca con el saldo que pusiste y baja con cada gasto.
export function BalanceCard({ balance }: { balance: BalanceData | null }) {
  if (!balance) {
    return (
      <section className="rounded-2xl border border-dashed border-border p-4">
        <h2 className="flex items-center gap-2 font-medium">
          <Landmark size={18} className="text-muted" aria-hidden /> Tu saldo
        </h2>
        <p className="mt-1 text-sm text-muted">Cargá lo que tenés hoy en la cuenta para que la app lo vaya descontando.</p>
        <Link href="/mas" className="mt-2 inline-flex min-h-11 items-center font-medium text-accent-fg underline underline-offset-2">
          Cargar mi saldo
        </Link>
      </section>
    );
  }
  const b = balance;
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        <Landmark size={18} aria-hidden /> En tu cuenta hoy
      </h2>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{signed(b.balance)}</p>
      <details className="mt-2 text-sm">
        <summary className="min-h-9 cursor-pointer font-medium text-accent-fg">¿Cómo se calcula?</summary>
        <dl className="mt-1 divide-y divide-border rounded-xl border border-border px-3">
          <div className="flex justify-between py-2">
            <dt>Saldo que cargaste el {longDate(b.openingOn)}</dt>
            <dd className="tabular-nums">{formatARS(b.openingBalance)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt>Sueldos cobrados desde entonces</dt>
            <dd className="tabular-nums">+{formatARS(b.salaries)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt>Gastos que ya salieron</dt>
            <dd className="tabular-nums">−{formatARS(b.spent)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt>Pasado a ahorro</dt>
            <dd className="tabular-nums">{b.saved >= 0 ? "−" : "+"}{formatARS(Math.abs(b.saved))}</dd>
          </div>
        </dl>
        <p className="mt-1 text-xs text-muted">
          Las compras con la Visa bajan el saldo el día que vence el resumen, no cuando comprás.
        </p>
      </details>
    </section>
  );
}
