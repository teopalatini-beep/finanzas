import { formatARS, statusFor } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

type Props = { name: string; emoji: string; budget: number; spent: number };

const barColor = { ok: "bg-ok", warn: "bg-warn", over: "bg-over" } as const;

export function EnvelopeCard({ name, emoji, budget, spent }: Props) {
  const status = statusFor(spent, budget);
  const left = budget - spent;
  const pct = Math.min(100, budget === 0 ? 0 : (spent / budget) * 100);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          <span aria-hidden>{emoji}</span> {name}
        </span>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {left >= 0 ? formatARS(left) : `−${formatARS(-left)}`}
      </p>
      <p className="text-sm text-muted">
        {left >= 0 ? "te quedan" : "de más"} · de {formatARS(budget)} · {Math.round(pct)}% usado
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${name}: ${Math.round(pct)}% usado`}
      >
        <div className={`h-full rounded-full ${barColor[status]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
