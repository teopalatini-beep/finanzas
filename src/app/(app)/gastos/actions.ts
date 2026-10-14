"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ExpenseState = { error: string | null };

const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function addExpense(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const amount = Number(formData.get("amount"));
  const date = String(formData.get("date") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const paymentMethodId = String(formData.get("payment_method_id") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const installments = Number(formData.get("installments") || 1);

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Ingresá un monto mayor a cero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "La fecha no es válida." };
  if (!isUUID(categoryId)) return { error: "Elegí una categoría." };
  if (!isUUID(paymentMethodId)) return { error: "Elegí cómo pagaste." };
  if (!Number.isInteger(installments) || installments < 1 || installments > 48) {
    return { error: "Las cuotas tienen que ser entre 1 y 48." };
  }

  const supabase = await createClient();
  let planId: string | null = null;
  let txAmount = amount;

  // Compra en cuotas: se guarda el plan una vez y se registra la primera cuota como gasto.
  if (installments > 1) {
    const { data: plan, error } = await supabase
      .from("installment_plans")
      .insert({
        description: description ?? "Compra en cuotas",
        total_amount: amount,
        installments_count: installments,
        first_installment: date,
        category_id: categoryId,
        payment_method_id: paymentMethodId,
      })
      .select("id")
      .single();
    if (error) return { error: "No se pudo guardar la compra en cuotas." };
    planId = plan.id;
    txAmount = Math.round((amount / installments) * 100) / 100;
  }

  const { data: saved, error } = await supabase
    .from("transactions")
    .insert({
    occurred_on: date,
    amount: txAmount,
    description,
    category_id: categoryId,
    payment_method_id: paymentMethodId,
    installment_plan_id: planId,
    installment_number: planId ? 1 : null,
    })
    .select("id")
    .single();
  if (error || !saved) return { error: "No se pudo guardar el gasto. Probá de nuevo." };

  // Si venía de un mail detectado, queda confirmado y enlazado a este gasto.
  const inboxId = String(formData.get("inbox_id") ?? "");
  if (isUUID(inboxId)) {
    const { data: item } = await supabase
      .from("inbox_items")
      .update({ status: "confirmado", transaction_id: saved.id })
      .eq("id", inboxId)
      .eq("status", "pendiente")
      .select("kind")
      .maybeSingle();

    // El mismo pago puede estar en la bandeja como factura y como comprobante: al confirmar uno,
    // el otro (mismo importe) se resuelve solo. Una factura pagada cierra el comprobante; un pago cierra la factura.
    if (item) {
      await supabase
        .from("inbox_items")
        .update({ status: item.kind === "pago" ? "confirmado" : "descartado", transaction_id: saved.id })
        .eq("status", "pendiente")
        .eq("kind", item.kind === "pago" ? "factura" : "pago")
        .eq("amount", txAmount);
    }
  }

  revalidatePath("/");
  revalidatePath("/gastos");
  // El id viaja en la dirección para ofrecer "Deshacer" en la pantalla de Hoy.
  redirect(`/?guardado=${saved.id}`);
}

export async function deleteExpense(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!isUUID(id)) return;

  const supabase = await createClient();

  const { data: tx } = await supabase
    .from("transactions")
    .select("installment_plan_id")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("transactions").delete().eq("id", id);

  // Si era una compra en cuotas y el plan quedó sin gastos, el plan sobra: se borra también.
  if (tx?.installment_plan_id) {
    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("installment_plan_id", tx.installment_plan_id);
    if (count === 0) {
      await supabase.from("installment_plans").delete().eq("id", tx.installment_plan_id);
    }
  }

  revalidatePath("/");
  revalidatePath("/gastos");
}

// Guarda los cambios de un gasto existente.
// Si el gasto es una cuota de una compra en cuotas, el monto y el medio de pago no se tocan:
// cambiarlos en una sola cuota dejaría el plan inconsistente.
export async function updateExpense(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const id = String(formData.get("id") ?? "");
  const amount = Number(formData.get("amount"));
  const date = String(formData.get("date") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const paymentMethodId = String(formData.get("payment_method_id") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!isUUID(id)) return { error: "Ese gasto no es válido." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Ingresá un monto mayor a cero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "La fecha no es válida." };
  if (!isUUID(categoryId)) return { error: "Elegí una categoría." };
  if (!isUUID(paymentMethodId)) return { error: "Elegí cómo pagaste." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("transactions")
    .select("installment_plan_id")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { error: "No encontré ese gasto. Puede que ya lo hayas borrado." };

  const locked = Boolean(current.installment_plan_id);
  const { error } = await supabase
    .from("transactions")
    .update({
      occurred_on: date,
      description,
      category_id: categoryId,
      ...(locked ? {} : { amount, payment_method_id: paymentMethodId }),
    })
    .eq("id", id);
  if (error) return { error: `No se pudieron guardar los cambios (${error.message}).` };

  revalidatePath("/", "layout");
  redirect("/gastos");
}

// Borra un gasto desde su pantalla de edición y vuelve a la lista.
export async function deleteExpenseAndBack(formData: FormData) {
  await deleteExpense(formData);
  redirect("/gastos");
}

// Borra el gasto recién guardado (y su plan de cuotas, si quedó vacío) y vuelve a Hoy.
export async function undoExpense(formData: FormData) {
  await deleteExpense(formData);
  redirect("/");
}

export type CategoryState = { error: string | null; ok: boolean };

// Crea una categoría nueva dentro de un sobre, con su tipo (necesidad o gusto).
export async function createCategory(_prev: CategoryState, formData: FormData): Promise<CategoryState> {
  const name = String(formData.get("name") ?? "").trim();
  const envelopeId = String(formData.get("envelope_id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const description = String(formData.get("description") ?? "").trim().slice(0, 140) || null;

  if (name.length < 2 || name.length > 40) return { error: "El nombre tiene que tener entre 2 y 40 letras.", ok: false };
  if (!isUUID(envelopeId)) return { error: "Elegí el sobre.", ok: false };
  if (!["necesidad", "gusto"].includes(kind)) return { error: "Elegí si es necesidad o gusto.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ envelope_id: envelopeId, name, kind, description });
  if (error) {
    return {
      error: error.code === "23505" ? "Ya tenés una categoría con ese nombre en ese sobre." : "No se pudo crear la categoría.",
      ok: false,
    };
  }

  revalidatePath("/gastos/nuevo");
  revalidatePath("/gastos/importar");
  revalidatePath("/analisis");
  return { error: null, ok: true };
}
