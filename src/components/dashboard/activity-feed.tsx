import { Cog } from "lucide-react";

const activity = [
  {
    title: "Stock adjusted",
    key: "product.rtx-4070-ti-super.stock",
    scope: "Inventory",
    actor: "Amara Khan",
    from: "18",
    to: "34",
    time: "09:41",
  },
  {
    title: "Order shipped",
    key: "order.UK-2026-04871.status",
    scope: "Orders",
    actor: "System",
    from: "Processing",
    to: "Shipped",
    time: "09:12",
  },
  {
    title: "Coupon activated",
    key: "promo.summer-pc-build.status",
    scope: "Promotions",
    actor: "Daniel Ortiz",
    from: "Draft",
    to: "Active",
    time: "08:47",
  },
  {
    title: "Review approved",
    key: "review.r-88213.status",
    scope: "Reviews",
    actor: "Priya Nair",
    from: "Pending",
    to: "Published",
    time: "08:22",
  },
  {
    title: "Refund issued",
    key: "order.UK-2026-04803.payment",
    scope: "Orders",
    actor: "Amara Khan",
    from: "Paid",
    to: "Refunded",
    time: "07:55",
  },
  {
    title: "Product published",
    key: "product.peerless-assassin-125.status",
    scope: "Catalog",
    actor: "Daniel Ortiz",
    from: "Draft",
    to: "Live",
    time: "16:48",
  },
  {
    title: "Customer suspended",
    key: "customer.c-40217.status",
    scope: "Customers",
    actor: "Amara Khan",
    from: "Active",
    to: "Suspended",
    time: "14:12",
  },
];

export function ActivityFeed() {
  return (
    <ul className="divide-y divide-border">
      {activity.map((a) => (
        <li key={a.key} className="flex items-start gap-3.5 px-5 py-3.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-[11px] font-semibold text-ink-secondary">
            {a.actor === "System" ? (
              <Cog className="h-[15px] w-[15px]" strokeWidth={2} />
            ) : (
              a.actor.split(" ").map((n) => n[0]).join("")
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-ink">{a.title}</p>
            <p className="mt-0.5 truncate font-mono text-[11.5px] text-ink-faint">
              {a.key} <span className="text-ink-faint/70">· {a.scope}</span>
            </p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              {a.actor} · {a.from} <span className="text-ink-faint">→</span>{" "}
              <span className="font-medium text-ink-secondary">{a.to}</span>
            </p>
          </div>
          <span className="shrink-0 pt-0.5 text-[12px] tabular-nums text-ink-faint">{a.time}</span>
        </li>
      ))}
    </ul>
  );
}
