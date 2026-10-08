import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Lo que le pedimos a la IA que devuelva. El esquema fuerza el formato:
// nada de texto libre, solo datos.
const LineSchema = z.object({
  date: z.string().describe("Fecha del consumo en formato YYYY-MM-DD"),
  description: z.string().describe("Comercio o concepto, sin datos personales"),
  amount: z
    .number()
    .describe("Monto en valor absoluto. En una cuota, el monto de ESA cuota (no el total)."),
  currency: z.enum(["ARS", "USD"]),
  kind: z.enum(["consumo", "impuesto_o_cargo", "pago_o_credito"]),
  installment_number: z.number().nullable().describe("Número de cuota (ej. 3 en '03/06'), o null"),
  installment_total: z.number().nullable().describe("Total de cuotas (ej. 6 en '03/06'), o null"),
  category_id: z.string().nullable().describe("id de la lista de categorías, o null si no hay seguridad"),
});

const ExtractionSchema = z.object({
  closing_date: z.string().nullable().describe("Fecha de cierre del resumen, YYYY-MM-DD, o null"),
  lines: z.array(LineSchema),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

export type CategoryOption = { id: string; label: string };

const SYSTEM = `Extraés los movimientos de los archivos que te paso y los devolvés en el formato pedido. Los archivos pueden ser: un resumen de tarjeta de crédito argentino (Visa, Banco Galicia), o fotos y capturas de pantalla de gastos sueltos (tickets, comprobantes de transferencia, capturas de apps de pago o de homebanking, facturas). Puede haber varios archivos: juntá todos los movimientos en una sola lista.

Reglas:
- Una línea por movimiento. En un resumen, ignorá encabezados, totales, saldos, pago mínimo y publicidad. En un ticket o comprobante suele haber un único movimiento: el total pagado, no cada ítem.
- Si un mismo movimiento aparece en más de un archivo, devolvelo una sola vez.
- kind: "consumo" para compras (incluye cuotas); "impuesto_o_cargo" para intereses, IVA, impuesto de sellos, comisiones y percepciones; "pago_o_credito" para pagos del resumen anterior, devoluciones y bonificaciones.
- Cuotas: si la línea indica cuota (ej. "C.03/06", "03/06", "Cuota 3 de 6"), completá installment_number y installment_total y poné en amount el valor de esa cuota. Si no es una compra en cuotas, ambos van null.
- Fechas: devolvelas en YYYY-MM-DD. Si el resumen no muestra el año, deducilo a partir de la fecha de hoy que te paso.
- currency: "USD" solo si la línea está expresamente en dólares; si no, "ARS".
- category_id: elegí SOLO de la lista que te paso. Si no estás seguro, null. No inventes categorías.
- No incluyas números de tarjeta, DNI, domicilio ni nombres de personas en ningún campo.
- No inventes movimientos. Si no podés leer una línea con seguridad, omitila.`;

export type ExtractInput = {
  files: { base64: string; mediaType: string }[];
  categories: CategoryOption[];
  today: string;
};

export type ExtractResult = { ok: true; data: Extraction } | { ok: false; error: string };

export async function extractStatement(input: ExtractInput): Promise<ExtractResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error: "Falta la clave de Anthropic. Agregala en .env.local (ANTHROPIC_API_KEY) y reiniciá el servidor.",
    };
  }

  const client = new Anthropic();
  const fileBlocks: Anthropic.ContentBlockParam[] = input.files.map((f) =>
    f.mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: f.base64 },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: f.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: f.base64,
          },
        },
  );

  const categoryList = input.categories.map((c) => `${c.id} | ${c.label}`).join("\n");

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            ...fileBlocks,
            {
              type: "text",
              text: `Hoy es ${input.today}.\n\nCategorías disponibles (id | sobre > categoría):\n${categoryList}\n\nExtraé los movimientos de estos archivos.`,
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ExtractionSchema) },
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "La IA no pudo procesar este archivo. Probá con otro." };
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return { ok: false, error: "No se pudo interpretar el resumen. Probá de nuevo." };
    }
    return { ok: true, data: response.parsed_output };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "La clave de Anthropic no es válida. Revisá .env.local." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Demasiados pedidos seguidos. Esperá un minuto y probá de nuevo." };
    }
    if (error instanceof Anthropic.BadRequestError) {
      // Incluye "saldo insuficiente" y archivos que la API no puede leer.
      return { ok: false, error: `La API rechazó el pedido: ${error.message}` };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: "Falló la conexión con la IA. Probá de nuevo en un rato." };
    }
    throw error;
  }
}
