"use client";

import { CURRENCY } from "@/lib/currency";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Banknote, ChevronLeft, ChevronRight, Eye, LoaderCircle, PackageCheck, ReceiptText, RotateCcw, Search, UserRound, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderDrawer, type OrderStatus } from "@/components/orders/orders-page";
import { CustomerDrawer } from "@/components/customers/customers-page";

type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED";
type ReturnItem = {
  id: number;
  reason: string;
  comment: string | null;
  refundAmount: string | null;
  returnStatus: ReturnStatus;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; email: string };
  orderItem: { subtotal: string; order: { id: number; orderNumber: string }; product: { title: string }; productVariant: { title: string } | null };
};
type Action = { type: "approve" | "reject" | "receive" | "refund"; target: ReturnItem };
const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const statusTone: Record<ReturnStatus, string> = { REQUESTED: "bg-accent-tint text-accent-tint-ink", APPROVED: "bg-neutral-tint text-ink-muted", RECEIVED: "bg-neutral-tint text-ink-muted", REFUNDED: "bg-positive-tint text-positive-tint-ink", REJECTED: "bg-danger-tint text-danger-tint-ink" };
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function money(amount: string) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(Number(amount)); }

const PER_PAGE_OPTIONS = [20, 50, 100] as const;
const returnStatuses: ReturnStatus[] = ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED"];
const fieldClass = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-accent-strong";
const emptyFilters = { q: "", status: "", dateFrom: "", dateTo: "" };
type Filters = typeof emptyFilters;
type Summary = { requestedAmount: number; refundedAmount: number; refundedCount: number; pendingCount: number };
type Meta = { page: number; perPage: number; total: number; totalPages: number; summary?: Summary };

async function fetchReturns(query: string): Promise<{ items: ReturnItem[]; meta: Meta }> {
  const response = await fetch(`/api/payments/returns?${query}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiMessage(payload, "Returns could not be loaded."));
  return { items: (payload.data ?? []) as ReturnItem[], meta: payload.meta as Meta };
}

export function ReturnsListing() {
  const [items, setItems] = useState<ReturnItem[]>([]), [meta, setMeta] = useState<Meta | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters), [search, setSearch] = useState(""); // search = debounced filters.q
  const [page, setPage] = useState(1), [perPage, setPerPage] = useState<number>(20);
  const [totals, setTotals] = useState<(Summary & { total: number }) | null>(null);
  const [action, setAction] = useState<Action | null>(null), [orderId, setOrderId] = useState<number | null>(null), [customerId, setCustomerId] = useState<number | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(filters.q.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [filters.q]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    if (search) params.set("q", search);
    if (filters.status) params.set("status", filters.status);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    try { const result = await fetchReturns(params.toString()); setItems(result.items); setMeta(result.meta); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Returns could not be loaded."); } finally { setLoading(false); }
  }, [page, perPage, search, filters.status, filters.dateFrom, filters.dateTo]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  // Headline cards are store-wide (unfiltered), so they don't change as the table is filtered.
  const loadTotals = useCallback(async () => { try { const { meta: all } = await fetchReturns("page=1&perPage=1"); if (all.summary) setTotals({ ...all.summary, total: all.total }); } catch { /* the table shows its own error */ } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadTotals(), 0); return () => window.clearTimeout(timer); }, [loadTotals]);
  const reload = async () => { await Promise.all([load(), loadTotals()]); };

  // Moving an order's status from here (e.g. after inspecting it) behaves exactly like the Orders page.
  async function updateOrderStatus(id: number, toStatus: OrderStatus) {
    setError("");
    try { const response = await fetch(`/api/orders/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toStatus }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "The order status could not be updated.")); setOrderId(null); await load(); } catch (statusError) { setError(statusError instanceof Error ? statusError.message : "The order status could not be updated."); setOrderId(null); }
  }
  const setFilter = (patch: Partial<Filters>) => { setFilters((current) => ({ ...current, ...patch })); if (!("q" in patch)) setPage(1); };
  const filtered = Boolean(search || filters.status || filters.dateFrom || filters.dateTo);
  const from = meta && meta.total ? (meta.page - 1) * meta.perPage + 1 : 0;
  const to = meta ? Math.min(meta.page * meta.perPage, meta.total) : 0;
  const iconButton = "flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint";

  return <div className="w-full"><nav className="flex items-center gap-1.5 text-xs text-ink-muted"><span>Sales</span><ChevronRight className="h-3.5 w-3.5" /><span>Returns</span></nav><h1 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-ink">Returns &amp; refunds</h1><p className="mt-1 text-[13.5px] text-ink-muted">Customer return requests, from approval through refund.</p>
  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={RotateCcw} label="Awaiting review" value={totals ? String(totals.pendingCount) : "—"} detail="Return requests" /><Metric icon={PackageCheck} label="Total requests" value={totals ? String(totals.total) : "—"} detail="All statuses" /><Metric icon={ReceiptText} label="Refund requested" value={totals ? money(String(totals.requestedAmount)) : "—"} detail="Value of returned items, excluding rejected" /><Metric icon={Banknote} label="Total refunded" value={totals ? money(String(totals.refundedAmount)) : "—"} detail={totals ? `${totals.refundedCount} ${totals.refundedCount === 1 ? "return" : "returns"} refunded` : "Refunded returns"} /></div>
  {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <div className="mt-5 flex flex-wrap items-end gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-card">
    <label className="relative min-w-[240px] flex-1"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={filters.q} onChange={(event) => setFilter({ q: event.target.value })} placeholder="Order number, product, reason, customer name or email" className={`${fieldClass} w-full pl-8`} /></label>
    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Status<select value={filters.status} onChange={(event) => setFilter({ status: event.target.value })} className={`${fieldClass} mt-1 block`}><option value="">All statuses</option>{returnStatuses.map((value) => <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label>
    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">From<input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(event) => setFilter({ dateFrom: event.target.value })} className={`${fieldClass} mt-1 block`} /></label>
    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">To<input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => setFilter({ dateTo: event.target.value })} className={`${fieldClass} mt-1 block`} /></label>
    {filtered ? <button type="button" onClick={() => { setFilters(emptyFilters); setSearch(""); setPage(1); }} className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint"><X className="h-4 w-4" />Clear</button> : null}
  </div>
  {filtered && meta?.summary ? <p className="mt-2 text-xs text-ink-muted">Matching: <strong className="text-ink">{meta.total}</strong> {meta.total === 1 ? "request" : "requests"} · requested <strong className="text-ink">{money(String(meta.summary.requestedAmount))}</strong> · refunded <strong className="text-ink">{money(String(meta.summary.refundedAmount))}</strong></p> : null}
  <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Order</th><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">Reason</th><th className="px-4 py-3 font-semibold">Requested</th><th className="px-4 py-3 text-right font-semibold">Amount</th><th className="px-4 py-3 text-center font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-border">{loading ? <tr><td colSpan={8} className="h-40 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr> : items.map((item) => <tr key={item.id} className="hover:bg-canvas"><td className="px-4 py-3 text-[13px] font-semibold text-ink"><button type="button" onClick={() => setOrderId(item.orderItem.order.id)} title="View order details" className="rounded text-left font-semibold hover:text-accent-strong hover:underline focus-visible:outline-2 focus-visible:outline-accent">{item.orderItem.order.orderNumber}</button></td><td className="px-4 py-3 text-xs text-ink-secondary">{item.orderItem.product.title}{item.orderItem.productVariant ? ` — ${item.orderItem.productVariant.title}` : ""}</td><td className="px-4 py-3"><button type="button" onClick={() => setCustomerId(item.user.id)} title="View customer details" className="block max-w-[190px] truncate text-left text-[13px] font-medium text-ink hover:text-accent-strong hover:underline">{`${item.user.firstName} ${item.user.lastName}`.trim() || "Customer"}</button><span className="block max-w-[190px] truncate text-[11.5px] text-ink-muted" title={item.user.email}>{item.user.email}</span></td><td className="max-w-xs px-4 py-3"><p className="line-clamp-2 text-xs text-ink-muted">{item.reason}</p></td><td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">{new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td><td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(item.refundAmount ?? item.orderItem.subtotal)}</td><td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${statusTone[item.returnStatus]}`}>{item.returnStatus}</span></td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1.5"><button type="button" onClick={() => setOrderId(item.orderItem.order.id)} aria-label={`View order ${item.orderItem.order.orderNumber} details`} title="Order details" className={iconButton}><Eye className="h-4 w-4" /></button><button type="button" onClick={() => setCustomerId(item.user.id)} aria-label={`View customer ${item.user.email}`} title="Customer details" className={iconButton}><UserRound className="h-4 w-4" /></button>{item.returnStatus === "REQUESTED" ? <><button type="button" onClick={() => setAction({ type: "reject", target: item })} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Reject</button><button type="button" onClick={() => setAction({ type: "approve", target: item })} className="h-8 rounded-md bg-ink px-3 text-xs font-semibold text-white hover:bg-[#1d2939]">Approve</button></> : null}{item.returnStatus === "APPROVED" ? <button type="button" onClick={() => setAction({ type: "receive", target: item })} className="h-8 rounded-md bg-ink px-3 text-xs font-semibold text-white hover:bg-[#1d2939]">Mark received</button> : null}{item.returnStatus === "RECEIVED" ? <button type="button" onClick={() => setAction({ type: "refund", target: item })} className="h-8 rounded-md bg-ink px-3 text-xs font-semibold text-white hover:bg-[#1d2939]">Refund</button> : null}</div></td></tr>)}{!loading && !items.length ? <tr><td colSpan={8} className="h-40 text-center text-[13px] text-ink-muted">{filtered ? "No return requests match these filters." : "No return requests yet."}</td></tr> : null}</tbody></table></div>
  {meta && meta.total ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-ink-muted"><span>Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{meta.total}</strong></span><div className="flex items-center gap-3"><label className="flex items-center gap-2">Rows per page<select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className={fieldClass}>{PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><span>Page {meta.page} of {Math.max(meta.totalPages, 1)}</span><button type="button" disabled={meta.page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page" className={`${iconButton} disabled:opacity-40`}><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Next page" className={`${iconButton} disabled:opacity-40`}><ChevronRight className="h-4 w-4" /></button></div></div> : null}</section>
  <ActionDialog action={action} onClose={() => setAction(null)} onDone={reload} />
  {orderId ? <OrderDrawer id={orderId} onClose={() => setOrderId(null)} onStatus={(status) => void updateOrderStatus(orderId, status)} /> : null}
  {customerId ? <CustomerDrawer id={customerId} onClose={() => setCustomerId(null)} onChanged={() => void load()} /> : null}</div>;
}

function ActionDialog({ action, onClose, onDone }: { action: Action | null; onClose: () => void; onDone: () => Promise<void> }) {
  const titles: Record<Action["type"], string> = { approve: "Approve return", reject: "Reject return", receive: "Mark as received", refund: "Issue refund" };
  return <Dialog open={Boolean(action)} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{action ? titles[action.type] : ""}</DialogTitle><DialogDescription>{action ? `${action.target.orderItem.order.orderNumber} · ${action.target.orderItem.product.title}` : ""}</DialogDescription></DialogHeader>{action ? <ActionForm key={`${action.type}-${action.target.id}`} action={action} onClose={onClose} onDone={onDone} /> : null}</DialogContent></Dialog>;
}

function ActionForm({ action, onClose, onDone }: { action: Action; onClose: () => void; onDone: () => Promise<void> }) {
  const [pickupStatus, setPickupStatus] = useState<"PENDING" | "SCHEDULED" | "PICKED_UP">("PENDING"), [comment, setComment] = useState("");
  const [refundAmount, setRefundAmount] = useState(action.target.orderItem.subtotal), [saving, setSaving] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const endpoints: Record<Action["type"], { url: string; method: string; body?: unknown }> = {
      approve: { url: `/api/payments/returns/${action.target.id}/approve`, method: "PATCH", body: { pickupStatus } },
      reject: { url: `/api/payments/returns/${action.target.id}/reject`, method: "PATCH", body: { comment: comment.trim() || undefined } },
      receive: { url: `/api/payments/returns/${action.target.id}/receive`, method: "PATCH" },
      refund: { url: `/api/payments/returns/${action.target.id}/refund`, method: "POST", body: { refundAmount: Number(refundAmount) } },
    };
    const request = endpoints[action.type];
    try { const response = await fetch(request.url, { method: request.method, headers: request.body ? { "Content-Type": "application/json" } : undefined, body: request.body ? JSON.stringify(request.body) : undefined }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "The return could not be updated.")); onClose(); await onDone(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The return could not be updated."); } finally { setSaving(false); }
  }
  return <form onSubmit={(event) => void submit(event)}>{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  {action.type === "approve" ? <label className="text-[13px] font-semibold text-ink-secondary">Pickup status<select value={pickupStatus} onChange={(event) => setPickupStatus(event.target.value as typeof pickupStatus)} className={inputClass}><option value="PENDING">Pending</option><option value="SCHEDULED">Scheduled</option><option value="PICKED_UP">Picked up</option></select></label> : null}
  {action.type === "reject" ? <label className="text-[13px] font-semibold text-ink-secondary">Reason for the customer (optional)<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} className={`${inputClass} h-auto resize-y py-3`} /></label> : null}
  {action.type === "receive" ? <p className="text-[13px] text-ink-secondary">Confirm the returned item has arrived at the warehouse.</p> : null}
  {action.type === "refund" ? <label className="text-[13px] font-semibold text-ink-secondary">Refund amount<input type="number" min="0.01" step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} className={inputClass} /></label> : null}
  <DialogFooter className="mt-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Confirm</button></DialogFooter></form>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof RotateCcw; label: string; value: string; detail: string }) { return <div className="rounded-xl border border-border bg-surface p-4 shadow-card"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</p><p className="mt-0.5 truncate text-lg font-semibold text-ink">{value}</p></div></div><p className="mt-3 text-xs text-ink-muted">{detail}</p></div>; }
