type Row = { label: string; value: string };
type Datum = { label: string; revenue: number; orderCount: number };
type Injected = { active?: boolean; payload?: ReadonlyArray<{ payload?: Datum }> };

// Recharts clones this element and injects active/payload; styled with the admin theme tokens.
export function ChartTooltip({ active, payload, rows }: Injected & { rows: (datum: Datum) => Row[] }) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-panel">
      <p className="text-[11.5px] font-semibold text-ink">{datum.label}</p>
      <dl className="mt-1 space-y-0.5">
        {rows(datum).map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-[12px]">
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="font-semibold tabular-nums text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
