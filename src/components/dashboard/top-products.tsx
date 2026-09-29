import Link from "next/link";
import { CURRENCY } from "@/lib/currency";

export type TopProduct = { productId: number; title: string; unitsSold: number; revenue: number };

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(value);
}

export function TopProducts({ products, loading }: { products: TopProduct[]; loading: boolean }) {
  if (loading) return <p className="p-5 text-[13px] text-ink-muted">Loading…</p>;
  if (!products.length) return <p className="p-5 text-[13px] text-ink-muted">No sales yet.</p>;
  const max = Math.max(1, ...products.map((p) => p.revenue));
  return (
    <div className="p-5">
      <ul className="space-y-3.5">
        {products.map((p, index) => (
          <li key={p.productId}>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 flex-1 truncate font-medium text-ink">
                <span className="mr-1.5 text-ink-faint">{index + 1}.</span>
                {p.title}
              </span>
              <span className="shrink-0 tabular-nums text-ink-muted">{money(p.revenue)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-tint">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (p.revenue / max) * 100)}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">{p.unitsSold} units sold</p>
          </li>
        ))}
      </ul>
      <Link
        href="/reports"
        className="mt-4 flex w-full items-center justify-center rounded-md border border-border py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-canvas"
      >
        View full sales report
      </Link>
    </div>
  );
}
