import type { Point } from "@/lib/savings";

// Línea de tu ahorro proyectado vs. lo que ponés de tu bolsillo. La diferencia es el rendimiento.
export function ProjectionChart({ points, start }: { points: Point[]; start: number }) {
  const W = 320;
  const H = 140;
  const pad = 6;
  const last = points[points.length - 1];
  const max = Math.max(1, last.total, start + last.deposited) * 1.05;
  const x = (m: number) => pad + (m / Math.max(1, last.month)) * (W - pad * 2);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);

  const total = points.map((p) => `${x(p.month).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  const own = points.map((p) => `${x(p.month).toFixed(1)},${y(start + p.deposited).toFixed(1)}`).join(" ");
  const area = `${x(0)},${H - pad} ${total} ${x(last.month)},${H - pad}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Ahorro proyectado: de ${Math.round(points[0].total)} a ${Math.round(last.total)} dólares en ${last.month} meses`}
    >
      <polygon points={area} fill="var(--ok)" opacity="0.14" />
      <polyline points={own} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 3" />
      <polyline points={total} fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(last.month)} cy={y(last.total)} r="3.5" fill="var(--ok)" />
    </svg>
  );
}
