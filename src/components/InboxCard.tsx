import Link from "next/link";
import { Mail } from "lucide-react";
import { discardInboxItem } from "@/app/(app)/gastos/inbox-actions";
import type { InboxItem } from "@/lib/inbox";
import { daysBetween, longDate, todayISO } from "@/lib/dates";
import { formatARS } from "@/lib/format";

function when(item: InboxItem, today: string) {
  if (item.kind === "pago") return item.occurredOn ? `Pagado el ${longDate(item.occurredOn)}` : "Pagado";
  if (!item.dueOn) return "Sin vencimiento";
  const d = daysBetween(today, item.dueOn);
  if (d < 0) return `Venció el ${longDate(item.dueOn)}`;
  if (d === 0) return "Vence hoy";
  if (d === 1) return "Vence mañana";
  return `Vence el ${longDate(item.dueOn)}`;
}

function Row({ item, today, cta }: { item: InboxItem; today: string; cta: string }) {
  const overdue = item.kind === "factura" && item.dueOn !== null && item.dueOn < today;
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.merchant}</p>
        <p className={`text-sm ${overdue ? "font-medium text-over-fg" : "text-muted"}`}>{when(item, today)}</p>
      </div>
      <p className="font-semibold tabular-nums">{item.amount === null ? "Monto a confirmar" : formatARS(item.amount)}</p>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/gastos/nuevo?desde=${item.id}`}
          className="flex min-h-11 items-center rounded-xl bg-accent-strong px-3 text-sm font-medium text-white"
        >
          {cta}
        </Link>
        <form action={discardInboxItem}>
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" aria-label={`Descartar ${item.merchant}`} className="min-h-11 rounded-xl px-2 text-sm text-muted">
            Descartar
          </button>
        </form>
      </div>
    </li>
  );
}

// Lo que detectó el conector de mails: facturas por pagar (con vencimiento) y pagos ya hechos.
export function InboxCard({ items }: { items: InboxItem[] }) {
  if (items.length === 0) return null;
  const today = todayISO();
  const bills = items.filter((i) => i.kind === "factura");
  const payments = items.filter((i) => i.kind === "pago");

  return (
    <section aria-label="Detectado en tus mails" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        <Mail size={18} aria-hidden /> Detectado en tus mails
      </h2>
      {bills.length > 0 && (
        <div className="mt-2">
          <h3 className="text-sm font-medium">A pagar</h3>
          <ul className="divide-y divide-border">
            {bills.map((i) => (
              <Row key={i.id} item={i} today={today} cta="Ya lo pagué" />
            ))}
          </ul>
        </div>
      )}
      {payments.length > 0 && (
        <div className="mt-2">
          <h3 className="text-sm font-medium">Pagos para confirmar</h3>
          <ul className="divide-y divide-border">
            {payments.map((i) => (
              <Row key={i.id} item={i} today={today} cta="Cargar" />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
