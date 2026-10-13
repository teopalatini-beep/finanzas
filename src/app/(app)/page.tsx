import Link from "next/link";
import { InboxCard } from "@/components/InboxCard";
import { AlertsCard } from "@/components/AlertsCard";
import { BalanceCard } from "@/components/BalanceCard";
import { SalaryForm } from "@/components/SalaryBalanceForms";
import { ForecastCard } from "@/components/ForecastCard";
import { VisaProjectionCard } from "@/components/VisaProjectionCard";
import { StatementAlertCard } from "@/components/StatementAlertCard";
import { UndoToast } from "@/components/UndoToast";
import { buildAlerts } from "@/lib/alerts";
import { getHoyData } from "@/lib/data";
import { loadInbox } from "@/lib/inbox";
import { daysBetween, longDate, todayISO } from "@/lib/dates";
import { formatARS } from "@/lib/format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export default async function HoyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const savedParam = Array.isArray(params.guardado) ? params.guardado[0] : params.guardado;
  const savedId = savedParam && isUUID(savedParam) ? savedParam : null;

  const data = await getHoyData();

  if (!data) {
    // Sin ciclo vigente: lo normal es que acabes de cobrar y falte cargar el sueldo.
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Cargá tu sueldo para arrancar el ciclo</h1>
        <p className="text-muted">
          Si ya cobraste, poné el día y el monto: se crea el ciclo hasta el próximo cobro y se suma a tu saldo.
        </p>
        <section className="rounded-2xl border border-border bg-surface p-4">
          <SalaryForm today={todayISO()} />
        </section>
      </div>
    );
  }

  if (data.envelopes.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Todavía no hay datos</h1>
        <p className="text-muted">
          Cargá tus sobres y el ciclo actual (supabase/seed.sql) para ver cuánto podés gastar.
        </p>
      </div>
    );
  }

  const { period, todayExpenses, forecast, statementAlert, visaProjection, balance } = data;

  const alerts = buildAlerts(data, formatARS);
  // En Hoy solo lo urgente: facturas que vencen en la semana (o ya vencieron) y los pagos para confirmar.
  const today = todayISO();
  const inbox = (await loadInbox()).filter(
    (i) => i.kind === "pago" || (i.dueOn !== null && daysBetween(today, i.dueOn) <= 7),
  );

  return (
    <div className="space-y-4">
      {savedId && <UndoToast id={savedId} />}
      <header>
        <p className="text-sm text-muted">
          Faltan {period.daysLeft} {period.daysLeft === 1 ? "día" : "días"} · cobrás el{" "}
          {longDate(period.nextPayday)}
        </p>
        {balance && (
          <>
            <h1 className="mt-2 text-sm font-medium text-muted">Te quedan</h1>
            <p className="text-5xl font-semibold tabular-nums tracking-tight">{formatARS(balance.balance)}</p>
            <details className="mt-2 text-sm">
              <summary className="min-h-9 cursor-pointer font-medium text-accent-fg">¿Cómo se calcula?</summary>
              <dl className="mt-1 divide-y divide-border rounded-xl border border-border bg-surface px-3">
                <div className="flex justify-between py-2">
                  <dt>Saldo que cargaste el {longDate(balance.openingOn)}</dt>
                  <dd className="tabular-nums">{formatARS(balance.openingBalance)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt>Sueldos cobrados desde entonces</dt>
                  <dd className="tabular-nums">+{formatARS(balance.salaries)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt>Gastos que ya salieron</dt>
                  <dd className="tabular-nums">−{formatARS(balance.spent)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt>Pasado a ahorro</dt>
                  <dd className="tabular-nums">
                    {balance.saved >= 0 ? "−" : "+"}
                    {formatARS(Math.abs(balance.saved))}
                  </dd>
                </div>
              </dl>
              <p className="mt-1 text-xs text-muted">
                Las compras con la Visa bajan tu saldo el día que vence el resumen, no cuando comprás.
              </p>
            </details>
          </>
        )}
      </header>

      {period.daysLeft <= 2 && (
        <section className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="font-medium">
            {period.daysLeft === 1 ? "Mañana" : "Pasado mañana"} cobrás ({longDate(period.nextPayday)}).
          </p>
          <p className="mt-1 text-muted">
            Ese día entrá a Más → Cobré el sueldo y cargalo: sin eso la app no arranca el ciclo nuevo.
          </p>
          <Link
            href="/mas"
            className="mt-2 inline-flex min-h-11 items-center font-medium text-accent-fg underline underline-offset-2"
          >
            Ir a cargar el sueldo
          </Link>
        </section>
      )}

      {!balance && <BalanceCard balance={null} />}

      <AlertsCard alerts={alerts} />

      <InboxCard items={inbox} />

      {statementAlert && <StatementAlertCard alert={statementAlert} />}

      <ForecastCard forecast={forecast} />

      {visaProjection && <VisaProjectionCard projection={visaProjection} nextBase={data.nextBase} />}

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
              <li key={i.id}>
                <Link
                  href={`/gastos/editar/${i.id}`}
                  aria-label={`Editar ${i.title}`}
                  className="flex min-h-11 items-center gap-3 py-2 text-sm"
                >
                  <span aria-hidden>{i.emoji}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {i.title}
                    {i.method && <span className="text-muted"> · {i.method}</span>}
                  </span>
                  <span className="font-medium tabular-nums">{formatARS(i.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/gastos/nuevo"
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-accent-strong font-medium text-white"
        >
          Cargar un gasto
        </Link>
      </section>
    </div>
  );
}
