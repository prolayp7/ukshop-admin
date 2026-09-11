"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  LoaderCircle,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  PackageOpen,
  Phone,
  RefreshCw,
  Search,
  ShoppingCart,
  Truck,
  Undo2,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";

type OrderStatus =
  | "PENDING"
  | "AWAITING_PAYMENT"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";
type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

type Order = {
  id: number;
  orderNumber: string;
  email: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingFullName: string;
  shippingCountry: string;
  total: string;
  placedAt: string;
  user: { id: number; firstName: string; lastName: string } | null;
  _count: { items: number };
};

type OrderDetail = Order & {
  phone?: string | null;
  shippingLine1: string;
  shippingLine2?: string | null;
  shippingCity: string;
  shippingCounty?: string | null;
  shippingPostcode: string;
  subtotal: string;
  discountTotal: string;
  shippingCharge: string;
  vatTotal: string;
  customerNote?: string | null;
  adminNote?: string | null;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  shippingMethod?: { title: string; carrier: string } | null;
  items: Array<{ id: number; titleSnapshot: string; variantTitleSnapshot: string; skuSnapshot?: string | null; quantity: number; unitPrice: string; subtotal: string; product?: { category?: { title: string } | null } | null }>;
  statusHistory: Array<{ id: number; fromStatus: OrderStatus | null; toStatus: OrderStatus; note: string | null; changedByAdmin: { name: string } | null; createdAt: string }>;
  paymentTransactions: Array<{ provider: string; status: string }>;
};

type Meta = { page: number; perPage: number; total: number; totalPages: number };
type Summary = { totalOrders: number; awaitingPayment: number; failedPayments: number; revenue: number; averageOrderValue: number; processing: number; shipped: number; delivered: number; cancelled: number; failed: number; returnsCount: number };

const emptyMeta: Meta = { page: 1, perPage: 20, total: 0, totalPages: 0 };
const emptySummary: Summary = { totalOrders: 0, awaitingPayment: 0, failedPayments: 0, revenue: 0, averageOrderValue: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, failed: 0, returnsCount: 0 };
const orderStatuses: OrderStatus[] = ["PENDING", "AWAITING_PAYMENT", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "FAILED"];

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) return (payload as { data: T }).data;
  return payload as T;
}

function message(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const value = (payload as { message?: unknown }).message;
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return fallback;
}

function money(value: string | number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
}

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function statusTone(status: OrderStatus) {
  if (["DELIVERED", "SHIPPED"].includes(status)) return "bg-positive-tint text-positive-tint-ink ring-positive-tint-border";
  if (["FAILED", "CANCELLED"].includes(status)) return "bg-danger-tint text-danger-tint-ink ring-danger-tint-border";
  if (["PENDING", "AWAITING_PAYMENT"].includes(status)) return "bg-accent-tint text-accent-tint-ink ring-accent-tint-border";
  return "bg-neutral-tint text-ink-secondary ring-border-strong";
}

function paymentTone(status: PaymentStatus) {
  if (status === "PAID") return "text-positive-tint-ink";
  if (status === "FAILED") return "text-danger-tint-ink";
  return "text-ink-secondary";
}

export function OrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [meta, setMeta] = useState<Meta>(emptyMeta);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = useCallback((requestedPage = page, perPage = 20) => {
    const params = new URLSearchParams({ page: String(requestedPage), perPage: String(perPage) });
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (dateFrom) params.set("dateFrom", new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) params.set("dateTo", new Date(`${dateTo}T23:59:59`).toISOString());
    return params;
  }, [dateFrom, dateTo, page, paymentStatus, search, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersResponse, summaryResponse] = await Promise.all([
        fetch(`/api/orders?${query()}`, { cache: "no-store" }),
        fetch("/api/orders/summary", { cache: "no-store" }),
      ]);
      const [ordersPayload, summaryPayload] = await Promise.all([ordersResponse.json(), summaryResponse.json()]);
      if (!ordersResponse.ok) throw new Error(message(ordersPayload, "Orders could not be loaded."));
      // The paginated-list response shape is { data: Order[], meta }, not
      // { data: { items, meta } } - meta sits alongside data, not inside it.
      setItems((ordersPayload as { data?: Order[] }).data ?? []);
      setMeta((ordersPayload as { meta?: Meta }).meta ?? emptyMeta);
      if (summaryResponse.ok) setSummary(unwrap<Summary>(summaryPayload));
      setSelected(new Set());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function updateStatus(ids: number[], nextStatus: OrderStatus) {
    setMutating(true);
    setError("");
    setNotice("");
    try {
      for (const id of ids) {
        const response = await fetch(`/api/orders/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toStatus: nextStatus }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(message(payload, `Order ${id} could not be updated.`));
      }
      setNotice(`${ids.length} ${ids.length === 1 ? "order" : "orders"} moved to ${label(nextStatus)}.`);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "The order status could not be updated.");
    } finally {
      setMutating(false);
    }
  }

  async function exportOrders() {
    setError("");
    try {
      const response = await fetch(`/api/orders?${query(1, 100)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(message(payload, "The export could not be prepared."));
      const exported = (payload as { data?: Order[] }).data ?? [];
      const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const rows = [
        ["ID", "Reference", "Customer", "Email", "Total", "Payment", "Status", "Country", "Placed"],
        ...exported.map((order) => [order.id, order.orderNumber, order.shippingFullName, order.email, order.total, order.paymentStatus, order.status, order.shippingCountry, order.placedAt]),
      ];
      const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(quote).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "The export failed.");
    }
  }

  const allSelected = items.length > 0 && selected.size === items.length;
  const filtersActive = Boolean(searchInput || status || paymentStatus || dateFrom || dateTo);
  const statusCards = useMemo(() => [
    { label: "Total Order", value: summary.totalOrders, icon: Package, bg: "bg-blue-100", iconTone: "text-blue-700" },
    { label: "Pending Payment", value: summary.awaitingPayment, icon: Clock, bg: "bg-amber-100", iconTone: "text-amber-700" },
    { label: "Processing", value: summary.processing, icon: PackageOpen, bg: "bg-teal-100", iconTone: "text-teal-700" },
    { label: "Shipped", value: summary.shipped, icon: Truck, bg: "bg-orange-100", iconTone: "text-orange-700" },
    { label: "Delivered", value: summary.delivered, icon: PackageCheck, bg: "bg-pink-100", iconTone: "text-pink-700" },
    { label: "Cancel", value: summary.cancelled, icon: Ban, bg: "bg-amber-200", iconTone: "text-amber-800" },
    { label: "Returned", value: summary.returnsCount, icon: Undo2, bg: "bg-lime-100", iconTone: "text-lime-700" },
    { label: "Failed", value: summary.failed, icon: XCircle, bg: "bg-sky-100", iconTone: "text-sky-700" },
  ], [summary]);

  return <div className="pb-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink sm:text-2xl">Orders</h1><p className="mt-1 text-[13.5px] text-ink-muted">Review payments, fulfilment progress and customer deliveries.</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink-secondary shadow-card hover:bg-neutral-tint disabled:opacity-50"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh</button><button type="button" onClick={() => void exportOrders()} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white hover:bg-[#1d2939]"><Download className="h-4 w-4" />Export orders</button></div>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{statusCards.map(({ label: cardLabel, value, icon: Icon, bg, iconTone }) => <div key={cardLabel} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card"><span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm", bg, iconTone)}><Icon className="h-5 w-5" /></span><div><p className="text-[12px] font-medium text-ink-secondary">{cardLabel}</p><p className="mt-0.5 text-xl font-bold tabular-nums text-ink">{value.toLocaleString("en-GB")}</p></div></div>)}</div>

    <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
        <div><h2 className="text-[14px] font-semibold text-ink">Orders ({meta.total})</h2><p className="mt-0.5 text-[11.5px] text-ink-muted">Newest orders are shown first.</p></div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:ml-auto lg:max-w-4xl">
          <label className="relative flex-1"><span className="sr-only">Search orders</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search reference or email" className="h-10 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-[13px] outline-none placeholder:text-ink-faint focus:border-accent-strong focus:ring-2 focus:ring-accent-tint-border" /></label>
          <select aria-label="Filter by order status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-10 rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink-secondary outline-none focus:border-accent-strong"><option value="">All statuses</option>{orderStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>
          <select aria-label="Filter by payment status" value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setPage(1); }} className="h-10 rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink-secondary outline-none focus:border-accent-strong"><option value="">All payments</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="PARTIALLY_REFUNDED">Partially refunded</option><option value="REFUNDED">Refunded</option></select>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-b border-border bg-canvas/60 px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs text-ink-muted"><CalendarDays className="h-4 w-4" /><span>Order date</span></div>
        <input type="date" aria-label="Orders from" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary" />
        <span className="hidden text-xs text-ink-faint sm:inline">to</span>
        <input type="date" aria-label="Orders to" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary" />
        {filtersActive ? <button type="button" onClick={() => { setSearchInput(""); setStatus(""); setPaymentStatus(""); setDateFrom(""); setDateTo(""); setPage(1); }} className="text-xs font-semibold text-ink-secondary hover:text-ink">Clear filters</button> : null}
      </div>

      {notice ? <div className="border-b border-positive-tint-border bg-positive-tint px-4 py-2.5 text-xs text-positive-tint-ink">{notice}</div> : null}
      {selected.size > 0 ? <div className="flex flex-col gap-2 bg-ink px-4 py-3 text-white sm:flex-row sm:items-center"><span className="text-xs font-semibold">{selected.size} selected</span><select aria-label="Update selected orders" disabled={mutating} defaultValue="" onChange={(event) => { if (event.target.value) void updateStatus([...selected], event.target.value as OrderStatus); event.target.value = ""; }} className="h-8 rounded-md border border-white/20 bg-white/10 px-2 text-xs sm:ml-auto"><option value="" className="text-ink">Change status…</option>{orderStatuses.map((value) => <option key={value} value={value} className="text-ink">{label(value)}</option>)}</select><button type="button" onClick={() => setSelected(new Set())} className="text-xs font-semibold text-white/70 hover:text-white">Clear</button></div> : null}

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <LoadingState /> : items.length === 0 ? <EmptyState filtered={filtersActive} /> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1060px] border-collapse"><thead><tr className="border-b border-border bg-canvas text-left text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted"><th className="w-12 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)))} aria-label="Select all orders" /></th><th className="px-2 py-3">Reference</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Delivery</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Date</th><th className="w-14 px-3 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{items.map((order) => <tr key={order.id} className="border-b border-border last:border-0 hover:bg-canvas/70"><td className="px-4 py-3"><input type="checkbox" checked={selected.has(order.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(order.id)) next.delete(order.id); else next.add(order.id); return next; })} aria-label={`Select order ${order.orderNumber}`} /></td><td className="px-2 py-3"><button type="button" onClick={() => setDetailId(order.id)} className="font-mono text-[11.5px] font-semibold text-ink hover:underline">{order.orderNumber}</button><p className="mt-0.5 text-[10.5px] text-ink-muted">ID {order.id}</p></td><td className="px-3 py-3"><p className="max-w-48 truncate text-xs font-semibold text-ink">{order.shippingFullName}</p><p className="mt-0.5 max-w-48 truncate text-[10.5px] text-ink-muted">{order.email}</p></td><td className="px-3 py-3 text-xs text-ink-secondary">{order.shippingCountry === "GB" ? "United Kingdom" : order.shippingCountry}</td><td className="px-3 py-3 text-xs tabular-nums text-ink-secondary">{order._count.items}</td><td className="px-3 py-3 text-[13px] font-semibold tabular-nums text-ink">{money(order.total)}</td><td className={cn("px-3 py-3 text-xs font-semibold", paymentTone(order.paymentStatus))}>{label(order.paymentStatus)}</td><td className="px-3 py-3"><select value={order.status} disabled={mutating} onChange={(event) => void updateStatus([order.id], event.target.value as OrderStatus)} aria-label={`Change status for order ${order.orderNumber}`} className={cn("max-w-40 rounded-full px-2 py-1 text-[10.5px] font-semibold ring-1 ring-inset outline-none", statusTone(order.status))}>{orderStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></td><td className="px-3 py-3 text-xs text-ink-muted"><p>{new Date(order.placedAt).toLocaleDateString("en-GB")}</p><p className="mt-0.5 text-[10.5px]">{new Date(order.placedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p></td><td className="px-3 py-3"><button type="button" onClick={() => setDetailId(order.id)} aria-label={`View order ${order.orderNumber}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-border md:hidden">{items.map((order) => <article key={order.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><button type="button" onClick={() => setDetailId(order.id)} className="font-mono text-xs font-semibold text-ink">{order.orderNumber}</button><p className="mt-1 text-xs font-semibold text-ink-secondary">{order.shippingFullName}</p><p className="mt-0.5 text-[11px] text-ink-muted">{order.email}</p></div><span className={cn("rounded-full px-2 py-1 text-[10.5px] font-semibold ring-1 ring-inset", statusTone(order.status))}>{label(order.status)}</span></div><div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3"><div><p className="text-[10.5px] text-ink-muted">Total</p><p className="mt-1 text-xs font-semibold tabular-nums">{money(order.total)}</p></div><div><p className="text-[10.5px] text-ink-muted">Payment</p><p className={cn("mt-1 text-xs font-semibold", paymentTone(order.paymentStatus))}>{label(order.paymentStatus)}</p></div><div><p className="text-[10.5px] text-ink-muted">Placed</p><p className="mt-1 text-xs text-ink-secondary">{new Date(order.placedAt).toLocaleDateString("en-GB")}</p></div></div><button type="button" onClick={() => setDetailId(order.id)} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-ink-secondary"><Eye className="h-4 w-4" />View order</button></article>)}</div>
      </>}

      {!loading && !error && meta.totalPages > 1 ? <div className="flex items-center justify-between border-t border-border px-4 py-3"><p className="text-xs text-ink-muted">Page {meta.page} of {meta.totalPages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary disabled:opacity-45"><ChevronLeft className="h-4 w-4" />Previous</button><button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary disabled:opacity-45">Next<ChevronRight className="h-4 w-4" /></button></div></div> : null}
    </section>
    {detailId ? <OrderDrawer id={detailId} onClose={() => setDetailId(null)} onStatus={(nextStatus) => void updateStatus([detailId], nextStatus)} /> : null}
  </div>;
}

function OrderDrawer({ id, onClose, onStatus }: { id: number; onClose: () => void; onStatus: (status: OrderStatus) => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { const timer = window.setTimeout(async () => { try { const response = await fetch(`/api/orders/${id}`); const payload = await response.json(); if (!response.ok) throw new Error(message(payload, "Order details could not be loaded.")); setOrder(unwrap<OrderDetail>(payload)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Order details could not be loaded."); } }, 0); return () => window.clearTimeout(timer); }, [id]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [onClose]);

  const totalItems = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const deliveredEntry = order?.statusHistory.find((entry) => entry.toStatus === "DELIVERED");
  const initials = order ? order.shippingFullName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() : "";
  const addressLine = order ? [order.shippingLine1, order.shippingLine2, order.shippingCity, order.shippingCounty, order.shippingPostcode, order.shippingCountry].filter(Boolean).join(", ") : "";

  return <div className="fixed inset-0 z-50 overflow-y-auto">
    <button type="button" onClick={onClose} aria-label="Close order details" className="fixed inset-0 bg-slate-950/40" />
    <div className="relative mx-auto my-6 w-full max-w-5xl px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="overflow-hidden rounded-xl bg-surface shadow-panel">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div><p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Order details</p><h2 id="order-detail-title" className="mt-1 font-mono text-[15px] font-semibold text-ink">{order?.orderNumber ?? `Order ${id}`}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close order details" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint"><X className="h-5 w-5" /></button>
        </div>
        {error ? <div className="m-6 rounded-md bg-danger-tint p-4 text-xs text-danger-tint-ink">{error}</div> : !order ? <div className="p-12"><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-ink-muted" /></div> : <div className="space-y-6 p-6">

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-lg font-semibold text-ink">#{order.orderNumber}</span>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", order.paymentStatus === "PAID" ? "bg-positive-tint text-positive-tint-ink ring-positive-tint-border" : "bg-neutral-tint text-ink-secondary ring-border-strong")}>{label(order.paymentStatus)}</span>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", statusTone(order.status))}>{label(order.status)}</span>
            <select value={order.status} onChange={(event) => { const value = event.target.value as OrderStatus; setOrder({ ...order, status: value }); onStatus(value); }} aria-label="Change order status" className="ml-auto h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs"><option value={order.status}>Change status…</option>{orderStatuses.filter((value) => value !== order.status).map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-accent-tint p-4"><div className="flex items-center gap-2 text-xs font-semibold text-accent-tint-ink"><CalendarDays className="h-4 w-4" />Order Date</div><p className="mt-2 text-base font-semibold text-ink">{new Date(order.placedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p></div>
            <div className="rounded-xl bg-neutral-tint p-4"><div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary"><Package className="h-4 w-4" />Total Items</div><p className="mt-2 text-base font-semibold text-ink">{totalItems} pcs</p></div>
            <div className="rounded-xl bg-positive-tint p-4"><div className="flex items-center gap-2 text-xs font-semibold text-positive-tint-ink"><Truck className="h-4 w-4" />Delivery Date</div><p className="mt-2 text-base font-semibold text-ink">{deliveredEntry ? new Date(deliveredEntry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not yet delivered"}</p></div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="overflow-hidden rounded-xl border border-border"><div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-xs"><thead className="border-b border-border bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-3 py-2.5 font-semibold">Product</th><th className="px-3 py-2.5 font-semibold">Category</th><th className="px-3 py-2.5 text-right font-semibold">Qty</th><th className="px-3 py-2.5 text-right font-semibold">Price</th><th className="px-3 py-2.5 text-right font-semibold">Subtotal</th></tr></thead><tbody className="divide-y divide-border">{order.items.map((item) => <tr key={item.id}><td className="px-3 py-3"><p className="font-semibold text-ink">{item.titleSnapshot}</p><p className="mt-0.5 font-mono text-[10.5px] text-ink-muted">{item.skuSnapshot || item.variantTitleSnapshot}</p></td><td className="px-3 py-3 text-ink-secondary">{item.product?.category?.title ?? "—"}</td><td className="px-3 py-3 text-right tabular-nums text-ink-secondary">{item.quantity}</td><td className="px-3 py-3 text-right tabular-nums text-ink-secondary">{money(item.unitPrice)}</td><td className="px-3 py-3 text-right tabular-nums font-semibold text-ink">{money(item.subtotal)}</td></tr>)}</tbody></table></div></div>

            <div className="rounded-xl border border-border bg-canvas p-4"><h3 className="text-[13px] font-semibold text-ink">Order Summary</h3><dl className="mt-3 space-y-2 text-xs"><Total label="Sub-Total" value={order.subtotal} /><Total label="Discount" value={order.discountTotal} negative /><Total label="Delivery" value={order.shippingCharge} /><Total label="VAT" value={order.vatTotal} /><div className="flex justify-between border-t border-border pt-3 text-[13px] font-semibold text-ink"><dt>Total</dt><dd className="tabular-nums">{money(order.total)}</dd></div></dl>{order.paymentTransactions[0] ? <p className="mt-3 rounded-md bg-surface px-3 py-2 text-[11px] text-ink-secondary ring-1 ring-inset ring-border">Paid via {order.paymentTransactions[0].provider}</p> : null}</div>
          </div>

          <section><h3 className="text-[13px] font-semibold text-ink">Customer Information</h3><div className="mt-3 flex items-start gap-3 rounded-xl border border-border bg-canvas p-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[13px] font-semibold text-accent-tint-ink">{initials}</span><div className="min-w-0"><p className="text-[13px] font-semibold text-ink">{order.shippingFullName}</p><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-secondary"><span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-ink-faint" />{order.email}</span>{order.phone ? <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-ink-faint" />{order.phone}</span> : null}<span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-ink-faint" />{addressLine}</span></div></div></div></section>

          <section><h3 className="text-[13px] font-semibold text-ink">Order Tracking</h3><div className="mt-3">{order.statusHistory.map((entry, index) => { const current = index === order.statusHistory.length - 1; return <div key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">{index < order.statusHistory.length - 1 ? <span className="absolute left-[11px] top-6 bottom-0 w-px bg-border" /> : null}<span className={cn("z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", current ? "bg-positive text-white" : "bg-neutral-tint text-ink-muted")}>{current ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}</span><div className="flex-1 pt-0.5"><div className="flex items-baseline justify-between gap-3"><p className="text-xs font-semibold text-ink">{label(entry.toStatus)}</p><p className="shrink-0 text-[10.5px] text-ink-muted">{new Date(entry.createdAt).toLocaleDateString("en-GB")}, {new Date(entry.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p></div><p className="mt-0.5 text-[11px] text-ink-muted">{entry.changedByAdmin ? `Changed by ${entry.changedByAdmin.name}` : "Automatic update"}{entry.note ? ` · ${entry.note}` : ""}</p></div></div>; })}{!order.statusHistory.length ? <p className="text-xs text-ink-muted">No status history yet.</p> : null}</div></section>

          {order.trackingNumber ? <section><h3 className="text-[13px] font-semibold text-ink">Tracking</h3><p className="mt-2 font-mono text-xs text-ink-secondary">{order.trackingCarrier || "Carrier"} · {order.trackingNumber}</p></section> : null}
        </div>}
      </div>
    </div>
  </div>;
}

function Total({ label: totalLabel, value, negative = false }: { label: string; value: string; negative?: boolean }) { return <div className="flex justify-between"><dt className="text-ink-muted">{totalLabel}</dt><dd className="tabular-nums text-ink-secondary">{negative && Number(value) > 0 ? "−" : ""}{money(value)}</dd></div>; }
function LoadingState() { return <div className="divide-y divide-border">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="flex items-center gap-4 p-4"><div className="h-4 w-4 animate-pulse rounded bg-neutral-tint" /><div className="h-3 w-28 animate-pulse rounded bg-neutral-tint" /><div className="h-3 flex-1 animate-pulse rounded bg-neutral-tint" /><div className="h-6 w-24 animate-pulse rounded-full bg-neutral-tint" /></div>)}</div>; }
function ErrorState({ message: errorMessage, onRetry }: { message: string; onRetry: () => void }) { return <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><AlertTriangle className="h-7 w-7 text-danger" /><h2 className="mt-4 text-[13.5px] font-semibold text-ink">Orders could not be loaded</h2><p className="mt-1 max-w-md text-xs leading-5 text-danger-tint-ink">{errorMessage}</p><button type="button" onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-xs font-semibold text-white"><RefreshCw className="h-4 w-4" />Try again</button></div>; }
function EmptyState({ filtered }: { filtered: boolean }) { return <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-tint text-ink-muted"><ShoppingCart className="h-6 w-6" /></span><h2 className="mt-4 text-[13.5px] font-semibold text-ink">{filtered ? "No orders match these filters" : "No orders yet"}</h2><p className="mt-1 max-w-sm text-xs leading-5 text-ink-muted">{filtered ? "Try another reference, payment state, status or date range." : "New storefront orders will appear here when customers complete checkout."}</p></div>; }
