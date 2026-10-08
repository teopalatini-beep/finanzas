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

  const { period, envelopes, todayExpenses } = data;
  const left = envelopes.reduce((sum, e) => sum + (e.budget - e.spent), 0);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-muted">
          Faltan {period.daysLeft} {period.daysLeft === 1 ? "día" : "días"} · cobrás el{" "}
          {longDate(period.nextPayday)}
        </p>
        <h1 className="mt-2 text-sm font-medium text-muted">Hasta fin de mes te quedan</h1>
        <p className="text-5xl font-semibold tabular-nums tracking-tight">{formatARS(left)}</p>
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
