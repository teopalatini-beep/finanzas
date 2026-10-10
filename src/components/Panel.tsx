import { ChevronDown } from "lucide-react";

// Sección plegable: para que las pantallas largas no abrumen.
export function Panel({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-border bg-surface">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span>
          <span className="block font-medium">{title}</span>
          {hint && <span className="block text-sm text-muted">{hint}</span>}
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
