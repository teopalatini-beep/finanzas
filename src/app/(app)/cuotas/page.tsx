import { AhorroTabs } from "@/components/AhorroTabs";
import { addMonths, monthName, monthsBetween, todayISO } from "@/lib/dates";
import { formatARS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Plan = {
  id: string;
  description: string;
  total_amount: number;
  installments_count: number;
  first_installment: string;
};

export default async function CuotasPage() {
  const supabase = await createClient();
  const today = todayISO();

  const { data } = await supabase
    .from("installment_plans")
    .select("id, description, total_amount, installments_count, first_installment");

  const plans = ((data ?? []) as Plan[])
    .map((p) => {
      const perMonth = Number(p.total_amount) / p.installments_count;
      const current = monthsBetween(p.first_installment, today) + 1; // cuota de este mes
      return { ...p, perMonth, current, remaining: p.installments_count - current };
    })
    .filter((p) => p.current <= p.installments_count) // las terminadas no se muestran
    .sort((a, b) => a.remaining - b.remaining);

  // Lo que ya está comprometido en cada mes futuro.
  const months = new Map<string, { label: string; amount: number }>();
  for (const p of plans) {
    for (let n = Math.max(p.current + 1, 1); n <= p.installments_count; n++) {
      const when = addMonths(p.first_installment, n - 1);
      const key = when.slice(0, 7);
      months.set(key, { label: monthName(when), amount: (months.get(key)?.amount ?? 0) + p.perMonth });
    }
  }
  const upcoming = [...months.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v).slice(0, 6);
  const maxUpcoming = Math.max(1, ...upcoming.map((u) => u.amount));
  const monthlyNow = plans.filter((p) => p.current >= 1).reduce((s, p) => s + p.perMonth, 0);
  const pendingTotal = plans.reduce((s, p) => s + p.perMonth * Math.max(p.remaining, 0), 0);

  return (
    <div className="space-y-5">
      <AhorroTabs />
      <header>
        <h1 className="text-2xl font-semibold">Cuotas</h1>
        <p className="text-sm text-muted">
          {plans.length === 0
            ? "No tenés compras en cuotas en curso."
            : `Este mes pagás ${formatARS(monthlyNow)} en cuotas. Después de esta, te quedan ${formatARS(pendingTotal)} por pagar.`}
        </p>
      </header>

      <ul className="space-y-3">
        {plans.map((p) => {
          const pct = Math.min(100, Math.max(0, (p.current / p.installments_count) * 100));
          const last = monthName(addMonths(p.first_installment, p.installments_count - 1));
          return (
            <li key={p.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium">{p.description}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatARS(p.perMonth)}/mes</span>
              </div>
              <p className="text-sm text-muted">
                Cuota {Math.max(p.current, 1)} de {p.installments_count} · total {formatARS(Number(p.total_amount))}
              </p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${p.description}: cuota ${p.current} de ${p.installments_count}`}
              >
                <div className="h-full rounded-full bg-warn" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-sm">
                {p.remaining > 0
                  ? `Te quedan ${p.remaining} después de la de este mes. Termina en ${last}.`
                  : "Es la última cuota."}
              </p>
            </li>
          );
        })}
      </ul>

      {upcoming.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-medium">Lo que ya tenés comprometido</h2>
          <ul className="mt-3 space-y-3">
            {upcoming.map((u) => (
              <li key={u.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="capitalize">{u.label}</span>
                  <span className="font-medium tabular-nums">{formatARS(u.amount)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-warn" style={{ width: `${(u.amount / maxUpcoming) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
