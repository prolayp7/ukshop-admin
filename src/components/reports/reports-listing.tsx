"use client";

import { CURRENCY } from "@/lib/currency";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, LoaderCircle, MapPin, Package, Tag, Ticket, Users } from "lucide-react";

type Tab = "sales" | "products" | "customers" | "inventory" | "orders" | "category-brand" | "coupons" | "geography";
type SalesPoint = { period: string; revenue: number; orderCount: number };
type ProductRow = { productId: number; title: string; unitsSold: number; revenue: number; stockQty: number };
type Spender = { user?: { id: number; email: string; firstName: string; lastName: string }; totalSpent: number; orderCount: number };
type InventoryRow = { id: number; title: string; stockQty: number; lowStockThreshold: number; product: { title: string } };
type OrdersBreakdown = { byStatus: Record<string, number>; byPaymentStatus: Record<string, number> };
type CategoryBrandRow = { revenue: number; unitsSold: number; title: string };
type CouponRow = { couponId: number; code: string; ordersCount: number; totalDiscount: number; revenue: number };
type GeographyRow = { postcodeArea: string; orderCount: number; revenue: number };

function money(value: number) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(value); }
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
const today = new Date();
const defaultFrom = isoDate(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()));
const defaultTo = isoDate(today);

export function ReportsListing() {
  const [tab, setTab] = useState<Tab>("sales");
  const [dateFrom, setDateFrom] = useState(defaultFrom), [dateTo, setDateTo] = useState(defaultTo), [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]), [productSort, setProductSort] = useState<"best" | "worst" | "stock">("best");
  const [customers, setCustomers] = useState<{ newCustomers: number; returningCustomers: number; topSpenders: Spender[] }>({ newCustomers: 0, returningCustomers: 0, topSpenders: [] });
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [orders, setOrders] = useState<OrdersBreakdown>({ byStatus: {}, byPaymentStatus: {} });
  const [categoryBrand, setCategoryBrand] = useState<{ byCategory: CategoryBrandRow[]; byBrand: CategoryBrandRow[] }>({ byCategory: [], byBrand: [] });
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [geography, setGeography] = useState<GeographyRow[]>([]);
  const [hover, setHover] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const range = new URLSearchParams({ dateFrom: `${dateFrom}T00:00:00.000Z`, dateTo: `${dateTo}T23:59:59.999Z` });
    try {
      const [salesRes, productsRes, customersRes, inventoryRes, ordersRes, cbRes, couponsRes, geoRes] = await Promise.all([
        fetch(`/api/reports/sales?${range}&groupBy=${groupBy}`, { cache: "no-store" }),
        fetch(`/api/reports/products?${range}&sort=${productSort}`, { cache: "no-store" }),
        fetch(`/api/reports/customers?${range}`, { cache: "no-store" }),
        fetch(`/api/reports/inventory`, { cache: "no-store" }),
        fetch(`/api/reports/orders?${range}`, { cache: "no-store" }),
        fetch(`/api/reports/category-brand-sales?${range}`, { cache: "no-store" }),
        fetch(`/api/reports/coupons?${range}`, { cache: "no-store" }),
        fetch(`/api/reports/geography?${range}`, { cache: "no-store" }),
      ]);
      const salesPayload = await salesRes.json(); if (!salesRes.ok) throw new Error(apiMessage(salesPayload, "Reports could not be loaded."));
      setSales(salesPayload.points ?? []);
      const productsPayload = await productsRes.json().catch(() => ({})); if (productsRes.ok) setProducts(productsPayload.rows ?? []);
      const customersPayload = await customersRes.json().catch(() => ({})); if (customersRes.ok) setCustomers({ newCustomers: customersPayload.newCustomers ?? 0, returningCustomers: customersPayload.returningCustomers ?? 0, topSpenders: customersPayload.topSpenders ?? [] });
      const inventoryPayload = await inventoryRes.json().catch(() => ([])); if (inventoryRes.ok) setInventory(Array.isArray(inventoryPayload) ? inventoryPayload : (inventoryPayload.data ?? []));
      const ordersPayload = await ordersRes.json().catch(() => ({})); if (ordersRes.ok) setOrders({ byStatus: ordersPayload.byStatus ?? {}, byPaymentStatus: ordersPayload.byPaymentStatus ?? {} });
      const cbPayload = await cbRes.json().catch(() => ({})); if (cbRes.ok) setCategoryBrand({ byCategory: cbPayload.byCategory ?? [], byBrand: cbPayload.byBrand ?? [] });
      const couponsPayload = await couponsRes.json().catch(() => ({})); if (couponsRes.ok) setCoupons(couponsPayload.rows ?? []);
      const geoPayload = await geoRes.json().catch(() => ({})); if (geoRes.ok) setGeography(geoPayload.rows ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Reports could not be loaded."); } finally { setLoading(false); }
  }, [dateFrom, dateTo, groupBy, productSort]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const totalRevenue = useMemo(() => sales.reduce((sum, point) => sum + point.revenue, 0), [sales]);
  const totalOrders = useMemo(() => sales.reduce((sum, point) => sum + point.orderCount, 0), [sales]);
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const maxRevenue = Math.max(1, ...sales.map((point) => point.revenue));

  return <div className="w-full"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Reports</h1><p className="mt-1 text-[13.5px] text-ink-muted">Sales, product, customer, inventory and order performance.</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-[11px] font-semibold text-ink-secondary">From<input type="date" value={dateFrom} max={dateTo} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary outline-none focus:border-accent-strong" /></label><label className="text-[11px] font-semibold text-ink-secondary">To<input type="date" value={dateTo} min={dateFrom} max={isoDate(today)} onChange={(event) => setDateTo(event.target.value)} className="mt-1 h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary outline-none focus:border-accent-strong" /></label><label className="text-[11px] font-semibold text-ink-secondary">Group by<select value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)} className="mt-1 h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary outline-none focus:border-accent-strong"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></label></div></div>
  {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border">{([{ id: "sales", label: "Sales" }, { id: "products", label: "Products" }, { id: "customers", label: "Customers" }, { id: "inventory", label: "Inventory" }, { id: "orders", label: "Orders" }, { id: "category-brand", label: "Category & brand" }, { id: "coupons", label: "Coupons" }, { id: "geography", label: "Geography" }] as const).map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`relative shrink-0 px-3 py-2.5 text-[13px] font-semibold ${tab === item.id ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:bg-ink" : "text-ink-muted hover:text-ink"}`}>{item.label}</button>)}</div>
  {loading ? <div className="flex min-h-40 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-ink-muted" /></div> : tab === "sales" ? <>
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Revenue" value={money(totalRevenue)} /><Metric label="Orders" value={totalOrders.toLocaleString("en-GB")} /><Metric label="Avg order value" value={money(avgOrderValue)} /></div>
    <section className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-card">
      {sales.length ? <div className="flex h-48 items-end gap-1">{sales.map((point, index) => <div key={point.period} className="group relative flex flex-1 flex-col items-center justify-end" onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover((current) => current === index ? null : current)}>{hover === index ? <div className="absolute -top-11 z-10 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10.5px] font-semibold text-white shadow-panel">{point.period}: {money(point.revenue)}</div> : null}<div className="w-full rounded-t bg-accent transition-colors group-hover:bg-accent-strong" style={{ height: `${Math.max(2, (point.revenue / maxRevenue) * 100)}%` }} /></div>)}</div> : <p className="py-10 text-center text-[13px] text-ink-muted">No sales in this range.</p>}
      {sales.length ? <div className="mt-2 flex justify-between text-[10.5px] text-ink-muted"><span>{sales[0]?.period}</span><span>{sales[sales.length - 1]?.period}</span></div> : null}
    </section>
  </> : tab === "products" ? <><div className="mt-4 flex justify-end"><select value={productSort} onChange={(event) => setProductSort(event.target.value as typeof productSort)} className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary outline-none focus:border-accent-strong"><option value="best">Best sellers</option><option value="worst">Worst sellers</option><option value="stock">Lowest stock</option></select></div>
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 text-right font-semibold">Units sold</th><th className="px-4 py-3 text-right font-semibold">Revenue</th><th className="px-4 py-3 text-right font-semibold">In stock</th></tr></thead><tbody className="divide-y divide-border">{products.slice(0, 25).map((row) => <tr key={row.productId} className="hover:bg-canvas"><td className="px-4 py-3 text-[13px] font-semibold text-ink">{row.title}</td><td className="px-4 py-3 text-right text-xs text-ink-secondary">{row.unitsSold}</td><td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(row.revenue)}</td><td className="px-4 py-3 text-right text-xs text-ink-secondary">{row.stockQty}</td></tr>)}{!products.length ? <tr><td colSpan={4} className="h-32 text-center text-[13px] text-ink-muted">No product data.</td></tr> : null}</tbody></table></div></section>
  </> : tab === "customers" ? <>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><Metric icon={Users} label="New customers" value={customers.newCustomers.toLocaleString("en-GB")} /><Metric icon={Users} label="Returning customers" value={customers.returningCustomers.toLocaleString("en-GB")} /></div>
    <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="border-b border-border p-4"><h2 className="text-[13.5px] font-semibold text-ink">Top spenders</h2></div><div className="divide-y divide-border">{customers.topSpenders.map((spender, index) => <div key={spender.user?.id ?? index} className="flex items-center justify-between p-3.5"><div><p className="text-[13px] font-semibold text-ink">{spender.user ? `${spender.user.firstName} ${spender.user.lastName}` : "Unknown customer"}</p><p className="mt-0.5 text-[10.5px] text-ink-muted">{spender.user?.email ?? "—"} · {spender.orderCount} orders</p></div><p className="text-[13px] font-semibold text-ink">{money(spender.totalSpent)}</p></div>)}{!customers.topSpenders.length ? <p className="p-8 text-center text-[13px] text-ink-muted">No customer spend in this range.</p> : null}</div></section>
  </> : tab === "inventory" ? <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="border-b border-border p-4"><h2 className="text-[13.5px] font-semibold text-ink">Low stock</h2><p className="mt-0.5 text-xs text-ink-muted">Variants at or below their low-stock threshold.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Variant</th><th className="px-4 py-3 text-right font-semibold">In stock</th><th className="px-4 py-3 text-right font-semibold">Threshold</th></tr></thead><tbody className="divide-y divide-border">{inventory.map((row) => <tr key={row.id} className="hover:bg-canvas"><td className="px-4 py-3 text-[13px] font-semibold text-ink">{row.product.title}</td><td className="px-4 py-3 text-xs text-ink-secondary">{row.title}</td><td className="px-4 py-3 text-right text-xs font-semibold text-danger-tint-ink">{row.stockQty}</td><td className="px-4 py-3 text-right text-xs text-ink-muted">{row.lowStockThreshold}</td></tr>)}{!inventory.length ? <tr><td colSpan={4} className="h-32 text-center text-[13px] text-ink-muted">Nothing is low on stock.</td></tr> : null}</tbody></table></div></section>
  : tab === "orders" ? <OrdersBreakdown byStatus={orders.byStatus} byPaymentStatus={orders.byPaymentStatus} />
  : tab === "category-brand" ? <div className="mt-4 grid gap-4 lg:grid-cols-2"><RankedList icon={Tag} title="By category" rows={categoryBrand.byCategory} /><RankedList icon={Package} title="By brand" rows={categoryBrand.byBrand} /></div>
  : tab === "coupons" ? <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Code</th><th className="px-4 py-3 text-right font-semibold">Orders</th><th className="px-4 py-3 text-right font-semibold">Discount given</th><th className="px-4 py-3 text-right font-semibold">Order revenue</th></tr></thead><tbody className="divide-y divide-border">{coupons.map((row) => <tr key={row.couponId} className="hover:bg-canvas"><td className="px-4 py-3 font-mono text-xs font-semibold text-ink"><Ticket className="mr-1.5 inline h-3.5 w-3.5 text-ink-muted" />{row.code}</td><td className="px-4 py-3 text-right text-xs text-ink-secondary">{row.ordersCount}</td><td className="px-4 py-3 text-right text-xs text-danger-tint-ink">-{money(row.totalDiscount)}</td><td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(row.revenue)}</td></tr>)}{!coupons.length ? <tr><td colSpan={4} className="h-32 text-center text-[13px] text-ink-muted">No coupon usage in this range.</td></tr> : null}</tbody></table></div></section>
  : <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Postcode area</th><th className="px-4 py-3 text-right font-semibold">Orders</th><th className="px-4 py-3 text-right font-semibold">Revenue</th></tr></thead><tbody className="divide-y divide-border">{geography.map((row) => <tr key={row.postcodeArea} className="hover:bg-canvas"><td className="px-4 py-3 text-[13px] font-semibold text-ink"><MapPin className="mr-1.5 inline h-3.5 w-3.5 text-ink-muted" />{row.postcodeArea}</td><td className="px-4 py-3 text-right text-xs text-ink-secondary">{row.orderCount}</td><td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(row.revenue)}</td></tr>)}{!geography.length ? <tr><td colSpan={3} className="h-32 text-center text-[13px] text-ink-muted">No orders in this range.</td></tr> : null}</tbody></table></div></section>}
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon?: typeof Users; label: string; value: string }) { return <div className="rounded-xl border border-border bg-surface p-4 shadow-card"><div className="flex items-center gap-3">{Icon ? <span className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><Icon className="h-4 w-4" /></span> : null}<div><p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</p><p className="mt-0.5 text-lg font-semibold text-ink">{value}</p></div></div></div>; }

function RankedList({ icon: Icon, title, rows }: { icon: typeof Tag; title: string; rows: CategoryBrandRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.revenue));
  return <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="flex items-center gap-2 border-b border-border p-4"><Icon className="h-4 w-4 text-ink-muted" /><h2 className="text-[13.5px] font-semibold text-ink">{title}</h2></div><div className="divide-y divide-border">{rows.slice(0, 10).map((row, index) => <div key={index} className="p-3.5"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-ink">{row.title}</span><span className="text-ink-secondary">{money(row.revenue)}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-tint"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (row.revenue / max) * 100)}%` }} /></div></div>)}{!rows.length ? <p className="p-6 text-center text-xs text-ink-muted">No data in this range.</p> : null}</div></section>;
}

function OrdersBreakdown({ byStatus, byPaymentStatus }: { byStatus: Record<string, number>; byPaymentStatus: Record<string, number> }) {
  return <div className="mt-4 grid gap-4 sm:grid-cols-2"><section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="border-b border-border p-4"><h2 className="text-[13.5px] font-semibold text-ink">Orders by status</h2></div><div className="divide-y divide-border">{Object.entries(byStatus).map(([status, count]) => <div key={status} className="flex items-center justify-between px-4 py-2.5 text-xs"><span className="text-ink-secondary">{status.replace(/_/g, " ")}</span><span className="font-semibold text-ink">{count}</span></div>)}{!Object.keys(byStatus).length ? <p className="p-6 text-center text-xs text-ink-muted">No orders in this range.</p> : null}</div></section>
  <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="border-b border-border p-4"><h2 className="text-[13.5px] font-semibold text-ink">Orders by payment status</h2></div><div className="divide-y divide-border">{Object.entries(byPaymentStatus).map(([status, count]) => <div key={status} className="flex items-center justify-between px-4 py-2.5 text-xs"><span className="text-ink-secondary">{status.replace(/_/g, " ")}</span><span className="font-semibold text-ink">{count}</span></div>)}{!Object.keys(byPaymentStatus).length ? <p className="p-6 text-center text-xs text-ink-muted">No orders in this range.</p> : null}</div></section></div>;
}
