"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CURRENCY } from "@/lib/currency";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";

export type DailyPoint = { period: string; revenue: number; orderCount: number };

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(value);
}

export function DailyOrdersHistory({ points, loading }: { points: DailyPoint[]; loading: boolean }) {
  const gradientId = useId();
  const today = points[points.length - 1]?.revenue ?? 0;
  const yesterday = points[points.length - 2]?.revenue ?? 0;
  const pct = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : today > 0 ? 100 : 0;
  const positive = pct >= 0;
  const data = points.map((p) => ({ ...p, label: new Date(p.period).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) }));

  return (
    <div className="p-5">
      <p className="text-[14.5px] font-semibold text-ink">Daily orders history</p>
      {loading ? (
        <p className="mt-1 text-[13px] text-ink-muted">Loading…</p>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-ink-secondary">
            Today&apos;s revenue: <span className="font-semibold text-ink">{money(today)}</span>
          </p>
          <p className={`mt-0.5 flex items-center gap-1 text-[12.5px] font-medium ${positive ? "text-positive-tint-ink" : "text-danger-tint-ink"}`}>
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(pct)}% {positive ? "more" : "less"} than yesterday
          </p>
        </>
      )}

      <div className="mt-3 h-36 w-full">
        {!loading && data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
              <Tooltip
                cursor={{ stroke: "var(--color-border-strong)", strokeDasharray: "3 3" }}
                content={<ChartTooltip rows={(d) => [{ label: "Orders", value: String(d.orderCount) }, { label: "Revenue", value: money(d.revenue) }]} />}
              />
              <Area
                type="monotone"
                dataKey="orderCount"
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                activeDot={{ r: 4, fill: "var(--color-accent)", stroke: "var(--color-surface)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}
