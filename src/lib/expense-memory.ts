import { merchantKey, prettyName } from "@/lib/merchants";
import { createClient } from "@/lib/supabase/server";

// Lo que la app aprende de tus gastos anteriores: "Coto" -> Comida + Débito.
export type MemoryEntry = { key: string; label: string; categoryId: string; methodId: string; count: number };

export async function loadExpenseMemory(): Promise<MemoryEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("description, category_id, payment_method_id")
    .not("description", "is", null)
    .not("category_id", "is", null)
    .not("payment_method_id", "is", null)
    .is("installment_plan_id", null)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  type Acc = { label: string; total: number; pairs: Map<string, number>; order: string[] };
  const byKey = new Map<string, Acc>();
  for (const r of data ?? []) {
    const key = merchantKey(String(r.description));
    if (key.length < 2) continue;
    const pair = `${r.category_id}|${r.payment_method_id}`;
    let acc = byKey.get(key);
    if (!acc) {
      acc = { label: prettyName(String(r.description)), total: 0, pairs: new Map(), order: [] };
      byKey.set(key, acc);
    }
    acc.total += 1;
    if (!acc.pairs.has(pair)) acc.order.push(pair); // la primera vez que aparece es la más reciente
    acc.pairs.set(pair, (acc.pairs.get(pair) ?? 0) + 1);
  }

  const out: MemoryEntry[] = [];
  for (const [key, acc] of byKey) {
    // Gana la combinación más usada; si empatan, la más reciente.
    const best = acc.order.reduce((a, b) => (acc.pairs.get(b)! > acc.pairs.get(a)! ? b : a));
    const [categoryId, methodId] = best.split("|");
    out.push({ key, label: acc.label, categoryId, methodId, count: acc.total });
  }
  return out.sort((a, b) => b.count - a.count).slice(0, 80);
}
