import { ProjectionChart } from "@/components/ProjectionChart";
import { addMonths, monthName, todayISO } from "@/lib/dates";
import { formatARS, formatUSD } from "@/lib/format";
import { monthsToTarget, project } from "@/lib/savings";
import { loadSavings, toAccs } from "@/lib/savings-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const HORIZONS = [6, 12, 24, 60];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProyeccionPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const data = await loadSavings();
  const today = todayISO();

  if (data.accounts.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Proyección</h1>
        <p className="text-muted">Primero cargá tus cuentas de ahorro (corré migration_savings.sql).</p>
      </div>
    );
  }

  // "Qué pasa si": todo viene de la URL, así se puede compartir o recargar sin perder el escenario.
  const aporteParam = Number(first(params.aporte));
  const aporte =
    first(params.aporte) !== undefined && Number.isFinite(aporteParam) && aporteParam >= 0
      ? aporteParam
      : data.monthlyGoalUsd;
  const mesesParam = Number(first(params.meses));
  const meses = HORIZONS.includes(mesesParam) ? mesesParam : 12;
  const destinoParam = first(params.destino);
  const destino = data.accounts.some((a) => a.id === destinoParam) ? destinoParam! : data.contribAccountId;

  const accs = toAccs(data.accounts);
  const start = accs.reduce((s, a) => s + a.balance, 0);
  const scenario = project(accs, destino, aporte, meses);
  const end = scenario[meses];
  const interest = end.total - start - end.deposited;
  const baseline = project(accs, destino, data.monthlyGoalUsd, meses)[meses];
  const diff = end.total - baseline.total;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Proyección</h1>
        <p className="text-sm text-muted">
          Es una cuenta con los datos que cargaste (saldos, aportes y rendimiento). No es una promesa ni una
          recomendación.
        </p>
      </header>

      {/* Escenario */}
      <form method="get" className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">¿Y si…?</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Aporte por mes (USD)</span>
            <input
              name="aporte"
              type="number"
              step="any"
              inputMode="decimal"
              min="0"
              defaultValue={aporte}
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-ok"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Plazo</span>
            <select
              name="meses"
              defaultValue={meses}
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-2"
            >
              {HORIZONS.map((h) => (
                <option key={h} value={h}>
                  {h < 12 ? `${h} meses` : `${h / 12} ${h === 12 ? "año" : "años"}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Los aportes nuevos van a</span>
          <select
            name="destino"
            defaultValue={destino ?? ""}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-2"
          >
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.annualRate}% anual)
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 w-full rounded-xl bg-ok font-semibold text-white">
          Calcular
        </button>
      </form>

      {/* Resultado */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">
          En {meses < 12 ? `${meses} meses` : meses === 12 ? "1 año" : `${meses / 12} años`} tendrías
        </p>
        <p className="text-4xl font-semibold tabular-nums tracking-tight">{formatUSD(end.total)}</p>
        {data.lastFx && (
          <p className="text-sm text-muted">
            ≈ {formatARS(end.total * data.lastFx.rate)} a ${data.lastFx.rate} por dólar (tu última cotización)
          </p>
        )}

        <div className="mt-3">
          <ProjectionChart points={scenario} start={start} />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>Hoy</span>
            <span className="flex gap-3">
              <span className="text-ok">━ proyectado</span>
              <span>╌ lo que ponés vos</span>
            </span>
          </div>
        </div>

        <dl className="mt-4 divide-y divide-border text-sm">
          <div className="flex justify-between py-2">
            <dt>Hoy tenés</dt>
            <dd className="font-medium tabular-nums">{formatUSD(start)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt>Aportes nuevos ({formatUSD(aporte)} × {meses})</dt>
            <dd className="font-medium tabular-nums">{formatUSD(end.deposited)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt>Rendimiento (según las tasas que cargaste)</dt>
            <dd className="font-medium tabular-nums">{formatUSD(interest)}</dd>
          </div>
        </dl>

        {Math.round(diff) !== 0 && (
          <p className="mt-2 text-sm">
            Con {formatUSD(aporte)} por mes terminás con{" "}
            <span className="font-semibold">
              {formatUSD(Math.abs(diff))} {diff > 0 ? "más" : "menos"}
            </span>{" "}
            que con tu objetivo de {formatUSD(data.monthlyGoalUsd)}.
          </p>
        )}
      </section>

      {/* Hitos */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Con {formatUSD(aporte)} por mes</h2>
        <ul className="mt-2 divide-y divide-border text-sm">
          {HORIZONS.map((h) => (
            <li key={h} className="flex justify-between py-2">
              <span>{h < 12 ? `En ${h} meses` : `En ${h / 12} ${h === 12 ? "año" : "años"}`}</span>
              <span className="font-medium tabular-nums">{formatUSD(project(accs, destino, aporte, h)[h].total)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Metas */}
      {data.goals.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-medium">Tus metas con este escenario</h2>
          <ul className="mt-2 divide-y divide-border text-sm">
            {data.goals.map((g) => {
              const sub = g.accountId ? accs.filter((a) => a.id === g.accountId) : accs;
              const months = monthsToTarget(sub, g.accountId ?? destino, aporte, g.target);
              const when = months && months > 0 ? addMonths(today, months) : null;
              return (
                <li key={g.id} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{g.name}</span>
                    <span className="text-muted">{formatUSD(g.target)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    {months === 0
                      ? "Ya llegaste"
                      : months === null
                        ? "No llegás"
                        : `${months} ${months === 1 ? "mes" : "meses"}`}
                    {when && (
                      <span className="block capitalize text-muted">
                        {monthName(when)} {when.slice(0, 4)}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
