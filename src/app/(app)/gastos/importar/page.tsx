import Link from "next/link";
import { ImportFlow } from "@/components/ImportFlow";
import { createClient } from "@/lib/supabase/server";

// Leer un resumen con la IA puede tardar casi un minuto: se le da tiempo a la función en Vercel.
export const maxDuration = 120;

type EnvelopeRow = {
  name: string;
  emoji: string | null;
  categories: { id: string; name: string }[];
};

export default async function ImportarPage() {
  const supabase = await createClient();
  const [{ data: envelopes }, { data: methods }] = await Promise.all([
    supabase.from("envelopes").select("name, emoji, categories(id, name)").order("sort_order"),
    supabase.from("payment_methods").select("id, name, type").order("created_at"),
  ]);

  const groups = ((envelopes ?? []) as EnvelopeRow[]).map((e) => ({
    envelope: e.name,
    emoji: e.emoji ?? "",
    categories: e.categories,
  }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Subir resumen o comprobantes</h1>
        <Link href="/gastos/nuevo" className="text-sm font-medium text-ok underline underline-offset-2">
          ¿Un solo gasto? Cargalo a mano
        </Link>
      </header>
      <ImportFlow groups={groups} methods={methods ?? []} />
    </div>
  );
}
