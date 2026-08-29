"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Point = { label: string; created: number; completed: number; cancelled: number };

const RANGES = ["30 d", "90 d", "12 mo"] as const;
type Range = (typeof RANGES)[number];

const DATA: Record<Range, Point[]> = {
  "30 d": [
    { label: "29 Jul", created: 58, completed: 41, cancelled: 5 },
    { label: "31 Jul", created: 72, completed: 55, cancelled: 8 },
    { label: "2 Aug", created: 64, completed: 52, cancelled: 4 },
    { label: "4 Aug", created: 81, completed: 63, cancelled: 9 },
    { label: "6 Aug", created: 47, completed: 39, cancelled: 3 },
    { label: "8 Aug", created: 69, completed: 58, cancelled: 6 },
    { label: "10 Aug", created: 88, completed: 66, cancelled: 11 },
    { label: "12 Aug", created: 76, completed: 61, cancelled: 7 },
    { label: "14 Aug", created: 54, completed: 44, cancelled: 5 },
    { label: "16 Aug", created: 63, completed: 50, cancelled: 6 },
    { label: "18 Aug", created: 71, completed: 57, cancelled: 8 },
    { label: "20 Aug", created: 49, completed: 40, cancelled: 4 },
  ],
  "90 d": [
    { label: "Jun W1", created: 320, completed: 270, cancelled: 28 },
    { label: "Jun W2", created: 355, completed: 298, cancelled: 31 },
    { label: "Jun W3", created: 298, completed: 250, cancelled: 24 },
    { label: "Jun W4", created: 372, completed: 310, cancelled: 35 },
    { label: "Jul W1", created: 340, completed: 288, cancelled: 27 },
    { label: "Jul W2", created: 401, completed: 336, cancelled: 40 },
    { label: "Jul W3", created: 388, completed: 322, cancelled: 33 },
    { label: "Jul W4", created: 415, completed: 349, cancelled: 38 },
    { label: "Aug W1", created: 362, completed: 305, cancelled: 29 },
    { label: "Aug W2", created: 429, completed: 361, cancelled: 41 },
    { label: "Aug W3", created: 395, completed: 330, cancelled: 34 },
    { label: "Aug W4", created: 348, completed: 291, cancelled: 26 },
  ],
  "12 mo": [
    { label: "Sep", created: 1180, completed: 990, cancelled: 96 },
    { label: "Oct", created: 1340, completed: 1120, cancelled: 108 },
    { label: "Nov", created: 1520, completed: 1280, cancelled: 121 },
    { label: "Dec", created: 2010, completed: 1690, cancelled: 165 },
    { label: "Jan", created: 1420, completed: 1190, cancelled: 112 },
    { label: "Feb", created: 1280, completed: 1080, cancelled: 98 },
    { label: "Mar", created: 1390, completed: 1160, cancelled: 104 },
    { label: "Apr", created: 1310, completed: 1100, cancelled: 99 },
    { label: "May", created: 1450, completed: 1220, cancelled: 113 },
    { label: "Jun", created: 1360, completed: 1140, cancelled: 106 },
    { label: "Jul", created: 1580, completed: 1330, cancelled: 128 },
    { label: "Aug", created: 1210, completed: 1010, cancelled: 92 },
  ],
};

export function OrdersChart() {
  const [range, setRange] = useState<Range>("30 d");
  const points = DATA[range];
  const max = Math.max(...points.map((p) => p.created));

  return (
    <div>
      <div className="mb-5 flex items-center gap-1 rounded-lg bg-canvas p-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors sm:flex-none",
              range === r
                ? "bg-surface text-ink shadow-card"
                : "text-ink-muted hover:text-ink"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <div
        className="grid h-48 items-end gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
      >
        {points.map((p) => (
          <div key={p.label} className="flex h-full items-end justify-center gap-[3px]">
            <div
              className="w-full max-w-[10px] rounded-t-[3px] bg-ink"
              style={{ height: `${(p.created / max) * 100}%` }}
              title={`Created ${p.created}`}
            />
            <div
              className="w-full max-w-[10px] rounded-t-[3px] bg-positive"
              style={{ height: `${(p.completed / max) * 100}%` }}
              title={`Completed ${p.completed}`}
            />
            <div
              className="w-full max-w-[10px] rounded-t-[3px] bg-danger"
              style={{ height: `${Math.max((p.cancelled / max) * 100, 3)}%` }}
              title={`Cancelled ${p.cancelled}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-faint">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-[12.5px] text-ink-secondary">
        <LegendDot color="bg-ink" label="Created" />
        <LegendDot color="bg-positive" label="Completed" />
        <LegendDot color="bg-danger" label="Cancelled" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}
