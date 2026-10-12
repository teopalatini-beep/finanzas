import { createClient } from "@/lib/supabase/server";

// Descarga tus datos: "json" con todo (copia de seguridad) o "csv" con los gastos (para Excel).
const TABLES = [
  "settings",
  "periods",
  "envelopes",
  "categories",
  "payment_methods",
  "fixed_expenses",
  "documents",
  "installment_plans",
  "transactions",
  "savings_accounts",
  "savings_entries",
  "goals",
] as const;

const stamp = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
const csvCell = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const format = new URL(request.url).searchParams.get("formato");

  if (format === "csv") {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "occurred_on, amount, description, installment_number, payment_methods(name), categories(name, envelopes(name))",
      )
      .order("occurred_on", { ascending: false });
    if (error) return new Response("No se pudieron leer los gastos", { status: 500 });

    type Row = {
      occurred_on: string;
      amount: number;
      description: string | null;
      installment_number: number | null;
      payment_methods: { name: string } | null;
      categories: { name: string; envelopes: { name: string } | null } | null;
    };
    const lines = [["Fecha", "Monto", "Descripción", "Categoría", "Sobre", "Medio de pago", "Cuota"].map(csvCell).join(",")];
    for (const r of (data ?? []) as unknown as Row[]) {
      lines.push(
        [
          r.occurred_on,
          r.amount,
          r.description,
          r.categories?.name,
          r.categories?.envelopes?.name,
          r.payment_methods?.name,
          r.installment_number,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    // El BOM hace que Excel y Google Sheets lean bien las tildes.
    return new Response("﻿" + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gastos-${stamp()}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const backup: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    // Una tabla que todavía no existe no frena la copia del resto.
    backup[table] = error ? { error: error.message } : data;
  }
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="finanzas-copia-${stamp()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
