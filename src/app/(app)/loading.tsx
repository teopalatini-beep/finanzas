// Esqueleto que se ve mientras carga cada pantalla (por ejemplo, al leer datos de la base).
export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse motion-reduce:animate-none" role="status" aria-label="Cargando">
      <div className="h-4 w-52 rounded bg-border" />
      <div className="h-12 w-64 rounded bg-border" />
      <div className="h-28 rounded-2xl bg-border/60" />
      <div className="h-24 rounded-2xl bg-border/60" />
      <div className="h-24 rounded-2xl bg-border/60" />
    </div>
  );
}
