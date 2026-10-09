import Link from "next/link";
import { getHoyData } from "@/lib/data";
import { longDate } from "@/lib/dates";
import { formatARS } from "@/lib/format";

export default async function HoyPage() {
  const data = await getHoyData();

  if (!data || data.envelopes.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Todavía no hay datos</h1>
        <p className="text-muted">
          Cargá tus sobres y el ciclo actual (supabase/seed.sql) para ver cuánto podés gastar.
        </p>
      </div>
    );
  }

  const { period, envelopes, todayExpenses, budgetsActive, budgetsFrom, free } = data;
  const left = budgetsActive ? envelopes.reduce((sum, e) => sum + (e.budget - e.spent), 0) : free.amount;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-muted">
          Faltan {period.daysLeft} {period.daysLeft === 1 ? "día" : "días"} · cobrás el{" "}
          {longDate(period.nextPayday)}
        </p>
        <h1 className="mt-2 text-sm font-medium text-muted">
          {budgetsActive ? "Hasta fin de mes te quedan" : "Libre hasta fin de mes"}
        </h1>
        <p className="text-5xl font-semibold tabular-nums tracking-tight">{formatARS(left)}</p>

        {!budgetsActive && (
          <>
            <p className="mt-2 text-sm text-muted">
              Este ciclo estás midiendo cuánto gastás en cada cosa.
              {budgetsFrom && ` Los presupuestos arrancan el ${longDate(budgetsFrom)}.`}
            </p>
            <details className="mt-2 text-sm">
              <summary className="min-h-9 cursor-pointer font-medium text-ok">¿Cómo se calcula?</summary>
              <dl className="mt-1 divide-y divide-border rounded-xl border border-border bg-surface px-3">
                <div className="flex justify-between py-2">
                  <dt>Sueldo</dt>
                  <dd className="tabular-nums">{formatARS(period.income)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt>Fijos fuera de tarjeta</dt>
                  <dd className="tabular-nums">−{formatARS(free.fixed)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt>Ahorro</dt>
                  <dd className="tabular-nums">−{formatARS(free.savings)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt>Gastado este ciclo (tarjeta y efectivo)</dt>
                  <dd className="tabular-nums">−{formatARS(free.spent)}</dd>
                </div>
              </dl>
              <p className="mt-1 text-xs text-muted">
                La tarjeta se actualiza cuando subís el resumen: hasta entonces, lo que se paga con la Visa puede estar incompleto.
              </p>
            </details>
          </>
        )}
      </header>

      <section aria-label="Gastos de hoy" className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Gastos de hoy</h2>
          <p className="font-semibold tabular-nums">{formatARS(todayExpenses.total)}</p>
        </div>
        {todayExpenses.items.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Todavía no cargaste nada hoy.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {todayExpenses.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
                <span aria-hidden>{i.emoji}</span>
                <span className="min-w-0 flex-1 truncate">
                  {i.title}
                  {i.method && <span className="text-muted"> · {i.method}</span>}
                </span>
                <span className="font-medium tabular-nums">{formatARS(i.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/gastos/nuevo"
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-ok font-medium text-white"
        >
          Cargar un gasto
        </Link>
      </section>
    </div>
  );
}
