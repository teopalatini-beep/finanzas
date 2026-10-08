import { signOut } from "@/app/login/actions";
import { SettingsForm } from "@/components/SettingsForm";
import { getCardSettings } from "@/lib/cashflow";
import { createClient } from "@/lib/supabase/server";

export default async function MasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const card = await getCardSettings();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Más</h1>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Ajustes</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Con el cierre y el vencimiento de la Visa, la app sabe en qué ciclo se paga cada gasto con tarjeta. El objetivo de ahorro se cambia en Metas.
        </p>
        <SettingsForm card={card} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">Sesión iniciada como</p>
        <p className="font-medium">{user?.email}</p>
        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="min-h-11 rounded-xl border border-border px-4 font-medium"
          >
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  );
}
