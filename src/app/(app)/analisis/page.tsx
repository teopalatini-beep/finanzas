import { getCardSettings, loadTransactions, type CycleTx } from "@/lib/cashflow";
import { previousCycles, type Cycle } from "@/lib/cycles";
import { monthName, todayISO } from "@/lib/dates";
import { formatARS, statusFor } from "@/lib/format";
import { merchantKey, prettyName } from "@/lib/merchants";
import { loadSavings } from "@/lib/savings-data";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";

type Kind = "necesidad" | "gusto" | "ahorro";
type Item = { key: string; name: string; emoji: string; kind: Kind; amount: number };

// Referencia 50/30/20 (provisoria: las reglas las definimos juntos).
const KINDS: { kind: Kind; label: string; target: number; bar: string }[] = [
  { kind: "necesidad", label: "Necesidades", target: 0.5, bar: "bg-kind-need" },
  { kind: "gusto", label: "Gustos", target: 0.3, bar: "bg-kind-want" },
  { kind: "ahorro", label: "Ahorro", target: 0.2, bar: "bg-kind-save" },
];

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
const inCycle = (t: CycleTx, c: Cycle) => t.cashDate >= c.start && t.cashDate <= c.end;

type FixedRow = {
  amount: number;
  category_id: string | null;
  categories: { name: string; kind: Kind; envelopes: { emoji: string | null } | null } | null;
  payment_methods: { type: string } | null;
};

export default async function AnalisisPage() {
  const supabase = await createClient();
  const today = todayISO();

  const { data: period } = await supabase
    .from("periods")
    .select("start_date, end_date, income")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  if (!period) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Análisis</h1>
        <p className="text-muted">Todavía no hay un ciclo vigente para analizar.</p>
      </div>
    );
  }

  const income = Number(period.income);
  const card = await getCardSettings();
  const current: Cycle = { start: period.start_date, end: period.end_date };
  const cycles: Cycle[] = [...previousCycles(current.start, 5), current]; // 6 ciclos, el último es el actual

  const [all, { data: fixedData }, savings] = await Promise.all([
    loadTransactions({ start_date: cycles[0].start, end_date: current.end }, card),
    supabase
      .from("fixed_expenses")
      .select("amount, category_id, categories(name, kind, envelopes(emoji)), payment_methods(type)")
      .eq("active", true),
    loadSavings(),
  ]);

  // Ahorro real de un ciclo: aportes en USD por la cotización que cargaste ese día.
  const savedIn = (c: Cycle) =>
    savings.entries
      .filter((e) => e.type === "aporte" && e.occurredOn >= c.start && e.occurredOn <= c.end)
      .reduce((sum, e) => sum + e.amountUsd * (e.fxRate ?? savings.lastFx?.rate ?? 0), 0);

  // Los fijos pagados con tarjeta ya vienen en el resumen; sumarlos de nuevo los contaría dos veces.
  const fixedOffCard = ((fixedData ?? []) as unknown as FixedRow[]).filter(
    (f) => f.category_id && f.categories && f.payment_methods?.type !== "tarjeta_credito",
  );

  // Totales por tipo de un ciclo cualquiera (gastos + fijos fuera de tarjeta + ahorro real).
  function totalsFor(cycleTxs: CycleTx[], cycle: Cycle): Record<Kind, number> {
    const totals: Record<Kind, number> = { necesidad: 0, gusto: 0, ahorro: savedIn(cycle) };
    for (const t of cycleTxs) if (t.kind) totals[t.kind as Kind] += t.amount;
    for (const f of fixedOffCard) totals[f.categories!.kind] += Number(f.amount);
    return totals;
  }

  // ---- Ciclo actual: por categoría ----
  const txs = all.filter((t) => inCycle(t, current));
  const byCategory = new Map<string, Item>();
  const add = (key: string, name: string, emoji: string, kind: Kind, amount: number) => {
    const prev = byCategory.get(key);
    byCategory.set(key, { key, name, emoji, kind, amount: (prev?.amount ?? 0) + amount });
  };
  for (const t of txs) {
    if (!t.categoryId || !t.kind) continue;
    add(t.categoryId, t.categoryName ?? "Sin nombre", t.emoji ?? "💰", t.kind as Kind, t.amount);
  }
  for (const f of fixedOffCard) {
    add(f.category_id!, f.categories!.name, f.categories!.envelopes?.emoji ?? "📌", f.categories!.kind, Number(f.amount));
  }
  const savedNow = savedIn(current);
  if (savedNow > 0) add("ahorro", "Ahorro en dólares", "🏦", "ahorro", savedNow);

  const items = [...byCategory.values()].sort((a, b) => b.amount - a.amount);
  const totalOf = (k: Kind) => items.filter((i) => i.kind === k).reduce((s, i) => s + i.amount, 0);
  const free = income - items.reduce((s, i) => s + i.amount, 0);

  const spending = items.filter((i) => i.kind !== "ahorro").slice(0, 8);
  const maxSpending = Math.max(1, ...spending.map((i) => i.amount));
  const barOf: Record<Kind, string> = { necesidad: "bg-kind-need", gusto: "bg-kind-want", ahorro: "bg-kind-save" };

  // ---- Evolución: solo ciclos que tienen gastos cargados ----
  const evolution = cycles
    .map((c) => {
      const cycleTxs = all.filter((t) => inCycle(t, c));
      return { cycle: c, hasData: cycleTxs.length > 0, totals: totalsFor(cycleTxs, c), isCurrent: c === current };
    })
    .filter((e) => e.hasData);

  let evolutionInsight: string | null = null;
  if (evolution.length >= 2) {
    const last = evolution[evolution.length - 1];
    const prev = evolution[evolution.length - 2];
    const diff = pct(last.totals.gusto, income) - pct(prev.totals.gusto, income);
    evolutionInsight =
      diff === 0
        ? "Tus gustos están igual que en el ciclo anterior."
        : `Tus gustos ${diff > 0 ? "subieron" : "bajaron"} ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "punto" : "puntos"} del sueldo respecto del ciclo anterior.`;
    if (last.isCurrent) evolutionInsight += " (El ciclo actual todavía está en curso.)";
  }

  // ---- Comercios: últimos 3 ciclos ----
  const windowStart = cycles[cycles.length - 3].start;
  const merchants = new Map<string, { name: string; total: number; count: number }>();
  for (const t of all) {
    if (t.cashDate < windowStart || t.cashDate > current.end) continue;
    if (!t.description || t.kind === "ahorro") continue;
    const key = merchantKey(t.description);
    if (!key) continue;
    const prev = merchants.get(key);
    merchants.set(key, {
      name: prev?.name ?? prettyName(t.description),
      total: (prev?.total ?? 0) + t.amount,
      count: (prev?.count ?? 0) + 1,
    });
  }
  const topMerchants = [...merchants.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  const maxMerchant = Math.max(1, ...topMerchants.map((m) => m.total));
  const merchantsTotal = [...merchants.values()].reduce((s, m) => s + m.total, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Análisis</h1>
        <p className="text-sm text-muted">
          Sobre tu sueldo de {formatARS(income)}. Los gastos con tarjeta cuentan cuando se pagan.
        </p>
      </header>

      {/* 1. Sueldo repartido, en general y por detalle */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Tu sueldo, repartido</h2>

        <div
          className="mt-3 flex h-4 overflow-hidden rounded-full bg-kind-free"
          role="img"
          aria-label={KINDS.map((k) => `${k.label} ${pct(totalOf(k.kind), income)}%`).join(", ")}
        >
          {KINDS.map((k) => (
            <div
              key={k.kind}
              className={k.bar}
              style={{ width: `${Math.min(100, (totalOf(k.kind) / income) * 100)}%` }}
            />
          ))}
        </div>

        <div className="mt-3 divide-y divide-border">
          {KINDS.map((k) => {
            const total = totalOf(k.kind);
            const detail = items.filter((i) => i.kind === k.kind);
            const status =
              k.kind === "ahorro"
                ? total / income >= k.target
                  ? "ok"
                  : "warn"
                : statusFor(total, income * k.target);
            return (
              <details key={k.kind} className="group py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3">
                  <span className={`size-3 rounded-sm ${k.bar}`} aria-hidden />
                  <span className="flex-1">
                    <span className="block font-medium">{k.label}</span>
                    <span className="block text-sm text-muted">
                      {pct(total, income)}% del sueldo · referencia {Math.round(k.target * 100)}%
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">{formatARS(total)}</span>
                    <StatusBadge status={status as "ok" | "warn" | "over"} />
                  </span>
                </summary>
                <ul className="mb-2 ml-6 space-y-1 border-l border-border pl-3">
                  {detail.length === 0 && <li className="py-1 text-sm text-muted">Nada cargado todavía.</li>}
                  {detail.map((i) => (
                    <li key={i.key} className="flex items-center justify-between gap-2 py-1 text-sm">
                      <span>
                        <span aria-hidden>{i.emoji}</span> {i.name}
                      </span>
                      <span className="tabular-nums text-muted">
                        {formatARS(i.amount)} · {pct(i.amount, income)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
          <div className="flex min-h-12 items-center gap-3 py-1">
            <span className="size-3 rounded-sm bg-kind-free" aria-hidden />
            <span className="flex-1">
              <span className="block font-medium">{free >= 0 ? "Sin asignar" : "Te pasaste del sueldo"}</span>
              <span className="block text-sm text-muted">{pct(Math.abs(free), income)}% del sueldo</span>
            </span>
            <span className={`font-semibold tabular-nums ${free < 0 ? "text-over" : ""}`}>
              {free < 0 ? `−${formatARS(-free)}` : formatARS(free)}
            </span>
          </div>
        </div>
      </section>

      {/* 2. En qué se va la plata */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">En qué se va la plata</h2>
        <ul className="mt-3 space-y-3">
          {spending.length === 0 && <li className="text-sm text-muted">Todavía no hay gastos en este ciclo.</li>}
          {spending.map((i) => (
            <li key={i.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">
                  <span aria-hidden>{i.emoji}</span> {i.name}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatARS(i.amount)} <span className="font-normal text-muted">· {pct(i.amount, income)}%</span>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                <div className={`h-full rounded-full ${barOf[i.kind]}`} style={{ width: `${(i.amount / maxSpending) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Evolución mes a mes */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Evolución, ciclo a ciclo</h2>
        {evolution.length < 2 ? (
          <p className="mt-2 text-sm text-muted">
            Para ver cómo evolucionás hacen falta al menos dos ciclos con gastos cargados. Subí el resumen del mes
            anterior y aparece acá.
          </p>
        ) : (
          <>
            {evolutionInsight && <p className="mt-2 text-sm font-medium">{evolutionInsight}</p>}
            <ul className="mt-3 space-y-4">
              {evolution.map((e) => (
                <li key={e.cycle.start}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium capitalize">
                      {monthName(e.cycle.end)}
                      {e.isCurrent && <span className="font-normal text-muted"> · en curso</span>}
                    </span>
                    <span className="text-muted">
                      {KINDS.map((k) => `${k.label.slice(0, 4)}. ${pct(e.totals[k.kind], income)}%`).join(" · ")}
                    </span>
                  </div>
                  <div
                    className="mt-1 flex h-3 overflow-hidden rounded-full bg-kind-free"
                    role="img"
                    aria-label={KINDS.map((k) => `${k.label} ${pct(e.totals[k.kind], income)}%`).join(", ")}
                  >
                    {KINDS.map((k) => (
                      <div
                        key={k.kind}
                        className={k.bar}
                        style={{ width: `${Math.min(100, (e.totals[k.kind] / income) * 100)}%` }}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Los ciclos anteriores se calculan con tu sueldo y tus fijos actuales, y el cobro en el último día hábil
              (sin feriados).
            </p>
          </>
        )}
      </section>

      {/* 4. Comercios donde más gastás */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Comercios donde más gastás</h2>
        <p className="text-sm text-muted">Últimos 3 ciclos, según lo que figura en tus resúmenes.</p>
        <ul className="mt-3 space-y-3">
          {topMerchants.length === 0 && (
            <li className="text-sm text-muted">Todavía no hay comercios para mostrar.</li>
          )}
          {topMerchants.map((m) => (
            <li key={m.name}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{m.name}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatARS(m.total)}{" "}
                  <span className="font-normal text-muted">· {pct(m.total, merchantsTotal)}%</span>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-kind-need" style={{ width: `${(m.total / maxMerchant) * 100}%` }} />
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {m.count} {m.count === 1 ? "compra" : "compras"} · promedio {formatARS(m.total / m.count)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
