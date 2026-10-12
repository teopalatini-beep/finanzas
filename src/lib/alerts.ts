import { WARN_FROM } from "@/lib/format";
import type { HoyData } from "@/lib/data";

export type Alert = { id: string; level: "warn" | "over"; title: string; detail: string };

// Avisos de Hoy: topes por sobre que se acercan o se pasan, y el piso de seguridad de tu cuenta.
export function buildAlerts(data: HoyData, fmt: (n: number) => string): Alert[] {
  const alerts: Alert[] = [];

  if (data.budgetsActive) {
    for (const e of data.envelopes) {
      if (e.budget <= 0) continue;
      const ratio = e.spent / e.budget;
      if (ratio > 1) {
        alerts.push({
          id: `env-${e.id}`,
          level: "over",
          title: `${e.emoji} ${e.name}: te pasaste del tope`,
          detail: `Gastaste ${fmt(e.spent)} de ${fmt(e.budget)} (${fmt(e.spent - e.budget)} de más).`,
        });
      } else if (ratio >= WARN_FROM) {
        alerts.push({
          id: `env-${e.id}`,
          level: "warn",
          title: `${e.emoji} ${e.name}: llevás el ${Math.round(ratio * 100)}% del tope`,
          detail: `Gastaste ${fmt(e.spent)} de ${fmt(e.budget)}: te quedan ${fmt(e.budget - e.spent)}.`,
        });
      }
    }
  }

  if (data.floor !== null && data.balance) {
    const balance = data.balance.balance;
    const f = data.forecast;
    if (balance < data.floor) {
      alerts.push({
        id: "floor",
        level: "over",
        title: "Estás por debajo de tu piso",
        detail: `Tenés ${fmt(balance)} y tu piso es ${fmt(data.floor)}.`,
      });
    } else if (f.status === "ok" && f.mid < data.floor) {
      alerts.push({
        id: "floor",
        level: "over",
        title: "A este ritmo bajarías de tu piso antes de cobrar",
        detail: `Terminarías el ciclo con ~${fmt(f.mid)} y tu piso es ${fmt(data.floor)}.`,
      });
    } else if (f.status === "ok" && f.low < data.floor) {
      alerts.push({
        id: "floor",
        level: "warn",
        title: "En el peor caso bajarías de tu piso",
        detail: `El rango llega a ${fmt(f.low)} y tu piso es ${fmt(data.floor)}.`,
      });
    }
  }

  // Lo más grave primero.
  return alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === "over" ? -1 : 1));
}
