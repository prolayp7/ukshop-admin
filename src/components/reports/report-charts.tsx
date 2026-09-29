"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, LabelList, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CURRENCY } from "@/lib/currency";

const money = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(value);
const compactMoney = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY, notation: "compact", maximumFractionDigits: 1 }).format(value);
const tick = { fill: "var(--color-ink-muted)", fontSize: 11 };
const truncate = (text: string, max = 22) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const tooltipProps = {
  cursor: { fill: "var(--color-neutral-tint)", opacity: 0.6 },
  contentStyle: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 14px rgb(20 27 34 / 0.12)" },
  labelStyle: { color: "var(--color-ink)", fontWeight: 600 },
  itemStyle: { color: "var(--color-ink-secondary)" },
} as const;

const PALETTE = ["var(--color-accent)", "var(--color-ink)", "var(--color-positive)", "var(--color-highlight)", "var(--color-ink-secondary)", "var(--color-danger)", "var(--color-accent-tint-border)", "var(--color-border-strong)"];
const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "var(--color-positive)", PAID: "var(--color-positive)", SHIPPED: "var(--color-ink)", PACKED: "var(--color-ink-secondary)",
  PROCESSING: "var(--color-accent)", PENDING: "var(--color-highlight)", AWAITING_PAYMENT: "var(--color-highlight)",
  CANCELLED: "var(--color-danger)", FAILED: "var(--color-danger)", REFUNDED: "var(--color-border-strong)", PARTIALLY_REFUNDED: "var(--color-accent-tint-border)",
};

const box = (height: number) => ({ height, width: "100%" });

export function SalesChart({ points, groupBy }: { points: { period: string; revenue: number; orderCount: number }[]; groupBy: "day" | "week" | "month" }) {
  const data = points.map((p) => ({ ...p, label: new Date(p.period).toLocaleDateString("en-GB", groupBy === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" }) }));
  return (
    <div style={box(288)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} minTickGap={18} />
          <YAxis yAxisId="rev" tickLine={false} axisLine={false} width={54} tick={tick} tickFormatter={compactMoney} />
          <YAxis yAxisId="ord" orientation="right" tickLine={false} axisLine={false} width={30} tick={tick} allowDecimals={false} />
          <Tooltip {...tooltipProps} formatter={(value, name) => (name === "Net revenue" ? money(Number(value)) : value)} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--color-ink-secondary)" }} />
          <Bar yAxisId="rev" dataKey="revenue" name="Net revenue" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={30} />
          <Line yAxisId="ord" dataKey="orderCount" name="Orders" type="monotone" stroke="var(--color-ink)" strokeWidth={2} dot={{ r: 2.5, fill: "var(--color-ink)" }} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export type BarRow = { name: string; value: number; secondary?: number };

export function HBarChart({ rows, format, color = "var(--color-accent)", unitLabel, secondaryLabel, labelWidth = 140 }: { rows: BarRow[]; format: (value: number) => string; color?: string; unitLabel?: string; secondaryLabel?: string; labelWidth?: number }) {
  return (
    <div style={box(Math.max(120, rows.length * (secondaryLabel ? 46 : 34) + 16 + (secondaryLabel ? 24 : 0)))}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={labelWidth} tickLine={false} axisLine={false} tick={{ ...tick, fill: "var(--color-ink-secondary)" }} tickFormatter={(v: string) => truncate(v, Math.round(labelWidth / 6.4))} />
          <Tooltip {...tooltipProps} formatter={(value, name) => [format(Number(value)), String(name)]} />
          {secondaryLabel ? <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--color-ink-secondary)" }} /> : null}
          <Bar dataKey="value" name={unitLabel ?? "Value"} fill={color} radius={[0, 4, 4, 0]} barSize={secondaryLabel ? 12 : 16} minPointSize={secondaryLabel ? 2 : 0}>
            <LabelList dataKey="value" position="right" formatter={(v) => format(Number(v))} style={{ fill: "var(--color-ink-secondary)", fontSize: 11, fontWeight: 600 }} />
          </Bar>
          {secondaryLabel ? <Bar dataKey="secondary" name={secondaryLabel} fill="var(--color-border-strong)" radius={[0, 4, 4, 0]} barSize={12} /> : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBarChart({ rows, aName, bName, format }: { rows: { name: string; a: number; b: number }[]; aName: string; bName: string; format: (value: number) => string }) {
  return (
    <div style={box(260)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 4" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={tick} tickFormatter={(v: string) => truncate(v, 12)} />
          <YAxis tickLine={false} axisLine={false} width={54} tick={tick} tickFormatter={compactMoney} />
          <Tooltip {...tooltipProps} formatter={(value) => format(Number(value))} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--color-ink-secondary)" }} />
          <Bar dataKey="a" name={aName} fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="b" name={bName} fill="var(--color-ink)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, colorByName = false, centerLabel }: { data: { name: string; value: number }[]; colorByName?: boolean; centerLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const hovered = active === null ? null : data[active];
  const colorOf = (name: string, index: number) => (colorByName ? STATUS_COLORS[name] : undefined) ?? PALETTE[index % PALETTE.length];
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative shrink-0" style={{ height: 180, width: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={2} stroke="var(--color-surface)" strokeWidth={2} onMouseEnter={(_, index) => setActive(index)} onMouseLeave={() => setActive(null)}>
              {data.map((d, i) => <Cell key={d.name} fill={colorOf(d.name, i)} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-ink">{(hovered ? hovered.value : total).toLocaleString("en-GB")}</span>
          <span className="max-w-[88px] truncate text-[10.5px] uppercase tracking-[0.06em] text-ink-muted">{hovered ? hovered.name.replace(/_/g, " ") : centerLabel}</span>
          {hovered ? <span className="text-[11px] font-semibold text-ink-secondary">{total ? Math.round((hovered.value / total) * 100) : 0}%</span> : null}
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-ink-secondary"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(d.name, i) }} /><span className="truncate">{d.name.replace(/_/g, " ")}</span></span>
            <span className="font-semibold tabular-nums text-ink">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
