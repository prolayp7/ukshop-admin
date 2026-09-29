"use client";

import { CURRENCY } from "@/lib/currency";
import { DatePicker } from "@/components/ui/date-picker";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, CreditCard, Eye, LoaderCircle, Search, ShieldAlert, UserRound, X } from "lucide-react";
import { OrderDrawer, type OrderStatus } from "@/components/orders/orders-page";
import { CustomerDrawer } from "@/components/customers/customers-page";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Tab = "transactions" | "disputes";
type OrderRef = { id: number; orderNumber: string; email: string; userId: number | null; user: { id: number; firstName: string; lastName: string } | null } | null;
type Meta = { page: number; perPage: number; total: number; totalPages: number; summary?: { capturedAmount?: number; capturedCount?: number; openCount?: number } };
type Transaction = { id: number; orderId: number; order: OrderRef; provider: string; providerTransactionId: string; amount: string; currency: string; status: "PENDING" | "AUTHORIZED" | "CAPTURED" | "FAILED"; createdAt: string };
type Dispute = { id: number; orderId: number; order: OrderRef; providerDisputeId: string; amount: string; status: "WARNING" | "NEEDS_RESPONSE" | "UNDER_REVIEW" | "WON" | "LOST"; reasonCode: string | null; reasonDescription: string | null; respondBy: string | null; createdAt: string };
const disputeStatuses: Dispute["status"][] = ["WARNING", "NEEDS_RESPONSE", "UNDER_REVIEW", "WON", "LOST"];
const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function money(amount: string, currency: string) { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(amount)); }

const txStatusTone: Record<Transaction["status"], string> = { CAPTURED: "bg-positive-tint text-positive-tint-ink", AUTHORIZED: "bg-accent-tint text-accent-tint-ink", PENDING: "bg-neutral-tint text-ink-muted", FAILED: "bg-danger-tint text-danger-tint-ink" };
const disputeStatusTone: Record<Dispute["status"], string> = { WON: "bg-positive-tint text-positive-tint-ink", LOST: "bg-danger-tint text-danger-tint-ink", NEEDS_RESPONSE: "bg-danger-tint text-danger-tint-ink", UNDER_REVIEW: "bg-accent-tint text-accent-tint-ink", WARNING: "bg-neutral-tint text-ink-muted" };

const PER_PAGE_OPTIONS = [20, 50, 100] as const;
const txStatuses: Transaction["status"][] = ["CAPTURED", "AUTHORIZED", "PENDING", "FAILED"];
const providers = [["STRIPE", "Stripe"], ["PAYPAL", "PayPal"], ["TWOCHECKOUT", "2Checkout"]] as const;
const fieldClass = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-accent-strong";
const emptyFilters = { q: "", status: "", provider: "", dateFrom: "", dateTo: "" };
type Filters = typeof emptyFilters;

async function fetchPage<T>(url: string): Promise<{ items: T[]; meta: Meta }> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiMessage(payload, "Payments could not be loaded."));
  return { items: (payload.data ?? []) as T[], meta: payload.meta as Meta };
}

export function PaymentsListing() {
  const [tab, setTab] = useState<Tab>("transactions");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [search, setSearch] = useState(""); // debounced copy of filters.q
  const [page, setPage] = useState(1), [perPage, setPerPage] = useState<number>(20);
  const [transactions, setTransactions] = useState<Transaction[]>([]), [disputes, setDisputes] = useState<Dispute[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [totals, setTotals] = useState({ capturedAmount: 0, capturedCount: 0, openDisputes: 0, disputeCount: 0 });
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [editingDispute, setEditingDispute] = useState<Dispute | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null), [customerId, setCustomerId] = useState<number | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(filters.q.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [filters.q]);

  const query = useCallback((extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage), ...extra });
    if (search) params.set("q", search);
    if (filters.status) params.set("status", filters.status);
    if (tab === "transactions" && filters.provider) params.set("provider", filters.provider);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    return params.toString();
  }, [page, perPage, search, filters.status, filters.provider, filters.dateFrom, filters.dateTo, tab]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (tab === "transactions") {
        const result = await fetchPage<Transaction>(`/api/payments/transactions?${query()}`);
        setTransactions(result.items); setMeta(result.meta);
      } else {
        const result = await fetchPage<Dispute>(`/api/payments/disputes?${query()}`);
        setDisputes(result.items); setMeta(result.meta);
      }
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Payments could not be loaded."); } finally { setLoading(false); }
  }, [tab, query]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  // Headline cards are store-wide (unfiltered), so they don't change as the table is filtered.
  const loadTotals = useCallback(async () => {
    try {
      const [tx, dp] = await Promise.all([fetchPage<Transaction>("/api/payments/transactions?page=1&perPage=1"), fetchPage<Dispute>("/api/payments/disputes?page=1&perPage=1")]);
      setTotals({ capturedAmount: tx.meta.summary?.capturedAmount ?? 0, capturedCount: tx.meta.summary?.capturedCount ?? 0, openDisputes: dp.meta.summary?.openCount ?? 0, disputeCount: dp.meta.total });
    } catch { /* the table shows its own error */ }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadTotals(), 0); return () => window.clearTimeout(timer); }, [loadTotals]);

  const setFilter = (patch: Partial<Filters>) => { setFilters((current) => ({ ...current, ...patch })); if (!("q" in patch)) setPage(1); };
  const filtered = Boolean(search || filters.status || (tab === "transactions" && filters.provider) || filters.dateFrom || filters.dateTo);
  function switchTab(next: Tab) { setTab(next); setFilters(emptyFilters); setSearch(""); setPage(1); setMeta(null); }

  async function updateOrderStatus(id: number, toStatus: OrderStatus) {
    try { const response = await fetch(`/api/orders/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toStatus }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "The order status could not be updated.")); } catch (statusError) { setError(statusError instanceof Error ? statusError.message : "The order status could not be updated."); }
    setOrderId(null); await load();
  }

  const orderCell = (order: OrderRef, fallbackId: number) => <button type="button" onClick={() => setOrderId(order?.id ?? fallbackId)} title="View order details" className="rounded text-left text-[13px] font-semibold text-ink hover:text-accent-strong hover:underline">{order?.orderNumber ?? `#${fallbackId}`}</button>;
  const customerCell = (order: OrderRef) => {
    if (!order) return <span className="text-xs text-ink-faint">—</span>;
    const name = order.user ? `${order.user.firstName} ${order.user.lastName}`.trim() : "";
    return <div className="min-w-0">{order.user ? <button type="button" onClick={() => setCustomerId(order.user!.id)} title="View customer details" className="block max-w-[190px] truncate text-left text-[13px] font-medium text-ink hover:text-accent-strong hover:underline">{name || "Customer"}</button> : <span className="block text-[12px] font-medium text-ink-muted">Guest</span>}<span className="block max-w-[190px] truncate text-[11.5px] text-ink-muted" title={order.email}>{order.email}</span></div>;
  };
  const rowActions = (order: OrderRef, fallbackId: number) => <div className="flex justify-end gap-1.5"><button type="button" onClick={() => setOrderId(order?.id ?? fallbackId)} aria-label={`View order ${order?.orderNumber ?? fallbackId}`} title="Order details" className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint"><Eye className="h-4 w-4" /></button>{order?.user ? <button type="button" onClick={() => setCustomerId(order.user!.id)} aria-label={`View customer ${order.email}`} title="Customer details" className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint"><UserRound className="h-4 w-4" /></button> : null}</div>;
  const th = "px-4 py-3 font-semibold";
  const from = meta && meta.total ? (meta.page - 1) * meta.perPage + 1 : 0;
  const to = meta ? Math.min(meta.page * meta.perPage, meta.total) : 0;

  return <div className="w-full"><div><nav className="flex items-center gap-1.5 text-xs text-ink-muted"><span>Sales</span><ChevronRight className="h-3.5 w-3.5" /><span>Payments</span></nav><h1 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-ink">Payments</h1><p className="mt-1 text-[13.5px] text-ink-muted">Captured transactions and chargeback disputes from your payment providers.</p></div>
  <div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric icon={CreditCard} label="Captured" value={money(String(totals.capturedAmount), CURRENCY)} detail={`${totals.capturedCount} captured transactions`} /><Metric icon={ShieldAlert} label="Open disputes" value={String(totals.openDisputes)} detail={`${totals.disputeCount} total`} /></div>
  {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <div className="mt-5 flex gap-1 border-b border-border">{([{ id: "transactions", label: "Transactions" }, { id: "disputes", label: "Disputes" }] as const).map((item) => <button key={item.id} type="button" onClick={() => switchTab(item.id)} className={`relative px-3 py-2.5 text-[13px] font-semibold ${tab === item.id ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:bg-ink" : "text-ink-muted hover:text-ink"}`}>{item.label}</button>)}</div>

  <div className="mt-4 flex flex-wrap items-end gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-card">
    <label className="relative min-w-[240px] max-w-160 flex-1"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={filters.q} onChange={(event) => setFilter({ q: event.target.value })} placeholder={tab === "transactions" ? "Order number, reference, customer name or email" : "Order number, reference, reason, customer"} className={`${fieldClass} w-full pl-8`} /></label>
    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Status<select value={filters.status} onChange={(event) => setFilter({ status: event.target.value })} className={`${fieldClass} mt-1 block`}><option value="">All statuses</option>{(tab === "transactions" ? txStatuses : disputeStatuses).map((value) => <option key={value} value={value}>{value.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}</option>)}</select></label>
    {tab === "transactions" ? <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Provider<select value={filters.provider} onChange={(event) => setFilter({ provider: event.target.value })} className={`${fieldClass} mt-1 block`}><option value="">All providers</option>{providers.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}
    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">From<DatePicker type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(value) => setFilter({ dateFrom: value })} className={`${fieldClass} mt-1 w-36`} /></label>
    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">To<DatePicker type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(value) => setFilter({ dateTo: value })} className={`${fieldClass} mt-1 w-36`} /></label>
    {filtered ? <button type="button" onClick={() => { setFilters(emptyFilters); setSearch(""); setPage(1); }} className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint"><X className="h-4 w-4" />Clear</button> : null}
  </div>
  {filtered && tab === "transactions" && meta?.summary ? <p className="mt-2 text-xs text-ink-muted">Matching: <strong className="text-ink">{meta.total}</strong> {meta.total === 1 ? "transaction" : "transactions"} · captured <strong className="text-ink">{money(String(meta.summary.capturedAmount ?? 0), CURRENCY)}</strong></p> : null}

  <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto">
    {tab === "transactions"
      ? <table className="w-full min-w-[980px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className={th}>Order</th><th className={th}>Customer</th><th className={th}>Provider</th><th className={th}>Reference</th><th className={`${th} text-right`}>Amount</th><th className={`${th} text-center`}>Status</th><th className={th}>Date</th><th className={`${th} text-right`}>View</th></tr></thead>
        <tbody className="divide-y divide-border">{loading ? <tr><td colSpan={8} className="h-40 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr> : transactions.map((item) => <tr key={item.id} className="hover:bg-canvas"><td className="px-4 py-3">{orderCell(item.order, item.orderId)}</td><td className="px-4 py-3">{customerCell(item.order)}</td><td className="px-4 py-3 text-xs text-ink-secondary">{providers.find(([value]) => value === item.provider)?.[1] ?? item.provider}</td><td className="px-4 py-3 font-mono text-xs text-ink-muted">{item.providerTransactionId}</td><td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(item.amount, CURRENCY)}</td><td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${txStatusTone[item.status]}`}>{item.status}</span></td><td className="px-4 py-3 text-xs text-ink-secondary">{new Date(item.createdAt).toLocaleDateString("en-GB")}</td><td className="px-4 py-3">{rowActions(item.order, item.orderId)}</td></tr>)}{!loading && !transactions.length ? <tr><td colSpan={8} className="h-32 text-center text-[13px] text-ink-muted">{filtered ? "No transactions match these filters." : "No transactions yet."}</td></tr> : null}</tbody></table>
      : <table className="w-full min-w-[980px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className={th}>Order</th><th className={th}>Customer</th><th className={th}>Reference</th><th className={th}>Reason</th><th className={`${th} text-right`}>Amount</th><th className={`${th} text-center`}>Status</th><th className={th}>Respond by</th><th className={`${th} text-right`}>Actions</th></tr></thead>
        <tbody className="divide-y divide-border">{loading ? <tr><td colSpan={8} className="h-40 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr> : disputes.map((item) => <tr key={item.id} className="hover:bg-canvas"><td className="px-4 py-3">{orderCell(item.order, item.orderId)}</td><td className="px-4 py-3">{customerCell(item.order)}</td><td className="px-4 py-3 font-mono text-xs text-ink-muted">{item.providerDisputeId}</td><td className="max-w-xs px-4 py-3 text-xs text-ink-secondary">{item.reasonDescription ?? item.reasonCode ?? "—"}</td><td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(item.amount, CURRENCY)}</td><td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${disputeStatusTone[item.status]}`}>{item.status.replace(/_/g, " ")}</span></td><td className="px-4 py-3 text-xs text-ink-secondary">{item.respondBy ? new Date(item.respondBy).toLocaleDateString("en-GB") : "—"}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1.5">{rowActions(item.order, item.orderId)}<button type="button" onClick={() => setEditingDispute(item)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Update</button></div></td></tr>)}{!loading && !disputes.length ? <tr><td colSpan={8} className="h-32 text-center text-[13px] text-ink-muted">{filtered ? "No disputes match these filters." : "No disputes."}</td></tr> : null}</tbody></table>}
  </div>
  {meta && meta.total > 0 ? <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-ink-muted">
    <p>Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{meta.total}</strong></p>
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2">Rows per page<select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className={fieldClass}>{PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <div className="flex items-center gap-1"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="px-2">Page <strong className="text-ink">{meta.page}</strong> of {Math.max(meta.totalPages, 1)}</span><button type="button" disabled={page >= meta.totalPages || loading} onClick={() => setPage(page + 1)} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>
    </div>
  </footer> : null}
  </section>
  <DisputeDialog dispute={editingDispute} onClose={() => setEditingDispute(null)} onSaved={async () => { await load(); await loadTotals(); }} />
  {orderId ? <OrderDrawer id={orderId} onClose={() => setOrderId(null)} onStatus={(status) => void updateOrderStatus(orderId, status)} /> : null}
  {customerId ? <CustomerDrawer id={customerId} onClose={() => setCustomerId(null)} onChanged={() => undefined} /> : null}
  </div>;
}

function DisputeDialog({ dispute, onClose, onSaved }: { dispute: Dispute | null; onClose: () => void; onSaved: () => Promise<void> }) {
  return <Dialog open={Boolean(dispute)} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Update dispute</DialogTitle><DialogDescription>{dispute ? `${dispute.order?.orderNumber ?? `Order #${dispute.orderId}`} · ${dispute.providerDisputeId}` : ""}</DialogDescription></DialogHeader>{dispute ? <DisputeForm key={dispute.id} dispute={dispute} onClose={onClose} onSaved={onSaved} /> : null}</DialogContent></Dialog>;
}

function DisputeForm({ dispute, onClose, onSaved }: { dispute: Dispute; onClose: () => void; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<Dispute["status"]>(dispute.status), [reason, setReason] = useState(dispute.reasonDescription ?? ""), [saving, setSaving] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { const response = await fetch(`/api/payments/disputes/${dispute.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reasonDescription: reason.trim() || undefined }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "Dispute could not be updated.")); onClose(); await onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Dispute could not be updated."); } finally { setSaving(false); } }
  return <form onSubmit={(event) => void submit(event)}>{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}<label className="text-[13px] font-semibold text-ink-secondary">Status<select value={status} onChange={(event) => setStatus(event.target.value as Dispute["status"])} className={inputClass}>{disputeStatuses.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></label><label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Notes<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className={`${inputClass} h-auto resize-y py-3`} /></label><DialogFooter className="mt-2"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter></form>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof CreditCard; label: string; value: string; detail: string }) { return <div className="rounded-xl border border-border bg-surface p-4 shadow-card"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</p><p className="mt-0.5 truncate text-lg font-semibold text-ink">{value}</p></div></div><p className="mt-3 text-xs text-ink-muted">{detail}</p></div>; }
