import Link from "next/link";
import { CategoryCreator } from "@/components/CategoryCreator";
import { NewExpense } from "@/components/NewExpense";
import { loadInboxItem } from "@/lib/inbox";
import { loadExpenseMemory } from "@/lib/expense-memory";
import { getHoyData } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

type EnvelopeRow = {
  id: string;
  name: string;
  emoji: string | null;
  categories: { id: string; name: string; description: string | null }[];
};

const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export default async function NuevoGastoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const fromParam = Array.isArray(params.desde) ? params.desde[0] : params.desde;
  const inboxItem = fromParam && isUUID(fromParam) ? await loadInboxItem(fromParam) : null;
  const supabase = await createClient();
  const [{ data: envelopes }, { data: methods }, hoy, memory] = await Promise.all([
    supabase
      .from("envelopes")
      .select("id, name, emoji, categories(id, name, description)")
      .order("sort_order"),
    supabase.from("payment_methods").select("id, name, type").order("created_at"),
    getHoyData(),
    loadExpenseMemory(),
  ]);

  const groups = ((envelopes ?? []) as EnvelopeRow[]).map((e) => ({
    envelopeId: e.id,
    envelope: e.name,
    emoji: e.emoji ?? "",
    categories: e.categories,
  }));

  // Datos para los avisos en vivo. Sin ciclo vigente, el formulario funciona igual, sin avisos.
  const advice = hoy
    ? {
        envelopes: hoy.envelopes.map((e) => ({ id: e.id, name: e.name, budget: e.budget, spent: e.spent })),
        card: hoy.card,
        cycleEnd: hoy.period.end,
        nextCycleCommitted: hoy.nextCycleCommitted,
        nextBase: hoy.nextBase,
        budgetsActive: hoy.budgetsActive,
        free: hoy.balance ? hoy.balance.balance : hoy.free.amount,
      }
    : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{inboxItem ? "Confirmar desde tus mails" : "Nuevo gasto"}</h1>
        <Link href="/gastos/importar" className="text-sm font-medium text-accent-fg underline underline-offset-2">
          ¿Tenés un PDF o fotos? Subilos en vez de cargar a mano
        </Link>
      </header>
      <CategoryCreator envelopes={groups} />
      <NewExpense groups={groups} methods={methods ?? []} today={todayISO()} advice={advice}
        memory={memory}
        inboxId={inboxItem?.id ?? null}
        initialDraft={
          inboxItem
            ? {
                amount: inboxItem.amount,
                description: inboxItem.merchant,
                categoryId: null,
                methodId: null,
                // Un pago ya hecho se carga con su fecha; una factura, con la fecha de hoy (cuando la pagás).
                date: inboxItem.kind === "pago" && inboxItem.occurredOn && inboxItem.occurredOn <= todayISO() ? inboxItem.occurredOn : null,
                installments: null,
                more: false,
              }
            : null
        }
      />
    </div>
  );
}
