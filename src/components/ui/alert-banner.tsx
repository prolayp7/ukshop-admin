import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Tone = "warning" | "danger";

const toneStyles: Record<
  Tone,
  { wrap: string; icon: string; button: string }
> = {
  warning: {
    wrap: "bg-accent-tint border-accent-tint-border",
    icon: "text-accent-strong",
    button: "bg-ink text-white hover:bg-ink/90",
  },
  danger: {
    wrap: "bg-danger-tint border-danger-tint-border",
    icon: "text-danger",
    button: "bg-danger text-white hover:bg-danger/90",
  },
};

export function AlertBanner({
  tone,
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  const s = toneStyles[tone];
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border px-4 py-3.5 sm:flex-row sm:items-center", s.wrap)}>
      <div className="flex flex-1 items-start gap-3">
        <Icon className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", s.icon)} strokeWidth={2.25} />
        <p className="text-[13.5px] leading-5 text-ink">
          <span className="font-semibold">{title}</span>{" "}
          <span className="text-ink-secondary">{description}</span>
        </p>
      </div>
      <Link
        href={actionHref}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md px-3.5 py-2 text-[13px] font-semibold transition-colors sm:ml-3",
          s.button
        )}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
