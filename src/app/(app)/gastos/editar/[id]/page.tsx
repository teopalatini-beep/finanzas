import { notFound } from "next/navigation";
import { ConfirmDelete } from "@/components/DeleteButtons";
import { EditExpenseForm } from "@/components/EditExpenseForm";
import { createClient } from "@/lib/supabase/server";
import { deleteExpenseAndBack } from "../../actions";

const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

type EnvelopeRow = {
  name: string;
  emoji: string | null;
  categories: { id: string; name: string; description: string | null }[];
};

export default async function EditarGastoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUUID(id)) notFound();

  const supabase = await createClient();
  const [{ data: tx }, { data: envelopes }, { data: methods }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, occurred_on, amount, description, category_id, payment_method_id, installment_number, installment_plans(installments_count)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("envelopes").select("name, emoji, categories(id, name, description)").order("sort_order"),
    supabase.from("payment_methods").select("id, name, type").order("created_at"),
  ]);
  if (!tx) notFound();

  const plan = tx.installment_plans as unknown as { installments_count: number } | null;
  const groups = ((envelopes ?? []) as EnvelopeRow[]).map((e) => ({
    envelope: e.name,
    emoji: e.emoji ?? "",
    categories: e.categories,
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Editar gasto</h1>
      <EditExpenseForm
        groups={groups}
        methods={methods ?? []}
        expense={{
          id: tx.id,
          amount: Number(tx.amount),
          date: tx.occurred_on,
          categoryId: tx.category_id,
          methodId: tx.payment_method_id,
          description: tx.description ?? "",
          installmentLabel: plan && tx.installment_number ? `cuota ${tx.installment_number} de ${plan.installments_count}` : null,
        }}
      />
      <ConfirmDelete
        id={tx.id}
        action={deleteExpenseAndBack}
        question="¿Borrar este gasto?"
        label="Borrar gasto"
        text="Borrar este gasto"
      />
    </div>
  );
}
