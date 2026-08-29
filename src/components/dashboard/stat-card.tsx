import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  context,
  contextTone = "neutral",
  emphasis = false,
}: {
  label: string;
  value: string;
  context: string;
  contextTone?: "positive" | "danger" | "neutral";
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-card",
        emphasis
          ? "border-ink bg-ink text-white"
          : "border-border bg-surface text-ink"
      )}
    >
      <p className={cn("text-[12.5px] font-medium", emphasis ? "text-white/70" : "text-ink-muted")}>
        {label}
      </p>
      <p className="mt-1.5 text-[22px] font-semibold tracking-tight tabular-nums">{value}</p>
      <p
        className={cn(
          "mt-1 text-[12.5px]",
          emphasis
            ? "text-white/60"
            : contextTone === "positive"
              ? "text-positive-tint-ink"
              : contextTone === "danger"
                ? "text-danger-tint-ink"
                : "text-ink-muted"
        )}
      >
        {context}
      </p>
    </div>
  );
}
