import { cn } from "@/lib/cn";

export type StatusTone = "positive" | "danger" | "accent" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  positive: "bg-positive-tint text-positive-tint-ink ring-positive-tint-border",
  danger: "bg-danger-tint text-danger-tint-ink ring-danger-tint-border",
  accent: "bg-accent-tint text-accent-tint-ink ring-accent-tint-border",
  neutral: "bg-neutral-tint text-neutral-tint-ink ring-border",
};

export function StatusPill({ tone, children }: { tone: StatusTone; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium leading-5 ring-1 ring-inset",
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}
