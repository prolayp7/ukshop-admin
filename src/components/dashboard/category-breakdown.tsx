const categories = [
  { label: "PC Components", count: 612 },
  { label: "Laptops", count: 487 },
  { label: "Peripherals", count: 398 },
  { label: "Computers", count: 274 },
  { label: "Networking", count: 156 },
  { label: "Accessories", count: 121 },
];

export function CategoryBreakdown() {
  const max = Math.max(...categories.map((c) => c.count));
  return (
    <div className="space-y-4 p-5">
      {categories.map((c) => (
        <div key={c.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
            <span className="font-medium text-ink">{c.label}</span>
            <span className="tabular-nums text-ink-muted">{c.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-tint">
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${(c.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
