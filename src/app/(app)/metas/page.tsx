import { ConfirmDelete } from "@/components/DeleteButtons";
import { EntryForm, GoalForm, MonthlyGoalForm, RateForm } from "@/components/SavingsForms";
import { previousCycles } from "@/lib/cycles";
import { addMonths, longDate, monthName, todayISO } from "@/lib/dates";
import { formatARS, formatUSD, formatUSD2 } from "@/lib/format";
import { buildGoalViews } from "@/lib/goals";
import { loadSavings } from "@/lib/savings-data";
import { createClient } from "@/lib/supabase/server";
import { deleteEntry, deleteGoal } from "./actions";

const TYPE_LABEL = { aporte: "Aporte", retiro: "Retiro", ajuste: "Rendimiento / ajuste" } as const;

export default async function MetasPage() {
  const supabase = await createClient();
  const today = todayISO();
  const data = await loadSavings();

  const { data: period } = await supabase
    .from("periods")
    .select("start_date, end_date")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  const total = data.accounts.reduce((s, a) => s + a.balance, 0);
  const views = await buildGoalViews(data, today);
  const assigned = views.reduce((sum, v) => sum + v.saved, 0);
  const unassigned = total - assigned;

  // Aportes por ciclo (cobro a cobro). Solo cuentan los aportes, no los retiros ni los ajustes.
  const cycles = period
    ? [...previousCycles(period.start_date, 3), { start: period.start_date, end: period.end_date }]
    : [];
  const perCycle = cycles.map((c) => ({
    cycle: c,
    amount: data.entries
      .filter((e) => e.type === "aporte" && e.occurredOn >= c.start && e.occurredOn <= c.end)
      .reduce((s, e) => s + e.amountUsd, 0),
  }));
  const thisCycle = perCycle[perCycle.length - 1]?.amount ?? 0;
  const monthly = data.monthlyGoalUsd;
  const monthlyPct = monthly > 0 ? Math.min(100, (thisCycle / monthly) * 100) : 0;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Metas</h1>
        <p className="mt-1 text-sm text-muted">Ahorro total</p>
        <p className="text-4xl font-semibold tabular-nums tracking-tight">{formatUSD(total)}</p>
        {data.lastFx && (
          <p className="text-sm text-muted">
            ≈ {formatARS(total * data.lastFx.rate)} a la última cotización que cargaste (${data.lastFx.rate},{" "}
            {longDate(data.lastFx.on)})
          </p>
        )}
      </header>

      {/* Objetivo mensual */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Ahorrar {formatUSD(monthly)} por mes</h2>
          <p className="text-sm tabular-nums">
            <span className="font-semibold">{formatUSD(thisCycle)}</span>
            <span className="text-muted"> este ciclo</span>
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={Math.round(monthlyPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Aportes de este ciclo"
        >
          <div className="h-full rounded-full bg-kind-save" style={{ width: `${monthlyPct}%` }} />
        </div>
        <p className="mt-2 text-sm">
          {monthly === 0
            ? "Todavía no definiste un objetivo mensual."
            : thisCycle >= monthly
              ? "Objetivo del mes cumplido."
              : `Te faltan ${formatUSD(monthly - thisCycle)} para llegar al objetivo de este ciclo.`}
        </p>

        {perCycle.length > 1 && (
          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            {perCycle
              .slice(0, -1)
              .reverse()
              .map((p) => (
                <li key={p.cycle.start} className="flex justify-between text-muted">
                  <span className="capitalize">{monthName(p.cycle.end)}</span>
                  <span className="tabular-nums">
                    {formatUSD(p.amount)}
                    {monthly > 0 && p.amount >= monthly ? " ✓" : ""}
                  </span>
                </li>
              ))}
          </ul>
        )}

        <details className="mt-3 border-t border-border pt-3">
          <summary className="min-h-10 cursor-pointer text-sm font-medium text-ok">Cambiar objetivo mensual</summary>
          <div className="pt-2">
            <MonthlyGoalForm value={monthly} />
          </div>
        </details>
      </section>

      {/* Registrar movimiento */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <details>
          <summary className="min-h-10 cursor-pointer font-medium">Registrar aporte o retiro</summary>
          <div className="pt-3">
            <EntryForm
              accounts={data.accounts}
              goals={data.goals.map((g) => ({ id: g.id, name: g.name }))}
              defaultAccountId={data.contribAccountId}
              defaultGoalId={data.contribGoalId}
              today={today}
              lastFx={data.lastFx?.rate ?? null}
            />
          </div>
        </details>
      </section>

      {/* Cuentas */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Dónde está tu ahorro</h2>
        <ul className="mt-3 divide-y divide-border">
          {data.accounts.map((a) => (
            <li key={a.id} className="py-2">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{a.name}</span>
                <span className="font-semibold tabular-nums">{formatUSD(a.balance)}</span>
              </div>
              <p className="text-sm text-muted">Rendimiento anual: {a.annualRate}% (lo cargás vos)</p>
              <details className="mt-1">
                <summary className="min-h-9 cursor-pointer text-sm font-medium text-ok">Editar rendimiento</summary>
                <div className="pt-2">
                  <RateForm accountId={a.id} rate={a.annualRate} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {/* Metas */}
      <section className="space-y-3">
        <h2 className="font-medium">Tus metas</h2>
        {views.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
            Todavía no creaste ninguna. Por ejemplo: el viaje (lo máximo posible) y un colchón de N meses de gastos.
          </p>
        )}
        {views.map((v) => {
          const { goal } = v;
          const pct = v.targetUsd ? Math.min(100, (v.saved / v.targetUsd) * 100) : null;
          const reachDate = v.monthsToGo && v.monthsToGo > 0 ? addMonths(today, v.monthsToGo) : null;

          return (
            <article key={goal.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{goal.name}</h3>
                  <p className="text-sm text-muted">
                    {formatUSD(v.saved)}
                    {v.targetUsd ? ` de ${formatUSD(v.targetUsd)}` : " juntados"}
                    {goal.targetDate && ` · para el ${longDate(goal.targetDate)}`}
                  </p>
                </div>
                <ConfirmDelete id={goal.id} action={deleteGoal} question="¿Borrar esta meta?" label="Borrar meta" />
              </div>

              {pct !== null && (
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-border"
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal.name}: ${Math.round(pct)}%`}
                >
                  <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
                </div>
              )}

              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  Este ciclo sumaste <span className="font-medium">{formatUSD(v.thisCycle)}</span>
                  {v.pace > 0 && <span className="text-muted"> · ritmo habitual {formatUSD(v.pace)} por mes</span>}
                </li>
                {v.targetUsd !== null && (
                  <li>
                    {v.monthsToGo === 0
                      ? "Ya llegaste a esta meta."
                      : v.monthsToGo === null
                        ? "Con tu ritmo actual no llegás en los próximos 50 años."
                        : `A este ritmo llegás en ${v.monthsToGo} ${v.monthsToGo === 1 ? "mes" : "meses"} (${monthName(reachDate!)} ${reachDate!.slice(0, 4)}).`}
                  </li>
                )}
                {v.needMonthly !== null && (
                  <li className="text-muted">Para llegar a tiempo necesitás aportar {formatUSD2(v.needMonthly)} por mes.</li>
                )}
                {v.targetUsd === null && v.atDate !== null && (
                  <li className="text-muted">A este ritmo, para esa fecha tendrías {formatUSD(v.atDate)}.</li>
                )}
                {v.targetNote && <li className="text-muted">{v.targetNote}</li>}
              </ul>
            </article>
          );
        })}

        {views.length > 0 && Math.abs(unassigned) >= 1 && (
          <p className="px-1 text-sm text-muted">
            Sin asignar a ninguna meta: {formatUSD(unassigned)} (por ejemplo, rendimientos o aportes sin meta).
          </p>
        )}

        <details className="rounded-2xl border border-border bg-surface p-4">
          <summary className="min-h-10 cursor-pointer font-medium">Nueva meta</summary>
          <div className="pt-3">
            <GoalForm />
          </div>
        </details>
      </section>

      {/* Últimos movimientos */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Últimos movimientos</h2>
        {data.entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Todavía no registraste ninguno.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {data.entries.slice(0, 10).map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-1 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {TYPE_LABEL[e.type]} · {e.accountName}
                  </p>
                  <p className="truncate text-muted">
                    {longDate(e.occurredOn)}
                    {e.fxRate ? ` · a $${e.fxRate}` : ""}
                    {e.goalId ? ` · ${data.goals.find((g) => g.id === e.goalId)?.name ?? ""}` : ""}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </div>
                <span className={`font-semibold tabular-nums ${e.amountUsd < 0 ? "text-over" : ""}`}>
                  {e.amountUsd < 0 ? "−" : "+"}
                  {formatUSD2(Math.abs(e.amountUsd))}
                </span>
                <ConfirmDelete id={e.id} action={deleteEntry} question="¿Borrar este movimiento?" label="Borrar movimiento" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
