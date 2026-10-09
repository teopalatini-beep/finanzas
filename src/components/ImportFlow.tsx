"use client";

import { useActionState, useState } from "react";
import { saveImport, parseStatement } from "@/app/(app)/gastos/importar/actions";
import { formatARS } from "@/lib/format";
import { longDate } from "@/lib/dates";
import type { ParseState, ReviewLine, SaveState, PlanOption } from "@/lib/import-types";

type Group = {
  envelope: string;
  emoji: string;
  categories: { id: string; name: string; description: string | null }[];
};
type Method = { id: string; name: string; type: string };

const field =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-ok";

export function ImportFlow({ groups, methods }: { groups: Group[]; methods: Method[] }) {
  const [state, action, pending] = useActionState<ParseState, FormData>(parseStatement, {
    status: "idle",
  });

  if (state.status === "ready") {
    return <Review key={state.fileHash} data={state} groups={groups} />;
  }

  // Las tarjetas primero: el caso más común es subir el resumen de la Visa.
  const ordered = [...methods].sort(
    (a, b) => Number(b.type === "tarjeta_credito") - Number(a.type === "tarjeta_credito"),
  );

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Resumen, fotos o capturas</span>
        <input
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          required
          className="mt-1 block w-full rounded-xl border border-border bg-surface p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ok file:px-3 file:py-2 file:font-medium file:text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Medio de pago</span>
        <select name="payment_method_id" required defaultValue={ordered[0]?.id} className={field}>
          {ordered.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <p className="text-sm text-muted">
        Podés subir un resumen en PDF, o varias fotos y capturas a la vez (tickets, transferencias). Los archivos se leen y se descartan: no se guardan, solo los datos que confirmes en el próximo paso.
      </p>

      {state.status === "error" && (
        <p role="alert" className="text-sm font-medium text-over">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-ok font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "Leyendo el resumen… puede tardar un minuto" : "Leer resumen"}
      </button>
    </form>
  );
}

function Review({
  data,
  groups,
}: {
  data: Extract<ParseState, { status: "ready" }>;
  groups: Group[];
}) {
  const [lines, setLines] = useState<ReviewLine[]>(data.lines);
  const [saveState, save, saving] = useActionState<SaveState, FormData>(saveImport, { error: null });

  const update = (key: string, patch: Partial<ReviewLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const included = lines.filter((l) => l.include);
  const missingCategory = included.some((l) => !l.category_id);
  const total = included.reduce((sum, l) => sum + l.amount, 0);

  const payload = JSON.stringify({
    fileName: data.fileName,
    fileHash: data.fileHash,
    paymentMethodId: data.paymentMethodId,
    closingDate: data.closingDate,
    lines: included.map((l) => ({
      date: l.date,
      description: l.description,
      amount: l.amount,
      category_id: l.category_id,
      installment_number: l.installment_number,
      installment_total: l.installment_total,
      plan_id: l.plan_id,
    })),
  });

  return (
    <form action={save} className="space-y-4">
      <p className="text-sm text-muted">
        Revisá cada línea antes de guardar. Destildá lo que no quieras cargar y corregí las categorías.
      </p>

      <ul className="space-y-3">
        {lines.map((l) => (
          <LineCard key={l.key} line={l} groups={groups} plans={data.plans} onChange={update} />
        ))}
      </ul>

      <div className="sticky bottom-4 rounded-2xl border border-border bg-surface p-4 shadow-lg">
        <p className="text-sm">
          <span className="font-semibold">{included.length}</span> gastos ·{" "}
          <span className="font-semibold tabular-nums">{formatARS(total)}</span>
        </p>
        {missingCategory && (
          <p className="mt-1 text-sm font-medium text-warn">Falta elegir categoría en algún gasto.</p>
        )}
        {saveState.error && (
          <p role="alert" className="mt-1 text-sm font-medium text-over">
            {saveState.error}
          </p>
        )}
        <input type="hidden" name="payload" value={payload} />
        <button
          type="submit"
          disabled={saving || included.length === 0 || missingCategory}
          className="mt-3 min-h-12 w-full rounded-xl bg-ok font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Confirmar y guardar"}
        </button>
      </div>
    </form>
  );
}

function LineCard({
  line,
  groups,
  plans,
  onChange,
}: {
  line: ReviewLine;
  groups: Group[];
  plans: PlanOption[];
  onChange: (key: string, patch: Partial<ReviewLine>) => void;
}) {
  const isUSD = line.currency === "USD";
  const candidatePlans = plans.filter((p) => p.installments_count === line.installment_total);

  return (
    <li
      className={`rounded-2xl border border-border bg-surface p-3 ${line.include ? "" : "opacity-60"}`}
    >
      <label className="flex min-h-11 items-start gap-3">
        <input
          type="checkbox"
          checked={line.include}
          disabled={isUSD}
          onChange={(e) => onChange(line.key, { include: e.target.checked })}
          className="mt-1 size-5 accent-[var(--ok)]"
          aria-label={`Cargar ${line.description}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{line.description}</span>
          <span className="block text-sm text-muted">
            {longDate(line.date)}
            {line.installment_number && ` · cuota ${line.installment_number}/${line.installment_total}`}
          </span>
        </span>
        <span className="font-semibold tabular-nums">
          {isUSD ? `US$ ${line.amount}` : formatARS(line.amount)}
        </span>
      </label>

      {isUSD && <p className="mt-1 text-sm text-warn">En dólares: por ahora la app solo maneja pesos.</p>}
      {line.kind === "pago_o_credito" && (
        <p className="mt-1 text-sm text-muted">Parece un pago o devolución, no un gasto.</p>
      )}
      {line.duplicate && (
        <p className="mt-1 text-sm text-warn">Posible duplicado: ya hay un gasto con esa fecha y monto.</p>
      )}

      {line.include && (
        <div className="mt-2 space-y-2">
          <select
            value={line.category_id ?? ""}
            onChange={(e) => onChange(line.key, { category_id: e.target.value || null })}
            aria-label="Categoría"
            className={field}
          >
            <option value="">Elegí una categoría</option>
            {groups.map((g) => (
              <optgroup key={g.envelope} label={`${g.emoji} ${g.envelope}`}>
                {g.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {line.category_id && (
            <p className="text-xs text-muted">
              {groups.flatMap((g) => g.categories).find((c) => c.id === line.category_id)?.description}
            </p>
          )}

          {line.installment_total && (
            <select
              value={line.plan_id ?? ""}
              onChange={(e) => onChange(line.key, { plan_id: e.target.value || null })}
              aria-label="Plan de cuotas"
              className={field}
            >
              <option value="">Plan de cuotas nuevo</option>
              {candidatePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  Vincular a: {p.description} ({formatARS(p.total_amount)})
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </li>
  );
}
