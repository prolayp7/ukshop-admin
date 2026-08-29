import Link from "next/link";
import { cn } from "@/lib/cn";

type Status = "ok" | "degraded";

const rows: { label: string; status: Status; detail: string }[] = [
  { label: "Storefront application", status: "ok", detail: "Operational" },
  { label: "Database", status: "ok", detail: "Operational" },
  { label: "Payment gateway", status: "degraded", detail: "Degraded — slow responses" },
  { label: "Email delivery", status: "ok", detail: "Operational" },
  { label: "Background jobs", status: "ok", detail: "6 of 6 running" },
  { label: "Last backup", status: "ok", detail: "26 Aug 2026, 02:00 · verified" },
];

export function SystemHealth() {
  return (
    <div className="p-5">
      <ul className="space-y-3.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 text-[13.5px]">
            <span className="text-ink-secondary">{r.label}</span>
            <span className="flex shrink-0 items-center gap-1.5 font-medium text-ink">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  r.status === "ok" ? "bg-positive" : "bg-accent"
                )}
              />
              {r.detail}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/settings"
        className="mt-4 flex w-full items-center justify-center rounded-md border border-border py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-canvas"
      >
        Automation monitor
      </Link>
    </div>
  );
}
