import { AlertTriangle, CircleAlert } from "lucide-react";
import type { Alert } from "@/lib/alerts";

const style = {
  warn: { Icon: AlertTriangle, cls: "text-warn-fg" },
  over: { Icon: CircleAlert, cls: "text-over-fg" },
} as const;

// Avisos: aparece solo cuando hay algo que mirar.
export function AlertsCard({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section aria-label="Avisos" className="space-y-2 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-muted">Avisos</h2>
      <ul className="divide-y divide-border">
        {alerts.map(({ id, level, title, detail }) => {
          const { Icon, cls } = style[level];
          return (
            <li key={id} className="flex items-start gap-3 py-2">
              <Icon size={18} className={`mt-0.5 shrink-0 ${cls}`} aria-hidden />
              <div className="text-sm">
                <p className={`font-medium ${cls}`}>{title}</p>
                <p className="text-muted">{detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
