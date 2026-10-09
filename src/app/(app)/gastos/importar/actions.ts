"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addMonths, todayISO } from "@/lib/dates";
import { extractStatement } from "@/lib/extract";
import type { ParseState, PlanOption, ReviewLine, SaveState } from "@/lib/import-types";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// ---------------------------------------------------------------------------
// Paso 1: leer el archivo con la IA y armar el borrador para revisar.
// El archivo se procesa en memoria y se descarta: nunca se guarda.
// ---------------------------------------------------------------------------
export async function parseStatement(_prev: ParseState, formData: FormData): Promise<ParseState> {
  // Esta acción gasta saldo de la API: se exige sesión de forma explícita, sin depender solo del proxy.
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { status: "error", error: "Tu sesión venció. Volvé a entrar." };

  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  const paymentMethodId = String(formData.get("payment_method_id") ?? "");

  if (files.length === 0) return { status: "error", error: "Elegí al menos un archivo." };
  if (files.length > 10) return { status: "error", error: "Máximo 10 archivos por vez." };
  if (files.some((f) => !ALLOWED.includes(f.type))) {
    return { status: "error", error: "Subí PDF o imágenes (JPG, PNG, WebP)." };
  }
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_BYTES) {
    return { status: "error", error: "Los archivos pesan más de 10 MB en total." };
  }
  if (!isUUID(paymentMethodId)) return { status: "error", error: "Elegí el medio de pago." };

  const buffers = await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer())));
  // Huella del conjunto: la misma selección de archivos da siempre la misma huella.
  const fileHash = createHash("sha256")
    .update(buffers.map((b) => createHash("sha256").update(b).digest("hex")).sort().join(""))
    .digest("hex");
  const fileName = files.map((f) => f.name).join(", ").slice(0, 200);

  const supabase = await createClient();

  const { data: already } = await supabase
    .from("documents")
    .select("id")
    .eq("file_hash", fileHash)
    .maybeSingle();
  if (already) return { status: "error", error: "Ya cargaste este resumen." };

  const [{ data: envelopes }, { data: plansData }] = await Promise.all([
    supabase.from("envelopes").select("name, categories(id, name, kind, description)").order("sort_order"),
    supabase.from("installment_plans").select("id, description, total_amount, installments_count"),
  ]);

  type Env = { name: string; categories: { id: string; name: string; kind: string; description: string | null }[] };
  const categories = ((envelopes ?? []) as Env[]).flatMap((e) =>
    e.categories.map((c) => ({
      id: c.id,
      label: `${e.name} > ${c.name} (${c.kind})${c.description ? `: ${c.description}` : ""}`,
    })),
  );
  const validCategoryIds = new Set(categories.map((c) => c.id));

  const result = await extractStatement({
    files: buffers.map((b, i) => ({ base64: b.toString("base64"), mediaType: files[i].type })),
    categories,
    today: todayISO(),
  });
  if (!result.ok) return { status: "error", error: result.error };

  const plans: PlanOption[] = (plansData ?? []).map((p) => ({
    id: p.id,
    description: p.description,
    total_amount: Number(p.total_amount),
    installments_count: p.installments_count,
  }));

  // Posibles duplicados: ya hay un gasto con la misma fecha y monto.
  const dates = result.data.lines.map((l) => l.date).sort();
  const { data: existing } = dates.length
    ? await supabase
        .from("transactions")
        .select("occurred_on, amount")
        .gte("occurred_on", dates[0])
        .lte("occurred_on", dates[dates.length - 1])
    : { data: [] };
  const existingKeys = new Set((existing ?? []).map((t) => `${t.occurred_on}|${Number(t.amount).toFixed(2)}`));

  const lines: ReviewLine[] = result.data.lines.map((l, i) => {
    const amount = Math.abs(l.amount);
    const total = l.installment_total && l.installment_total > 1 ? l.installment_total : null;
    const number = total && l.installment_number ? l.installment_number : null;

    // ¿Esta cuota pertenece a un plan que ya tenemos? Se compara cantidad de cuotas y monto.
    const match = total
      ? plans.find((p) => p.installments_count === total && Math.abs(p.total_amount / total - amount) < 1.5)
      : undefined;

    const duplicate = existingKeys.has(`${l.date}|${amount.toFixed(2)}`);
    return {
      key: String(i),
      date: l.date,
      description: l.description,
      amount,
      currency: l.currency,
      kind: l.kind,
      installment_number: number,
      installment_total: number ? total : null,
      category_id: l.category_id && validCategoryIds.has(l.category_id) ? l.category_id : null,
      plan_id: match?.id ?? null,
      duplicate,
      include: l.kind !== "pago_o_credito" && l.currency === "ARS" && !duplicate,
    };
  });

  return {
    status: "ready",
    fileName,
    fileHash,
    paymentMethodId,
    closingDate: result.data.closing_date,
    lines,
    plans,
  };
}

// ---------------------------------------------------------------------------
// Paso 2: guardar lo que revisaste y confirmaste.
// ---------------------------------------------------------------------------
const SaveSchema = z.object({
  fileName: z.string().max(200),
  fileHash: z.string().length(64),
  paymentMethodId: z.string().refine(isUUID),
  closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  lines: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().max(200),
        amount: z.number().positive(),
        category_id: z.string().refine(isUUID),
        installment_number: z.number().int().positive().nullable(),
        installment_total: z.number().int().min(2).max(48).nullable(),
        plan_id: z.string().refine(isUUID).nullable(),
      }),
    )
    .min(1)
    .max(300),
});

export async function saveImport(_prev: SaveState, formData: FormData): Promise<SaveState> {
  let payload: z.infer<typeof SaveSchema>;
  try {
    payload = SaveSchema.parse(JSON.parse(String(formData.get("payload") ?? "")));
  } catch {
    return { error: "Los datos no son válidos. Volvé a subir el resumen." };
  }

  const supabase = await createClient();

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      payment_method_id: payload.paymentMethodId,
      original_name: payload.fileName,
      file_hash: payload.fileHash,
      closing_date: payload.closingDate,
      status: "procesado",
    })
    .select("id")
    .single();
  if (docError) {
    return {
      error: docError.code === "23505" ? "Ya cargaste este resumen." : "No se pudo guardar el resumen.",
    };
  }

  let skipped = 0;
  const rows: Record<string, unknown>[] = [];

  for (const line of payload.lines) {
    let planId: string | null = null;
    const isInstallment = line.installment_total !== null && line.installment_number !== null;

    if (isInstallment) {
      planId = line.plan_id;
      if (!planId) {
        // Plan nuevo: se reconstruye cuándo arrancó a partir de la cuota que vemos.
        const { data: plan, error } = await supabase
          .from("installment_plans")
          .insert({
            description: line.description,
            total_amount: Math.round(line.amount * line.installment_total! * 100) / 100,
            installments_count: line.installment_total,
            first_installment: addMonths(line.date, -(line.installment_number! - 1)),
            category_id: line.category_id,
            payment_method_id: payload.paymentMethodId,
          })
          .select("id")
          .single();
        if (error) return { error: "No se pudo crear un plan de cuotas." };
        planId = plan.id;
      } else {
        // Si esa cuota ya estaba cargada, no se duplica.
        const { count } = await supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("installment_plan_id", planId)
          .eq("installment_number", line.installment_number);
        if (count && count > 0) {
          skipped++;
          continue;
        }
      }
    }

    rows.push({
      occurred_on: line.date,
      amount: line.amount,
      description: line.description,
      category_id: line.category_id,
      payment_method_id: payload.paymentMethodId,
      source: "documento",
      document_id: doc.id,
      installment_plan_id: planId,
      installment_number: isInstallment ? line.installment_number : null,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("transactions").insert(rows);
    if (error) {
      // No dejar un resumen "cargado" sin sus gastos: se deshace para poder reintentar.
      await supabase.from("documents").delete().eq("id", doc.id);
      return { error: "No se pudieron guardar los gastos. Probá de nuevo." };
    }
  }

  void skipped;
  revalidatePath("/");
  revalidatePath("/gastos");
  redirect("/gastos");
}
