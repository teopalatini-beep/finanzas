import Link from "next/link";
import { CalendarClock, CreditCard, FileUp, PencilLine } from "lucide-react";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { getCardSettings, loadCycle } from "@/lib/cashflow";
import { getHoyData } from "@/lib/data";
import { longDate, todayISO } from "@/lib/dates";
import { formatARS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function GastosPage() {
  const supabase = await createClient();
  const today = todayISO();

  const { data: period } = await supabase
    .from("periods")
    .select("start_date, end_date")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  const [rows, hoy] = await Promise.all([
    period ? getCardSettings().then((card) => loadCycle(period, card)) : Promise.resolve([]),
    getHoyData(),
  ]);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Gastos</h1>
        <p className="text-sm text-muted">
          {rows.length === 0
            ? "Todavía no hay gastos que se paguen en este ciclo."
            : `Se pagan en este ciclo: ${formatARS(total)} en ${rows.length} ${rows.length === 1 ? "gasto" : "gastos"}`}
        </p>
      </header>

      {hoy && (
        <>
          <section aria-label="Sobres" className="space-y-3">
            {hoy.envelopes.map((e) => (
              <EnvelopeCard key={e.id} {...e} measureOnly={!hoy.budgetsActive} income={hoy.period.income} />
            ))}
          </section>

          {hoy.nextCycle.count > 0 && hoy.nextCycle.firstDueDate && (
            <section className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
              <CreditCard size={20} className="mt-0.5 text-kind-need" aria-hidden />
              <p className="text-sm">
                <span className="font-medium">Ya cargaste {formatARS(hoy.nextCycle.amount)} con la tarjeta.</span> Se
                paga desde el {longDate(hoy.nextCycle.firstDueDate)}, o sea que sale de tu próximo sueldo, no de este.
              </p>
            </section>
          )}

          {hoy.installments.map((i) => (
            <section
              key={i.description}
              className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <CalendarClock size={20} className="mt-0.5 text-warn" aria-hidden />
              <p className="text-sm">
                <span className="font-medium">Cuotas:</span> {i.description}, {formatARS(i.perMonth)}/mes. Vas por la{" "}
                {i.current} de {i.total}
                {i.remaining > 0 ? `; te quedan ${i.remaining}, hasta ${i.lastMonth}.` : "; es la última."}
              </p>
            </section>
          ))}
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/gastos/nuevo"
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ok font-medium text-white"
        >
          <PencilLine size={18} aria-hidden /> Cargar a mano
        </Link>
        <Link
          href="/gastos/importar"
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface font-medium"
        >
          <FileUp size={18} aria-hidden /> PDF o fotos
        </Link>
      </div>

      <ul className="space-y-2">
        {rows
          .sort((a, b) => (a.cashDate < b.cashDate ? 1 : -1))
          .map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface py-2 pl-4 pr-1"
            >
              <span className="text-xl" aria-hidden>
                {r.emoji ?? "💰"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.description ?? r.categoryName ?? "Gasto"}</p>
                <p className="truncate text-sm text-muted">
                  {r.isCard ? `Se paga el ${longDate(r.cashDate)}` : longDate(r.occurred_on)} · {r.categoryName} ·{" "}
                  {r.paymentMethod}
                  {r.installment_number && r.installments_count
                    ? ` · cuota ${r.installment_number}/${r.installments_count}`
                    : ""}
                </p>
              </div>
              <p className="font-semibold tabular-nums">{formatARS(r.amount)}</p>
              <DeleteExpenseButton id={r.id} />
            </li>
          ))}
      </ul>
    </div>
  );
}
