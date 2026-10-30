import { createClient } from "@supabase/supabase-js";

// Lo llama el cron de Vercel (vercel.json) para que Supabase no pause el proyecto por inactividad.
// Hace una consulta mínima; con RLS no devuelve datos, solo cuenta como actividad.
export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.from("settings").select("user_id", { head: true, count: "exact" });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
