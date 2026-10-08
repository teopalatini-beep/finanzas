export function ComingSoon({ title, idea }: { title: string; idea: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="rounded-2xl border border-dashed border-border p-4">
        <p className="text-sm font-medium">Próximamente</p>
        <p className="mt-1 text-sm text-muted">{idea}</p>
        <p className="mt-3 text-sm text-muted">Lo definimos juntos antes de construirlo.</p>
      </div>
    </div>
  );
}
