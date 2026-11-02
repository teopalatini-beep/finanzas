// Tipos compartidos entre el servidor (acciones) y la pantalla de revisión.

export type ReviewLine = {
  key: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  currency: "ARS" | "USD";
  kind: "consumo" | "impuesto_o_cargo" | "pago_o_credito";
  installment_number: number | null;
  installment_total: number | null;
  category_id: string | null;
  plan_id: string | null; // plan de cuotas existente al que se vincula (null = plan nuevo)
  duplicate: boolean; // ya existe un gasto igual (misma fecha y monto)
  include: boolean;
};

export type PlanOption = {
  id: string;
  description: string;
  total_amount: number;
  installments_count: number;
};

// Gasto cargado a mano que el desglose del resumen puede reemplazar.
export type ReplaceCandidate = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
};

export type ParseState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "ready";
      fileName: string;
      fileHash: string;
      paymentMethodId: string;
      closingDate: string | null;
      lines: ReviewLine[];
      plans: PlanOption[];
      candidates: ReplaceCandidate[];
    };

export type SaveState = { error: string | null };
