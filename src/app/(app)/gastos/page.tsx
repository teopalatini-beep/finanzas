import Link from "next/link";
import { CalendarClock, CreditCard, FileUp, PencilLine } from "lucide-react";
import { InboxCard } from "@/components/InboxCard";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { getCardSettings, loadCycle } from "@/lib/cashflow";
import { getHoyData } from "@/lib/data";
import { loadInbox } from "@/lib/inbox";
import { longDate, todayISO } from "@/lib/dates";
import { formatARS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Search = { sobre?: string; cat?: string };

// Link que conserva solo el filtro pedido: sin parámetros vuelve a mostrar todo.
const filterHref = (sobre?: string, cat?: string) => {
  const q = new URLSearchParams();
  if (sobre) q.set("sobre", sobre);
  if (cat) q.set("cat", cat);
  const qs = q.toString();
  return qs ? `/gastos?${qs}` : "/gastos";
};

const chip = (active: boolean) =>
  `inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-sm ${
    active ? "border-accent bg-accent-strong font-medium text-white" : "border-border bg-surface"
  }`;

export default async function GastosPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { sobre, cat } = await searchParams;
  const supabase = await createClient();
  const today = todayISO();

  const { data: period } = await supabase
    .from("periods")
    .select("start_date, end_date")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  const [rows, hoy, inbox] = await Promise.all([
    period ? getCardSettings().then((card) => loadCycle(period, card)) : Promise.resolve([]),
    getHoyData(),
    loadInbox(),
  ]);

  // Filtros: primero el sobre (Comida, Salidas…) y, dentro de él, la categoría.
  const sobres = [...new Set(rows.map((r) => r.envelopeName).filter((n): n is string => !!n))];
  const categorias = sobre
    ? [...new Set(rows.filter((r) => r.envelopeName === sobre).map((r) => r.categoryName).filter((n): n is string => !!n))]
    : [];
  const visible = rows.filter(
    (r) => (!sobre || r.envelopeName === sobre) && (!cat || r.categoryName === cat),
  );
  const filtering = !!sobre;
  const total = visible.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Gastos</h1>
        <p className="text-sm text-muted">
          {rows.length === 0
            ? "Todavía no hay gastos que se paguen en este ciclo."
            : `${filtering ? "Filtrados" : "Se pagan en este ciclo"}: ${formatARS(total)} en ${visible.length} ${visible.length === 1 ? "gasto" : "gastos"}`}
        </p>
      </header>

      <InboxCard items={inbox} />

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
              <CalendarClock size={20} className="mt-0.5 text-warn-fg" aria-hidden />
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
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-strong font-medium text-white"
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

      {sobres.length > 1 && (
        <nav aria-label="Filtrar gastos" className="space-y-2">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Link href={filterHref()} className={chip(!filtering)}>
              Todos
            </Link>
            {sobres.map((n) => (
              <Link key={n} href={filterHref(n)} className={chip(sobre === n)}>
                {n}
              </Link>
            ))}
          </div>
          {categorias.length > 1 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              <Link href={filterHref(sobre)} className={chip(!cat)}>
                Todas
              </Link>
              {categorias.map((n) => (
                <Link key={n} href={filterHref(sobre, n)} className={chip(cat === n)}>
                  {n}
                </Link>
              ))}
            </div>
          )}
        </nav>
      )}

      {filtering && visible.length === 0 && (
        <p className="text-sm text-muted">No hay gastos con ese filtro en este ciclo.</p>
      )}

      <ul className="space-y-2">
        {visible
          .sort((a, b) => (a.cashDate < b.cashDate ? 1 : -1))
          .map((r) => (
            <li key={r.id} className="flex items-center rounded-2xl border border-border bg-surface pr-1">
              <Link
                href={`/gastos/editar/${r.id}`}
                aria-label={`Editar ${r.description ?? r.categoryName ?? "gasto"}`}
                className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-4"
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
              </Link>
              <DeleteExpenseButton id={r.id} />
            </li>
          ))}
      </ul>
    </div>
  );
}
