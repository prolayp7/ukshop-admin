"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/cn";
import { CURRENCY } from "@/lib/currency";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";

export type SalesPoint = { period: string; revenue: number; orderCount: number };
export const CHART_RANGES = ["7 d", "30 d", "90 d", "12 mo"] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(value);
}
function compactMoney(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY, notation: "compact", maximumFractionDigits: 1 }).format(value);
}
function periodLabel(period: string, range: ChartRange) {
  const date = new Date(period);
  if (range === "12 mo") return date.toLocaleDateString("en-GB", { month: "short" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function OrdersChart({ range, onRangeChange, points, loading }: { range: ChartRange; onRangeChange: (range: ChartRange) => void; points: SalesPoint[]; loading: boolean }) {
  const data = points.map((p) => ({ ...p, label: periodLabel(p.period, range) }));

  return (
    <div>
      <div className="mb-5 flex items-center gap-1 rounded-lg bg-canvas p-1">
        {CHART_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRangeChange(r)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors sm:flex-none",
              range === r ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-[13px] text-ink-muted">Loading…</div>
      ) : data.length ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }} tickFormatter={compactMoney} />
              <Tooltip
                cursor={{ fill: "var(--color-neutral-tint)", opacity: 0.6 }}
                content={<ChartTooltip rows={(d) => [{ label: "Revenue", value: money(d.revenue) }, { label: "Orders", value: String(d.orderCount) }]} />}
              />
              <Bar dataKey="revenue" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-56 items-center justify-center text-[13px] text-ink-muted">No paid orders in this range.</div>
      )}
    </div>
  );
}
