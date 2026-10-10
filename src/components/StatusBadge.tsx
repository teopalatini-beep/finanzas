import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { STATUS_LABEL, type Status } from "@/lib/format";

const styles = {
  ok: { Icon: CheckCircle2, cls: "text-ok-fg" },
  warn: { Icon: AlertTriangle, cls: "text-warn-fg" },
  over: { Icon: CircleAlert, cls: "text-over-fg" },
} as const;

export function StatusBadge({ status }: { status: Status }) {
  const { Icon, cls } = styles[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cls}`}>
      <Icon size={14} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
