import { createClient } from "@supabase/supabase-js";
import { extractMail } from "@/lib/extract-mail";

export const maxDuration = 60;

const MAX_BODY_BYTES = 4_000_000;
const MAX_PDFS = 2;
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Entrada de mails: la llama tu script de Google. No usa sesión: se identifica con una clave propia.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (token.length < 32) return Response.json({ error: "No autorizado" }, { status: 401 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return Response.json({ error: "Mail demasiado grande" }, { status: 413 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  // La clave se valida antes de gastar nada en la IA.
  const owner = await supabase.rpc("ingest_token_owner", { p_token: token });
  if (owner.error || !owner.data) return Response.json({ error: "No autorizado" }, { status: 401 });

  let payload: {
    messageId?: string;
    from?: string;
    subject?: string;
    date?: string;
    body?: string;
    attachments?: { name?: string; mimeType?: string; base64?: string }[];
  };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Formato inválido" }, { status: 400 });
  }

  const messageId = String(payload.messageId ?? "").slice(0, 100);
  if (!messageId) return Response.json({ error: "Falta el id del mail" }, { status: 400 });

  const seen = await supabase.rpc("ingest_seen", { p_token: token, p_source_id: messageId });
  if (seen.data === true) return Response.json({ created: 0, skipped: true });

  const mailDate = isDate(payload.date?.slice(0, 10) ?? null) ? payload.date!.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const pdfs = (payload.attachments ?? [])
    .filter((a) => a.mimeType === "application/pdf" && a.base64)
    .slice(0, MAX_PDFS)
    .map((a) => ({ name: String(a.name ?? "adjunto.pdf"), base64: a.base64! }));

  const result = await extractMail({
    from: String(payload.from ?? "").slice(0, 200),
    subject: String(payload.subject ?? "").slice(0, 300),
    date: mailDate,
    body: String(payload.body ?? "").slice(0, 15000),
    pdfs,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });

  let created = 0;
  for (const item of result.items) {
    const amount = item.amount && item.amount > 0 ? item.amount : null;
    const { data, error } = await supabase.rpc("ingest_inbox_item", {
      p_token: token,
      p_source_id: messageId,
      p_kind: item.kind,
      p_merchant: item.merchant.slice(0, 80),
      p_amount: amount,
      p_occurred_on: item.kind === "pago" ? (isDate(item.occurred_on) ? item.occurred_on : mailDate) : mailDate,
      p_due_on: item.kind === "factura" && isDate(item.due_on) ? item.due_on : null,
      p_reference: item.reference ? item.reference.slice(0, 60) : null,
      p_subject: String(payload.subject ?? "").slice(0, 200),
    });
    if (error) return Response.json({ error: "No se pudo guardar" }, { status: 500 });
    if (data) created += 1;
  }

  // Un mail sin pagos ni facturas (publicidad, etc.) también queda marcado como visto en el script, no acá.
  return Response.json({ created });
}
