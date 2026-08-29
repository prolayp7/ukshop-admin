import { Download, AlertTriangle, CreditCard } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card, CardHeader } from "@/components/ui/card";
import { OrdersChart } from "@/components/dashboard/orders-chart";
import { OperationalQueues } from "@/components/dashboard/operational-queues";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { SystemHealth } from "@/components/dashboard/system-health";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";

const today = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function DashboardPage() {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink sm:text-2xl">
            Store overview
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">
            {today} · signed in as Amara Khan, Store Manager
          </p>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-border bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-secondary shadow-card transition-colors hover:bg-canvas"
        >
          <Download className="h-[15px] w-[15px]" />
          Export
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <AlertBanner
          tone="warning"
          icon={AlertTriangle}
          title="14 products are below their reorder threshold."
          description="3 have been out of stock for over a week. Restock before the bank holiday rush."
          actionLabel="View stock"
          actionHref="/products"
        />
        <AlertBanner
          tone="danger"
          icon={CreditCard}
          title="5 orders have a failed payment."
          description="£342 is outstanding across these orders — the oldest failed 4 days ago."
          actionLabel="Review payments"
          actionHref="/orders"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Orders · 30 d" value="1'284" context="+11% vs previous 30 d" contextTone="positive" emphasis />
        <StatCard label="Customers" value="6'930" context="+214 this month" contextTone="positive" />
        <StatCard label="Products" value="2'146" context="1'978 active · 14 low stock" />
        <StatCard label="Active promotions" value="18" context="4 expiring in 7 days" />
        <StatCard label="Revenue · 30 d" value="£214'760" context="+6.2% month on month" contextTone="positive" />
        <StatCard label="Completed · 30 d" value="1'109" context="42 cancelled" />
        <StatCard label="Order success" value="96%" context="orders shipped without issue" contextTone="positive" />
        <StatCard label="Avg. dispatch time" value="1.2 d" context="across all warehouses" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader title="Orders over time" />
            <div className="p-5">
              <OrdersChart />
            </div>
          </Card>

          <Card>
            <CardHeader
            title="Recent activity"
            action={
              <span className="text-[13px] font-medium text-ink-faint" title="Full audit log ships with Settings">
                Audit log
              </span>
            }
          />
            <ActivityFeed />
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Operational queues" />
            <OperationalQueues />
          </Card>

          <Card>
            <CardHeader title="System health" />
            <SystemHealth />
          </Card>

          <Card>
            <CardHeader title="Orders by category" />
            <CategoryBreakdown />
          </Card>
        </div>
      </div>
    </div>
  );
}
