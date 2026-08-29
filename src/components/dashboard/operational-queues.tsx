import Link from "next/link";
import { AlertTriangle, Truck, CreditCard, Star, Undo2, FileText, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Queue = {
  icon: LucideIcon;
  title: string;
  detail: string;
  count: number;
  href: string;
  urgent?: boolean;
};

const queues: Queue[] = [
  { icon: AlertTriangle, title: "Low stock alerts", detail: "below reorder threshold", count: 14, href: "/products", urgent: true },
  { icon: Truck, title: "Awaiting dispatch", detail: "confirmed, not yet shipped", count: 9, href: "/orders" },
  { icon: CreditCard, title: "Failed payments", detail: "£342 outstanding", count: 5, href: "/orders", urgent: true },
  { icon: Star, title: "Reviews to moderate", detail: "2 flagged as suspicious", count: 6, href: "/reviews" },
  { icon: Undo2, title: "Returns to process", detail: "RMA requests opened", count: 3, href: "/orders" },
  { icon: FileText, title: "Content in review", detail: "“Best budget GPUs, 2026”", count: 1, href: "/content" },
];

export function OperationalQueues() {
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
                (q.urgent ? "bg-danger-tint text-danger-tint-ink" : "bg-accent-tint text-accent-tint-ink")
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
