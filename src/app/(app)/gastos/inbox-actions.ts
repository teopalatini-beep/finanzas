"use server";

import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// "No es mío" o "ya está cargado": lo saca de la bandeja sin crear ningún gasto.
export async function discardInboxItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!isUUID(id)) return;
  const supabase = await createClient();
  await supabase.from("inbox_items").update({ status: "descartado" }).eq("id", id).eq("status", "pendiente");
  revalidatePath("/", "layout");
}

export type TokenState = { error: string | null; token: string | null };

// Crea la clave que usa tu script de Google. Se muestra una sola vez: en la base queda solo su huella.
export async function generateIngestToken(): Promise<TokenState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Volvé a entrar.", token: null };

  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.from("settings").update({ ingest_token_hash: hash }).eq("user_id", user.id);
  if (error) return { error: `No se pudo crear la clave: ${error.message}`, token: null };

  revalidatePath("/mas");
  return { error: null, token };
}
