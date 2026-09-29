"use client";

import { DatePicker } from "@/components/ui/date-picker";

import { CURRENCY } from "@/lib/currency";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DonutChart, GroupedBarChart, HBarChart, SalesChart } from "@/components/reports/report-charts";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, LoaderCircle, MapPin, Package, Search, Tag, Ticket, Users } from "lucide-react";

type Tab = "sales" | "products" | "customers" | "inventory" | "orders" | "category-brand" | "coupons" | "geography";
type SalesPoint = { period: string; grossRevenue: number; refundTotal: number; revenue: number; orderCount: number };
type ProductRow = { productId: number; title: string; unitsSold: number; revenue: number; stockQty: number };
type Spender = { user?: { id: number; email: string; firstName: string; lastName: string }; totalSpent: number; orderCount: number };
type InventoryRow = { id: number; title: string; stockQty: number; lowStockThreshold: number; product: { title: string } };
type OrdersBreakdown = { byStatus: Record<string, number>; byPaymentStatus: Record<string, number> };
type CategoryBrandRow = { revenue: number; unitsSold: number; title: string };
type CouponRow = { couponId: number; code: string; ordersCount: number; totalDiscount: number; revenue: number };
type GeographyRow = { postcodeArea: string; orderCount: number; revenue: number };

function money(value: number) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(value); }
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
type RangePreset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "custom";
function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
const today = new Date();
const defaultFrom = isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29));
const defaultTo = isoDate(today);

function rangeForPreset(preset: Exclude<RangePreset, "custom">, now = new Date()): [string, string] {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(to);
  if (preset === "yesterday") from.setDate(from.getDate() - 1);
  if (preset === "last7") from.setDate(from.getDate() - 6);
  if (preset === "last30") from.setDate(from.getDate() - 29);
  if (preset === "thisMonth") from.setDate(1);
  if (preset === "lastMonth") {
    from.setDate(0);
    from.setDate(1);
    to.setDate(0);
  }
  return [isoDate(from), isoDate(to)];
}

function csvCell(value: string | number) { return `"${String(value).replace(/"/g, '""')}"`; }
function previousRange(dateFrom: string, dateTo: string): [string, string] {
  const from = new Date(`${dateFrom}T00:00:00.000Z`);
  const to = new Date(`${dateTo}T00:00:00.000Z`);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const previousTo = new Date(from);
  previousTo.setUTCDate(previousTo.getUTCDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setUTCDate(previousFrom.getUTCDate() - days + 1);
  return [previousFrom.toISOString().slice(0, 10), previousTo.toISOString().slice(0, 10)];
}
function comparisonText(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "0% vs previous period" : "New vs previous period";
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}% vs previous period`;
}

export function ReportsListing() {
  const [tab, setTab] = useState<Tab>("sales"), [rangePreset, setRangePreset] = useState<RangePreset>("last30");
  const [dateFrom, setDateFrom] = useState(defaultFrom), [dateTo, setDateTo] = useState(defaultTo), [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [comparePrevious, setComparePrevious] = useState(false);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [sales, setSales] = useState<SalesPoint[]>([]), [previousSales, setPreviousSales] = useState<SalesPoint[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]), [productSort, setProductSort] = useState<"best" | "worst" | "stock">("best");
  const [productSearch, setProductSearch] = useState(""), [productPage, setProductPage] = useState(0);
  const [customers, setCustomers] = useState<{ newCustomers: number; returningCustomers: number; topSpenders: Spender[] }>({ newCustomers: 0, returningCustomers: 0, topSpenders: [] });
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [orders, setOrders] = useState<OrdersBreakdown>({ byStatus: {}, byPaymentStatus: {} });
  const [categoryBrand, setCategoryBrand] = useState<{ byCategory: CategoryBrandRow[]; byBrand: CategoryBrandRow[] }>({ byCategory: [], byBrand: [] });
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [geography, setGeography] = useState<GeographyRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const range = new URLSearchParams({ dateFrom: `${dateFrom}T00:00:00.000Z`, dateTo: `${dateTo}T23:59:59.999Z` });
    const previousDates = comparePrevious ? previousRange(dateFrom, dateTo) : null;
    const previousParams = previousDates ? new URLSearchParams({ dateFrom: `${previousDates[0]}T00:00:00.000Z`, dateTo: `${previousDates[1]}T23:59:59.999Z`, groupBy }) : null;
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
      setSales((salesPayload.data ?? salesPayload).points ?? []);
      if (previousParams) {
        const previousRes = await fetch(`/api/reports/sales?${previousParams}`, { cache: "no-store" });
        const previousPayload = await previousRes.json().catch(() => ({}));
        if (!previousRes.ok) throw new Error(apiMessage(previousPayload, "Previous-period sales could not be loaded."));
        setPreviousSales((previousPayload.data ?? previousPayload).points ?? []);
      } else setPreviousSales([]);
      const productsPayload = await productsRes.json().catch(() => ({})); if (productsRes.ok) setProducts((productsPayload.data ?? productsPayload).rows ?? []);
      const customersPayload = await customersRes.json().catch(() => ({})); if (customersRes.ok) { const c = customersPayload.data ?? customersPayload; setCustomers({ newCustomers: c.newCustomers ?? 0, returningCustomers: c.returningCustomers ?? 0, topSpenders: c.topSpenders ?? [] }); }
      const inventoryPayload = await inventoryRes.json().catch(() => ([])); if (inventoryRes.ok) setInventory(Array.isArray(inventoryPayload) ? inventoryPayload : (inventoryPayload.data ?? []));
      const ordersPayload = await ordersRes.json().catch(() => ({})); if (ordersRes.ok) { const o = ordersPayload.data ?? ordersPayload; setOrders({ byStatus: o.byStatus ?? {}, byPaymentStatus: o.byPaymentStatus ?? {} }); }
      const cbPayload = await cbRes.json().catch(() => ({})); if (cbRes.ok) { const cb = cbPayload.data ?? cbPayload; setCategoryBrand({ byCategory: cb.byCategory ?? [], byBrand: cb.byBrand ?? [] }); }
      const couponsPayload = await couponsRes.json().catch(() => ({})); if (couponsRes.ok) setCoupons((couponsPayload.data ?? couponsPayload).rows ?? []);
      const geoPayload = await geoRes.json().catch(() => ({})); if (geoRes.ok) setGeography((geoPayload.data ?? geoPayload).rows ?? []);
      const failedReports = [productsRes, customersRes, inventoryRes, ordersRes, cbRes, couponsRes, geoRes].flatMap((response, index) => response.ok ? [] : [["Products", "Customers", "Inventory", "Orders", "Category & brand", "Coupons", "Geography"][index]]);
      if (failedReports.length) setError(`Could not load ${failedReports.join(", ")} report data.`);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Reports could not be loaded."); } finally { setLoading(false); }
  }, [dateFrom, dateTo, groupBy, productSort, comparePrevious]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const totalRevenue = useMemo(() => sales.reduce((sum, point) => sum + point.revenue, 0), [sales]);
  const grossRevenue = useMemo(() => sales.reduce((sum, point) => sum + point.grossRevenue, 0), [sales]);
  const refundTotal = useMemo(() => sales.reduce((sum, point) => sum + point.refundTotal, 0), [sales]);
  const totalOrders = useMemo(() => sales.reduce((sum, point) => sum + point.orderCount, 0), [sales]);
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const previousGrossRevenue = useMemo(() => previousSales.reduce((sum, point) => sum + point.grossRevenue, 0), [previousSales]);
  const previousRefundTotal = useMemo(() => previousSales.reduce((sum, point) => sum + point.refundTotal, 0), [previousSales]);
  const previousRevenue = useMemo(() => previousSales.reduce((sum, point) => sum + point.revenue, 0), [previousSales]);
  const previousOrders = useMemo(() => previousSales.reduce((sum, point) => sum + point.orderCount, 0), [previousSales]);
  const previousAverageOrderValue = previousOrders ? previousRevenue / previousOrders : 0;
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return query ? products.filter((product) => product.title.toLowerCase().includes(query)) : products;
  }, [products, productSearch]);
  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / 25));
  const currentProductPage = Math.min(productPage, productPageCount - 1);
  const visibleProducts = filteredProducts.slice(currentProductPage * 25, currentProductPage * 25 + 25);

  function setPreset(preset: RangePreset) {
    setRangePreset(preset);
    if (preset !== "custom") {
      const [from, to] = rangeForPreset(preset);
      setDateFrom(from);
      setDateTo(to);
    }
  }

  function downloadReportCsv() {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    if (tab === "sales") { headers = ["Period", "Gross sales", "Refunds", "Net revenue", "Orders"]; rows = sales.map((row) => [row.period, row.grossRevenue, row.refundTotal, row.revenue, row.orderCount]); }
    else if (tab === "products") { headers = ["Product", "Units sold", "Revenue", "In stock"]; rows = filteredProducts.map((row) => [row.title, row.unitsSold, row.revenue, row.stockQty]); }
    else if (tab === "customers") { headers = ["Type", "Customer", "Email", "Orders", "Spend"]; rows = [["Summary", "New customers", "", "", customers.newCustomers], ["Summary", "Returning customers", "", "", customers.returningCustomers], ...customers.topSpenders.map((row) => ["Top spender", row.user ? `${row.user.firstName} ${row.user.lastName}` : "Unknown customer", row.user?.email ?? "", row.orderCount, row.totalSpent])]; }
    else if (tab === "inventory") { headers = ["Product", "Variant", "In stock", "Low-stock threshold"]; rows = inventory.map((row) => [row.product.title, row.title, row.stockQty, row.lowStockThreshold]); }
    else if (tab === "orders") { headers = ["Breakdown", "Status", "Orders"]; rows = [...Object.entries(orders.byStatus).map(([name, count]) => ["Order status", name, count] as (string | number)[]), ...Object.entries(orders.byPaymentStatus).map(([name, count]) => ["Payment status", name, count] as (string | number)[])]; }
    else if (tab === "category-brand") { headers = ["Type", "Name", "Revenue", "Units sold"]; rows = [...categoryBrand.byCategory.map((row) => ["Category", row.title, row.revenue, row.unitsSold]), ...categoryBrand.byBrand.map((row) => ["Brand", row.title, row.revenue, row.unitsSold])]; }
    else if (tab === "coupons") { headers = ["Code", "Orders", "Discount given", "Order revenue"]; rows = coupons.map((row) => [row.code, row.ordersCount, row.totalDiscount, row.revenue]); }
    else { headers = ["Postcode area", "Orders", "Revenue"]; rows = geography.map((row) => [row.postcodeArea, row.orderCount, row.revenue]); }
    if (!rows.length) return;
    const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ukshop-${tab}-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const hasExportRows = tab === "sales" ? sales.length > 0 : tab === "products" ? filteredProducts.length > 0 : tab === "customers" ? customers.topSpenders.length > 0 || customers.newCustomers + customers.returningCustomers > 0 : tab === "inventory" ? inventory.length > 0 : tab === "orders" ? Object.keys(orders.byStatus).length + Object.keys(orders.byPaymentStatus).length > 0 : tab === "category-brand" ? categoryBrand.byCategory.length + categoryBrand.byBrand.length > 0 : tab === "coupons" ? coupons.length > 0 : geography.length > 0;

  return <div className="w-full"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Reports</h1><p className="mt-1 text-[13.5px] text-ink-muted">Sales, product, customer, inventory and order performance.</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-[11px] font-semibold text-ink-secondary">Range<select value={rangePreset} onChange={(event) => setPreset(event.target.value as RangePreset)} className="mt-1 h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary outline-none focus:border-accent-strong"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="last7">Last 7 days</option><option value="last30">Last 30 days</option><option value="thisMonth">This month</option><option value="lastMonth">Last month</option><option value="custom">Custom</option></select></label><label className="text-[11px] font-semibold text-ink-secondary">From<DatePicker type="date" value={dateFrom} max={dateTo} onChange={(value) => { setRangePreset("custom"); setDateFrom(value); }} className="mt-1 h-9 min-w-36 text-xs" /></label><label className="text-[11px] font-semibold text-ink-secondary">To<DatePicker type="date" value={dateTo} min={dateFrom} max={isoDate(today)} onChange={(value) => { setRangePreset("custom"); setDateTo(value); }} className="mt-1 h-9 min-w-36 text-xs" /></label><label className="text-[11px] font-semibold text-ink-secondary">Group by<select value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)} className="mt-1 h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary outline-none focus:border-accent-strong"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></label><label className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-2.5 text-xs text-ink-secondary"><input type="checkbox" checked={comparePrevious} onChange={(event) => setComparePrevious(event.target.checked)} className="h-3.5 w-3.5 accent-accent" />Compare period</label><button type="button" onClick={downloadReportCsv} disabled={loading || !hasExportRows} className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-xs font-semibold text-ink-secondary hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-3.5 w-3.5" />Export CSV</button></div></div>
  {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border">{([{ id: "sales", label: "Sales" }, { id: "products", label: "Products" }, { id: "customers", label: "Customers" }, { id: "inventory", label: "Inventory" }, { id: "orders", label: "Orders" }, { id: "category-brand", label: "Category & brand" }, { id: "coupons", label: "Coupons" }, { id: "geography", label: "Geography" }] as const).map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`relative shrink-0 px-3 py-2.5 text-[13px] font-semibold ${tab === item.id ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:bg-ink" : "text-ink-muted hover:text-ink"}`}>{item.label}</button>)}</div>
  {loading ? <div className="flex min-h-40 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-ink-muted" /></div> : tab === "sales" ? <>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Gross sales" value={money(grossRevenue)} comparison={comparePrevious ? comparisonText(grossRevenue, previousGrossRevenue) : undefined} /><Metric label="Refunds" value={money(refundTotal)} comparison={comparePrevious ? comparisonText(refundTotal, previousRefundTotal) : undefined} /><Metric label="Net revenue" value={money(totalRevenue)} comparison={comparePrevious ? comparisonText(totalRevenue, previousRevenue) : undefined} /><Metric label="Orders" value={totalOrders.toLocaleString("en-GB")} comparison={comparePrevious ? comparisonText(totalOrders, previousOrders) : undefined} /><Metric label="Avg order value" value={money(avgOrderValue)} comparison={comparePrevious ? comparisonText(avgOrderValue, previousAverageOrderValue) : undefined} /></div>
    <section className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-card">
      {sales.length ? <SalesChart points={sales} groupBy={groupBy} /> : <p className="py-10 text-center text-[13px] text-ink-muted">No sales in this range.</p>}
    </section>
  </> : tab === "products" ? <><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><label className="flex h-9 min-w-[220px] items-center gap-2 rounded-md border border-border-strong bg-surface px-2.5 text-ink-muted"><Search className="h-3.5 w-3.5" /><input aria-label="Search products" value={productSearch} onChange={(event) => { setProductPage(0); setProductSearch(event.target.value); }} placeholder="Search products" className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-muted" /></label><select value={productSort} onChange={(event) => { setProductPage(0); setProductSort(event.target.value as typeof productSort); }} className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary outline-none focus:border-accent-strong"><option value="best">Best sellers</option><option value="worst">Worst sellers</option><option value="stock">Lowest stock</option></select></div>
    {products.length ? <section className="mt-3 rounded-xl border border-border bg-surface p-4 shadow-card"><h2 className="mb-3 text-[13.5px] font-semibold text-ink">{productSort === "stock" ? "Lowest stock levels" : productSort === "worst" ? "Slowest sellers (units sold)" : "Best sellers (units sold)"}</h2><HBarChart rows={products.slice(0, 10).map((row) => ({ name: row.title, value: productSort === "stock" ? row.stockQty : row.unitsSold }))} format={(value) => value.toLocaleString("en-GB")} unitLabel={productSort === "stock" ? "In stock" : "Units sold"} color={productSort === "stock" ? "var(--color-ink)" : "var(--color-accent)"} /></section> : null}
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 text-right font-semibold">Units sold</th><th className="px-4 py-3 text-right font-semibold">Revenue</th><th className="px-4 py-3 text-right font-semibold">In stock</th></tr></thead><tbody className="divide-y divide-border">{visibleProducts.map((row) => <tr key={row.productId} className="hover:bg-canvas"><td className="px-4 py-3 text-[13px] font-semibold text-ink">{row.title}</td><td className="px-4 py-3 text-right text-xs text-ink-secondary">{row.unitsSold}</td><td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(row.revenue)}</td><td className="px-4 py-3 text-right text-xs text-ink-secondary">{row.stockQty}</td></tr>)}{!filteredProducts.length ? <tr><td colSpan={4} className="h-32 text-center text-[13px] text-ink-muted">No matching products.</td></tr> : null}</tbody></table></div><div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-ink-muted"><span>Showing {filteredProducts.length ? currentProductPage * 25 + 1 : 0}-{Math.min((currentProductPage + 1) * 25, filteredProducts.length)} of {filteredProducts.length}</span><div className="flex items-center gap-1"><button type="button" aria-label="Previous page" title="Previous page" disabled={currentProductPage === 0} onClick={() => setProductPage((page) => Math.max(0, page - 1))} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-12 text-center tabular-nums">{currentProductPage + 1} / {productPageCount}</span><button type="button" aria-label="Next page" title="Next page" disabled={currentProductPage + 1 >= productPageCount} onClick={() => setProductPage((page) => Math.min(productPageCount - 1, page + 1))} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div></section>
  </> : tab === "customers" ? <>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><Metric icon={Users} label="New customers" value={customers.newCustomers.toLocaleString("en-GB")} /><Metric icon={Users} label="Returning customers" value={customers.returningCustomers.toLocaleString("en-GB")} /></div>
    {customers.newCustomers + customers.returningCustomers > 0 || customers.topSpenders.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2"><section className=" rounded-xl border border-border bg-surface p-4 shadow-card"><h2 className="mb-3 text-[13.5px] font-semibold text-ink">New vs returning customers</h2><DonutChart centerLabel="customers" data={[{ name: "New", value: customers.newCustomers }, { name: "Returning", value: customers.returningCustomers }]} /></section><section className=" rounded-xl border border-border bg-surface p-4 shadow-card"><h2 className="mb-3 text-[13.5px] font-semibold text-ink">Top spenders (revenue)</h2>{customers.topSpenders.length ? <HBarChart rows={customers.topSpenders.slice(0, 8).map((s) => ({ name: s.user ? `${s.user.firstName} ${s.user.lastName}` : "Unknown", value: s.totalSpent }))} format={money} unitLabel="Spent" /> : <p className="py-10 text-center text-xs text-ink-muted">No customer spend in this range.</p>}</section></div> : null}
    <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="border-b border-border p-4"><h2 className="text-[13.5px] font-semibold text-ink">Top spenders</h2></div><div className="divide-y divide-border">{customers.topSpenders.map((spender, index) => <div key={spender.user?.id ?? index} className="flex items-center justify-between p-3.5"><div><p className="text-[13px] font-semibold text-ink">{spender.user ? `${spender.user.firstName} ${spender.user.lastName}` : "Unknown customer"}</p><p className="mt-0.5 text-[10.5px] text-ink-muted">{spender.user?.email ?? "—"} · {spender.orderCount} orders</p></div><p className="text-[13px] font-semibold text-ink">{money(spender.totalSpent)}</p></div>)}{!customers.topSpenders.length ? <p className="p-8 text-center text-[13px] text-ink-muted">No customer spend in this range.</p> : null}</div></section>
  </> : tab === "inventory" ? <>{inventory.length ? <section className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-card"><h2 className="mb-3 text-[13.5px] font-semibold text-ink">Lowest stock vs threshold</h2><HBarChart rows={inventory.slice(0, 10).map((row) => ({ name: `${row.product.title} · ${row.title}`, value: row.stockQty, secondary: row.lowStockThreshold }))} format={(value) => value.toLocaleString("en-GB")} unitLabel="In stock" secondaryLabel="Threshold" labelWidth={230} color="var(--color-danger)" /></section> : null}<section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="border-b border-border p-4"><h2 className="text-[13.5px] font-semibold text-ink">Low stock</h2><p className="mt-0.5 text-xs text-ink-muted">Variants at or below their low-stock threshold.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Variant</th><th className="px-4 py-3 text-right font-semibold">In stock</th><th className="px-4 py-3 text-right font-semibold">Threshold</th></tr></thead><tbody className="divide-y divide-border">{inventory.map((row) => <tr key={row.id} className="hover:bg-canvas"><td className="px-4 py-3 text-[13px] font-semibold text-ink">{row.product.title}</td><td className="px-4 py-3 text-xs text-ink-secondary">{row.title}</td><td className="px-4 py-3 text-right text-xs font-semibold text-danger-tint-ink">{row.stockQty}</td><td className="px-4 py-3 text-right text-xs text-ink-muted">{row.lowStockThreshold}</td></tr>)}{!inventory.length ? <tr><td colSpan={4} className="h-32 text-center text-[13px] text-ink-muted">Nothing is low on stock.</td></tr> : null}</tbody></table></div></section></>
  : tab === "orders" ? <OrdersBreakdown byStatus={orders.byStatus} byPaymentStatus={orders.byPaymentStatus} />
  : tab === "category-brand" ? <div className="mt-4 grid gap-4 lg:grid-cols-2"><RankedList icon={Tag} title="By category" rows={categoryBrand.byCategory} /><RankedList icon={Package} title="By brand" rows={categoryBrand.byBrand} /></div>
  : tab === "coupons" ? <>{coupons.length ? <section className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-card"><h2 className="mb-3 text-[13.5px] font-semibold text-ink">Discount given vs order revenue</h2><GroupedBarChart rows={coupons.slice(0, 8).map((row) => ({ name: row.code, a: row.totalDiscount, b: row.revenue }))} aName="Discount given" bName="Order revenue" format={money} /></section> : null}<section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Code</th><th className="px-4 py-3 text-right font-semibold">Orders</th><th className="px-4 py-3 text-right font-semibold">Discount given</th><th className="px-4 py-3 text-right font-semibold">Order revenue</th></tr></thead><tbody className="divide-y divide-border">{coupons.map((row) => <tr key={row.couponId} className="hover:bg-canvas"><td className="px-4 py-3 font-mono text-xs font-semibold text-ink"><Ticket className="mr-1.5 inline h-3.5 w-3.5 text-ink-muted" />{row.code}</td><td className="px-4 py-3 text-right text-xs text-ink-secondary">{row.ordersCount}</td><td className="px-4 py-3 text-right text-xs text-danger-tint-ink">-{money(row.totalDiscount)}</td><td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(row.revenue)}</td></tr>)}{!coupons.length ? <tr><td colSpan={4} className="h-32 text-center text-[13px] text-ink-muted">No coupon usage in this range.</td></tr> : null}</tbody></table></div></section></>
  : <>{geography.length ? <section className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-card"><h2 className="mb-3 text-[13.5px] font-semibold text-ink">Revenue by postcode area</h2><HBarChart rows={[...geography].sort((a, b) => b.revenue - a.revenue).slice(0, 10).map((row) => ({ name: row.postcodeArea, value: row.revenue }))} format={money} unitLabel="Revenue" /></section> : null}<section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Postcode area</th><th className="px-4 py-3 text-right font-semibold">Orders</th><th className="px-4 py-3 text-right font-semibold">Revenue</th></tr></thead><tbody className="divide-y divide-border">{geography.map((row) => <tr key={row.postcodeArea} className="hover:bg-canvas"><td className="px-4 py-3 text-[13px] font-semibold text-ink"><MapPin className="mr-1.5 inline h-3.5 w-3.5 text-ink-muted" />{row.postcodeArea}</td><td className="px-4 py-3 text-right text-xs text-ink-secondary">{row.orderCount}</td><td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(row.revenue)}</td></tr>)}{!geography.length ? <tr><td colSpan={3} className="h-32 text-center text-[13px] text-ink-muted">No orders in this range.</td></tr> : null}</tbody></table></div></section></>}
  </div>;
}

function Metric({ icon: Icon, label, value, comparison }: { icon?: typeof Users; label: string; value: string; comparison?: string }) { return <div className="rounded-xl border border-border bg-surface p-4 shadow-card"><div className="flex items-center gap-3">{Icon ? <span className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><Icon className="h-4 w-4" /></span> : null}<div><p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</p><p className="mt-0.5 text-lg font-semibold text-ink">{value}</p>{comparison ? <p className="mt-0.5 text-[10.5px] text-ink-muted">{comparison}</p> : null}</div></div></div>; }

function RankedList({ icon: Icon, title, rows }: { icon: typeof Tag; title: string; rows: CategoryBrandRow[] }) {
  return <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="flex items-center gap-2 border-b border-border p-4"><Icon className="h-4 w-4 text-ink-muted" /><h2 className="text-[13.5px] font-semibold text-ink">{title}</h2></div><div className="p-4">{rows.length ? <HBarChart rows={rows.slice(0, 10).map((row) => ({ name: row.title, value: row.revenue }))} format={money} unitLabel="Revenue" /> : <p className="p-6 text-center text-xs text-ink-muted">No data in this range.</p>}</div></section>;
}

function OrdersBreakdown({ byStatus, byPaymentStatus }: { byStatus: Record<string, number>; byPaymentStatus: Record<string, number> }) {
  const panel = (title: string, record: Record<string, number>) => <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="border-b border-border p-4"><h2 className="text-[13.5px] font-semibold text-ink">{title}</h2></div><div className="p-4">{Object.keys(record).length ? <DonutChart colorByName centerLabel="orders" data={Object.entries(record).map(([name, value]) => ({ name, value }))} /> : <p className="p-6 text-center text-xs text-ink-muted">No orders in this range.</p>}</div></section>;
  return <div className="mt-4 grid gap-4 lg:grid-cols-2">{panel("Orders by status", byStatus)}{panel("Orders by payment status", byPaymentStatus)}</div>;
}
