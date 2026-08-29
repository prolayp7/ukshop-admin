import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface px-6 py-20 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-tint text-ink-secondary">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <h1 className="mt-4 text-[17px] font-semibold text-ink">{title}</h1>
      <p className="mt-1.5 max-w-sm text-[13.5px] text-ink-muted">{description}</p>
    </div>
  );
}
