"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, AlertTriangle, CreditCard, Truck, Star, Undo2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card, CardHeader } from "@/components/ui/card";
import { OrdersChart, type ChartRange, type SalesPoint } from "@/components/dashboard/orders-chart";
import { OperationalQueues, type Queue } from "@/components/dashboard/operational-queues";
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/activity-feed";
import { CategoryBreakdown, type CategoryCount } from "@/components/dashboard/category-breakdown";
import { TopProducts, type TopProduct } from "@/components/dashboard/top-products";
import { DailyOrdersHistory, type DailyPoint } from "@/components/dashboard/daily-orders-history";
import { useCurrentAdmin } from "@/components/shell/sidebar";
import { collectionFromApi } from "@/lib/api-response";
import { CURRENCY } from "@/lib/currency";

const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(value);
}
function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
function rangeParams(range: ChartRange): { dateFrom: string; dateTo: string; groupBy: "day" | "week" | "month" } {
  const to = new Date();
  const from = new Date(to);
  if (range === "7 d") from.setDate(from.getDate() - 7);
  else if (range === "30 d") from.setDate(from.getDate() - 30);
  else if (range === "90 d") from.setDate(from.getDate() - 90);
  else from.setMonth(from.getMonth() - 12);
  const groupBy = range === "7 d" || range === "30 d" ? "day" : range === "90 d" ? "week" : "month";
  return { dateFrom: `${isoDate(from)}T00:00:00.000Z`, dateTo: `${isoDate(to)}T23:59:59.999Z`, groupBy };
}
async function total(url: string): Promise<number> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return 0;
  const payload = await response.json().catch(() => ({}));
  return payload.meta?.total ?? 0;
}
function timeAgo(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function personName(user: { firstName?: string; lastName?: string } | null | undefined, fallback: string) {
  if (!user) return fallback;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || fallback;
}

type OrdersSummary = { totalOrders: number; awaitingPayment: number; failedPayments: number; revenue: number; averageOrderValue: number; processing: number; shipped: number; delivered: number; cancelled: number; failed: number; returnsCount: number };
type CustomersSummary = { totalCustomers: number; activeCustomers: number; customersWithOrders: number; registeredLast30Days: number; averageOrdersPerCustomer: number };
type OrderRow = { id: number; orderNumber: string; email: string; status: string; total: number | string; placedAt: string; user: { firstName: string; lastName: string } | null };
type ReviewRow = { id: number; rating: number; reviewerName: string | null; user: { firstName: string; lastName: string } | null; product: { title: string } | null; createdAt: string };
type CategoryRow = { title: string; parentId: number | null; _count: { products: number } };
type InventoryRow = { id: number; stockQty: number };
type ProductReportRow = { productId: number; title: string; unitsSold: number; revenue: number };
type CouponRow = { status: string; startsAt: string | null; endsAt: string | null };

export function DashboardOverview() {
  const adminUser = useCurrentAdmin();

  const [loading, setLoading] = useState(true);
  const [ordersSummary, setOrdersSummary] = useState<OrdersSummary | null>(null);
  const [customersSummary, setCustomersSummary] = useState<CustomersSummary | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [productTotals, setProductTotals] = useState({ total: 0, active: 0 });
  const [activePromotions, setActivePromotions] = useState({ active: 0, total: 0 });
  const [queues, setQueues] = useState<Queue[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailyHistory, setDailyHistory] = useState<DailyPoint[]>([]);

  const [range, setRange] = useState<ChartRange>("30 d");
  const [chartLoading, setChartLoading] = useState(true);
  const [chartPoints, setChartPoints] = useState<SalesPoint[]>([]);

  const loadCore = useCallback(async () => {
    setLoading(true);
    try {
      const dailyFrom = new Date();
      dailyFrom.setDate(dailyFrom.getDate() - 13);
      const dailyRange = { dateFrom: `${isoDate(dailyFrom)}T00:00:00.000Z`, dateTo: `${isoDate(new Date())}T23:59:59.999Z` };
      const [
        summaryRes, customersRes, inventoryRes, categoriesRes, productsTotalRes, productsActiveRes, couponsRes,
        ordersRes, reviewsRes,
        pendingReviews, returnsRequested, processing, packed, productReportRes, dailyHistoryRes,
      ] = await Promise.all([
        fetch("/api/orders/summary", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/customers/summary", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/reports/inventory", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/catalog/categories?page=1&perPage=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/products?perPage=1", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/products?status=ACTIVE&perPage=1", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/discounts/codes?page=1&perPage=100", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/orders?perPage=4", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/reviews?perPage=4", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        total("/api/reviews?status=PENDING&perPage=1"),
        total("/api/payments/returns?status=REQUESTED&perPage=1"),
        total("/api/orders?status=PROCESSING&perPage=1"),
        total("/api/orders?status=PACKED&perPage=1"),
        fetch("/api/reports/products?sort=best", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch(`/api/reports/sales?dateFrom=${dailyRange.dateFrom}&dateTo=${dailyRange.dateTo}&groupBy=day`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      ]);

      const summaryData = summaryRes?.data ?? summaryRes;
      const summary: OrdersSummary | null = summaryData?.totalOrders !== undefined ? summaryData : null;
      setOrdersSummary(summary);
      const customersData = customersRes?.data ?? customersRes;
      const custSummary: CustomersSummary | null = customersData?.totalCustomers !== undefined ? customersData : null;
      setCustomersSummary(custSummary);

      const inventory: InventoryRow[] = Array.isArray(inventoryRes) ? inventoryRes : (inventoryRes.data ?? []);
      setLowStockCount(inventory.length);

      const categoryItems = collectionFromApi<CategoryRow>(categoriesRes);
      setCategories(
        categoryItems
          .filter((c) => c.parentId == null)
          .map((c) => ({ label: c.title, count: c._count?.products ?? 0 }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      );

      setProductTotals({ total: productsTotalRes.meta?.total ?? 0, active: productsActiveRes.meta?.total ?? 0 });

      // ponytail: counts the first 100 codes only (API max page size); add a status filter to the codes endpoint if a store outgrows that.
      const coupons = collectionFromApi<CouponRow>(couponsRes);
      const now = Date.now();
      const activeCoupons = coupons.filter((c) => c.status === "ACTIVE" && (!c.startsAt || new Date(c.startsAt).getTime() <= now) && (!c.endsAt || new Date(c.endsAt).getTime() >= now));
      setActivePromotions({ active: activeCoupons.length, total: coupons.length });

      const awaitingDispatch = processing + packed;
      setQueues([
        { icon: AlertTriangle, title: "Low stock alerts", detail: "at or below reorder threshold", count: inventory.length, href: "/products", urgent: true },
        { icon: Truck, title: "Awaiting dispatch", detail: "confirmed, not yet shipped", count: awaitingDispatch, href: "/orders" },
        { icon: CreditCard, title: "Failed payments", detail: "need retry or manual capture", count: summary?.failedPayments ?? 0, href: "/orders?paymentStatus=FAILED", urgent: true },
        { icon: Star, title: "Reviews to moderate", detail: "awaiting approval", count: pendingReviews, href: "/reviews" },
        { icon: Undo2, title: "Returns to process", detail: "RMA requests opened", count: returnsRequested, href: "/payments/returns" },
      ]);

      const orders = collectionFromApi<OrderRow>(ordersRes);
      const reviews = collectionFromApi<ReviewRow>(reviewsRes);
      const items: ActivityItem[] = [
        ...orders.map((o) => ({ key: `order-${o.id}`, title: `Order ${o.orderNumber} placed`, actor: personName(o.user, o.email), detail: `${money(Number(o.total))} · ${o.status.replace(/_/g, " ").toLowerCase()}`, time: timeAgo(o.placedAt), sortAt: o.placedAt })),
        ...reviews.map((r) => ({ key: `review-${r.id}`, title: "Review submitted", actor: r.reviewerName || personName(r.user, "Guest"), detail: `${r.rating}★ on ${r.product?.title ?? "a product"}`, time: timeAgo(r.createdAt), sortAt: r.createdAt })),
      ]
        .sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
        .slice(0, 8);
      setActivity(items);

      const productRows: ProductReportRow[] = (productReportRes.data ?? productReportRes).rows ?? [];
      setTopProducts(productRows.filter((row) => row.unitsSold > 0).slice(0, 5));

      const dailyPoints: DailyPoint[] = (dailyHistoryRes.data ?? dailyHistoryRes).points ?? [];
      const byPeriod = new Map(dailyPoints.map((p) => [p.period, p]));
      const filled: DailyPoint[] = [];
      for (let i = 0; i < 14; i++) {
        const day = new Date(dailyFrom);
        day.setDate(day.getDate() + i);
        const key = isoDate(day);
        filled.push(byPeriod.get(key) ?? { period: key, revenue: 0, orderCount: 0 });
      }
      setDailyHistory(filled);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChart = useCallback(async (chartRange: ChartRange) => {
    setChartLoading(true);
    try {
      const { dateFrom, dateTo, groupBy } = rangeParams(chartRange);
      const response = await fetch(`/api/reports/sales?dateFrom=${dateFrom}&dateTo=${dateTo}&groupBy=${groupBy}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      setChartPoints((payload.data ?? payload).points ?? []);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadCore(), 0); return () => window.clearTimeout(timer); }, [loadCore]);
  useEffect(() => { const timer = window.setTimeout(() => void loadChart(range), 0); return () => window.clearTimeout(timer); }, [range, loadChart]);

  const successRate = ordersSummary && ordersSummary.totalOrders > 0
    ? Math.round(((ordersSummary.totalOrders - ordersSummary.cancelled - ordersSummary.failed) / ordersSummary.totalOrders) * 100)
    : null;

  function exportCsv() {
    const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows: unknown[][] = [
      ["Metric", "Value"],
      ["Orders", ordersSummary?.totalOrders ?? 0],
      ["Awaiting payment", ordersSummary?.awaitingPayment ?? 0],
      ["Failed payments", ordersSummary?.failedPayments ?? 0],
      ["Revenue", ordersSummary?.revenue ?? 0],
      ["Average order value", ordersSummary?.averageOrderValue ?? 0],
      ["Delivered", ordersSummary?.delivered ?? 0],
      ["Cancelled", ordersSummary?.cancelled ?? 0],
      ["Order success %", successRate ?? ""],
      ["Customers", customersSummary?.totalCustomers ?? 0],
      ["New customers (30 days)", customersSummary?.registeredLast30Days ?? 0],
      ["Products", productTotals.total],
      ["Active products", productTotals.active],
      ["Low stock variants", lowStockCount],
      ["Active promotions", activePromotions.active],
      [],
      ["Date", "Orders", "Revenue"],
      ...dailyHistory.map((point) => [point.period, point.orderCount, point.revenue]),
    ];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(quote).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ukshop-dashboard-${isoDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink sm:text-2xl">Store overview</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">
            {today} · signed in as {adminUser?.name ?? "…"}{adminUser ? `, ${adminUser.roleName}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-border bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-secondary shadow-card transition-colors hover:bg-canvas disabled:opacity-50"
        >
          <Download className="h-[15px] w-[15px]" />
          Export
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {!loading && lowStockCount > 0 ? (
          <AlertBanner
            tone="warning"
            icon={AlertTriangle}
            title={`${lowStockCount} variant${lowStockCount === 1 ? " is" : "s are"} at or below their reorder threshold.`}
            description="Restock soon to avoid stockouts."
            actionLabel="View stock"
            actionHref="/products"
          />
        ) : null}
        {!loading && ordersSummary && ordersSummary.failedPayments > 0 ? (
          <AlertBanner
            tone="danger"
            icon={CreditCard}
            title={`${ordersSummary.failedPayments} order${ordersSummary.failedPayments === 1 ? " has" : "s have"} a failed payment.`}
            description="Review these orders for retry or manual capture."
            actionLabel="Review payments"
            actionHref="/orders?paymentStatus=FAILED"
          />
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Orders" value={loading ? "…" : (ordersSummary?.totalOrders ?? 0).toLocaleString("en-GB")} context={loading ? "" : `${ordersSummary?.awaitingPayment ?? 0} awaiting payment`} emphasis />
        <StatCard label="Customers" value={loading ? "…" : (customersSummary?.totalCustomers ?? 0).toLocaleString("en-GB")} context={loading ? "" : `+${customersSummary?.registeredLast30Days ?? 0} in last 30 days`} contextTone="positive" />
        <StatCard label="Products" value={loading ? "…" : productTotals.total.toLocaleString("en-GB")} context={loading ? "" : `${productTotals.active} active · ${lowStockCount} low stock`} />
        <StatCard label="Active promotions" value={loading ? "…" : activePromotions.active.toLocaleString("en-GB")} context={loading ? "" : `${activePromotions.total} codes total`} />
        <StatCard label="Revenue" value={loading ? "…" : money(ordersSummary?.revenue ?? 0)} context={loading ? "" : `avg order ${money(ordersSummary?.averageOrderValue ?? 0)}`} contextTone="positive" />
        <StatCard label="Delivered" value={loading ? "…" : (ordersSummary?.delivered ?? 0).toLocaleString("en-GB")} context={loading ? "" : `${ordersSummary?.cancelled ?? 0} cancelled · ${ordersSummary?.failed ?? 0} failed`} />
        <StatCard label="Order success" value={loading ? "…" : successRate === null ? "—" : `${successRate}%`} context="excludes cancelled & failed" contextTone={successRate !== null && successRate >= 90 ? "positive" : "neutral"} />
        <StatCard label="Avg. order value" value={loading ? "…" : money(ordersSummary?.averageOrderValue ?? 0)} context="across all orders" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader title="Revenue over time" />
            <div className="p-5">
              <OrdersChart range={range} onRangeChange={setRange} points={chartPoints} loading={chartLoading} />
            </div>
          </Card>

          <Card>
            <DailyOrdersHistory points={dailyHistory} loading={loading} />
          </Card>

          <Card>
            <CardHeader title="Recent activity" />
            <ActivityFeed items={activity} loading={loading} />
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Operational queues" />
            <OperationalQueues queues={queues} loading={loading} />
          </Card>

          <Card>
            <CardHeader title="Top selling products" />
            <TopProducts products={topProducts} loading={loading} />
          </Card>

          <Card>
            <CardHeader title="Products by category" />
            <CategoryBreakdown categories={categories} loading={loading} />
          </Card>
        </div>
      </div>
    </div>
  );
}
