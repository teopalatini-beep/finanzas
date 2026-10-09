import Link from "next/link";
import { CategoryCreator } from "@/components/CategoryCreator";
import { ExpenseForm } from "@/components/ExpenseForm";
import { getHoyData } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

type EnvelopeRow = {
  id: string;
  name: string;
  emoji: string | null;
  categories: { id: string; name: string; description: string | null }[];
};

export default async function NuevoGastoPage() {
  const supabase = await createClient();
  const [{ data: envelopes }, { data: methods }, hoy] = await Promise.all([
    supabase
      .from("envelopes")
      .select("id, name, emoji, categories(id, name, description)")
      .order("sort_order"),
    supabase.from("payment_methods").select("id, name, type").order("created_at"),
    getHoyData(),
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
        free: hoy.free.amount,
      }
    : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Nuevo gasto</h1>
        <Link href="/gastos/importar" className="text-sm font-medium text-ok underline underline-offset-2">
          ¿Tenés un PDF o fotos? Subilos en vez de cargar a mano
        </Link>
      </header>
      <CategoryCreator envelopes={groups} />
      <ExpenseForm groups={groups} methods={methods ?? []} today={todayISO()} advice={advice} />
    </div>
  );
}
