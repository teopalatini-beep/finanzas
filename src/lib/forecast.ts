// Pronóstico de fin de ciclo. Funciones puras, sin dependencias.
// Idea: con lo que ya gastaste día por día, se simulan los días que faltan muchas veces
// y se toma el promedio y un rango (percentiles 10 y 90). Es una estimación, no una promesa.

// Generador pseudoaleatorio con semilla: el mismo ciclo da siempre el mismo pronóstico,
// así el número no "parpadea" cada vez que abrís la pantalla.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

export type Range = { low: number; mid: number; high: number };

// free: lo que te queda libre hoy. daily: gasto de cada día transcurrido (con los días sin gasto en 0).
// remainingDays: días que faltan hasta el cobro.
export function forecastRange(free: number, daily: number[], remainingDays: number, seed: number, runs = 2000): Range {
  if (remainingDays <= 0 || daily.length === 0) return { low: free, mid: free, high: free };

  const rand = mulberry32(seed);
  const totals: number[] = [];
  for (let i = 0; i < runs; i++) {
    let sum = 0;
    for (let d = 0; d < remainingDays; d++) sum += daily[Math.floor(rand() * daily.length)];
    totals.push(sum);
  }
  totals.sort((a, b) => a - b);
  const mean = totals.reduce((s, v) => s + v, 0) / totals.length;

  // Más gasto = menos plata: el extremo bajo usa el percentil 90 del gasto.
  return { low: free - quantile(totals, 0.9), mid: free - mean, high: free - quantile(totals, 0.1) };
}

export const averageOf = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
