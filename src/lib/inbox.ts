import { createClient } from "@/lib/supabase/server";

export type InboxItem = {
  id: string;
  kind: "pago" | "factura";
  merchant: string;
  amount: number | null;
  occurredOn: string | null;
  dueOn: string | null;
};

// Lo detectado en tus mails que todavía no confirmaste. Si falta correr la migración, devuelve vacío.
export async function loadInbox(): Promise<InboxItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_items")
    .select("id, kind, merchant, amount, occurred_on, due_on")
    .eq("status", "pendiente")
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("occurred_on", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    merchant: r.merchant,
    amount: r.amount === null ? null : Number(r.amount),
    occurredOn: r.occurred_on,
    dueOn: r.due_on,
  }));
}

export async function loadInboxItem(id: string): Promise<InboxItem | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inbox_items")
    .select("id, kind, merchant, amount, occurred_on, due_on, status")
    .eq("id", id)
    .eq("status", "pendiente")
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    kind: data.kind,
    merchant: data.merchant,
    amount: data.amount === null ? null : Number(data.amount),
    occurredOn: data.occurred_on,
    dueOn: data.due_on,
  };
}
