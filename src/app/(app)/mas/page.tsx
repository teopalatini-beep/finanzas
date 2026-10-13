import { cookies } from "next/headers";
import { signOut } from "@/app/login/actions";
import { BudgetsForm } from "@/components/BudgetsForm";
import { IngestSetup } from "@/components/IngestSetup";
import { OpeningBalanceForm, SalaryForm } from "@/components/SalaryBalanceForms";
import { SettingsForm } from "@/components/SettingsForm";
import { ThemePicker } from "@/components/ThemePicker";
import { getCardSettings } from "@/lib/cashflow";
import { todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function MasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const card = await getCardSettings();
  const savedTheme = (await cookies()).get("theme")?.value;
  const theme = savedTheme === "dark" || savedTheme === "day" ? savedTheme : null;

  const [{ data: envelopes }, { data: settings }] = await Promise.all([
    supabase.from("envelopes").select("id, name, emoji, monthly_amount").eq("is_fixed", false).order("sort_order"),
    supabase.from("settings").select("budgets_from").maybeSingle(),
  ]);
  const { data: bal } = await supabase.from("settings").select("opening_balance, opening_balance_on").maybeSingle();
  const { data: floorRow } = await supabase.from("settings").select("balance_floor").maybeSingle();
  const { data: tokenRow } = await supabase.from("settings").select("ingest_token_hash").maybeSingle();
  const { data: visa } = await supabase.from("settings").select("visa_typical_min, visa_typical_max").maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Más</h1>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Apariencia</h2>
        <p className="mb-3 mt-1 text-sm text-muted">Elegí cómo querés ver la app.</p>
        <ThemePicker initial={theme} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Saldo de tu cuenta</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Poné lo que tenés hoy en el banco. Desde ahí la app va descontando cada gasto que cargues.
        </p>
        <OpeningBalanceForm
          balance={bal?.opening_balance != null ? Number(bal.opening_balance) : null}
          on={bal?.opening_balance_on ?? null}
          today={todayISO()}
        />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Cobré el sueldo</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Cargalo el día que cobrás. Arranca un ciclo nuevo hasta el próximo cobro y suma a tu saldo.
        </p>
        <SalaryForm today={todayISO()} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Topes y piso</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Poné cuánto es lo máximo que querés gastar por mes en cada sobre y desde qué fecha rigen. La app te avisa cuando te acercás. También podés fijar un piso: lo mínimo que querés tener en la cuenta.
        </p>
        <BudgetsForm
          envelopes={(envelopes ?? []).map((e) => ({
            id: e.id,
            name: e.name,
            emoji: e.emoji ?? "💰",
            amount: Number(e.monthly_amount),
          }))}
          budgetsFrom={settings?.budgets_from ?? null}
          floor={floorRow?.balance_floor != null ? Number(floorRow.balance_floor) : null}
        />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Ajustes</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Con el cierre y el vencimiento de la Visa, la app sabe en qué ciclo se paga cada gasto con tarjeta. El objetivo de ahorro se cambia en Metas.
        </p>
        <SettingsForm
          card={card}
          visaMin={visa?.visa_typical_min != null ? Number(visa.visa_typical_min) : null}
          visaMax={visa?.visa_typical_max != null ? Number(visa.visa_typical_max) : null}
        />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Conexión con tus mails</h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Un script en tu cuenta de Google manda a la app los mails de facturas y pagos. Acá creás la clave que usa.
        </p>
        <IngestSetup hasToken={Boolean(tokenRow?.ingest_token_hash)} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-medium">Tus datos</h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Descargá una copia cuando quieras. Conviene hacerlo antes de borrar o cambiar muchas cosas.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/exportar?formato=json"
            download
            className="flex min-h-11 items-center rounded-xl border border-border px-4 font-medium"
          >
            Copia completa (JSON)
          </a>
          <a
            href="/exportar?formato=csv"
            download
            className="flex min-h-11 items-center rounded-xl border border-border px-4 font-medium"
          >
            Gastos para Excel (CSV)
          </a>
        </div>
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
