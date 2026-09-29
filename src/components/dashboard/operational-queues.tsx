import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Queue = {
  icon: LucideIcon;
  title: string;
  detail: string;
  count: number;
  href: string;
  urgent?: boolean;
};

export function OperationalQueues({ queues, loading }: { queues: Queue[]; loading: boolean }) {
  if (loading) return <p className="p-5 text-[13px] text-ink-muted">Loading…</p>;
  return (
    <ul className="divide-y divide-border">
      {queues.map((q) => (
        <li key={q.title}>
          <Link
            href={q.href}
            className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-canvas"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-tint text-ink-secondary">
              <q.icon className="h-[17px] w-[17px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-ink">{q.title}</span>
              <span className="block truncate text-[12.5px] text-ink-muted">{q.detail}</span>
            </span>
            <span
              className={
                "min-w-[26px] rounded-full px-2 py-0.5 text-center text-[12px] font-semibold " +
                (q.urgent && q.count > 0 ? "bg-danger-tint text-danger-tint-ink" : "bg-accent-tint text-accent-tint-ink")
              }
            >
              {q.count}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
