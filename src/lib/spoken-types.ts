// Tipos compartidos entre la acción de servidor y la pantalla ("Contame el gasto").

export type SpokenDraft = {
  amount: number | null;
  description: string;
  categoryId: string | null;
  methodId: string | null;
  date: string | null; // YYYY-MM-DD, null = hoy
  installments: number | null;
  more: boolean; // mencionó más de un gasto: solo se interpreta el primero
};

export type SpokenState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "ready"; key: number; heard: string; draft: SpokenDraft };
