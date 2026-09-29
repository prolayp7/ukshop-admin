"use client";

import { CURRENCY } from "@/lib/currency";
import { DatePicker } from "@/components/ui/date-picker";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, Search, X } from "lucide-react";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DrawerContent } from "@/components/ui/dialog";
import { OrderDrawer, type OrderStatus } from "@/components/orders/orders-page";
import { CustomerDrawer } from "@/components/customers/customers-page";

export type ReturnStatus = "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURN_REJECTED" | "PICKUP_SCHEDULED" | "PICKED_UP" | "RETURN_RECEIVED" | "INSPECTION" | "REFUND_APPROVED" | "REFUND_PROCESSING" | "COMPLETED" | "CANCELLED";
type Person = { id: number; email: string; firstName: string; lastName: string; phone?: string | null };
type ReturnRow = { id: number; returnNumber: string; status: ReturnStatus; createdAt: string; order: { id: number; orderNumber: string }; user: Person; itemCount: number; unitCount: number; refundAmount: number };
type Address = { fullName: string; line1: string; line2: string | null; city: string; county: string | null; postcode: string; phone: string | null };
type Condition = "NEW" | "OPENED" | "USED" | "DAMAGED" | "DEFECTIVE" | "MISSING_PARTS";
type Result = "ACCEPTED" | "PARTIALLY_ACCEPTED" | "REJECTED";
type ReturnItem = {
  id: number; title: string; variant: string | null; sku: string | null; orderedQuantity: number; previouslyReturned: number;
  quantity: number; approvedQuantity: number | null; receivedQuantity: number | null; acceptedQuantity: number | null;
  reasonLabel: string; reasonOther: string | null; description: string | null; returnDeadline: string | null;
  condition: Condition | null; accessoriesPresent: boolean | null; inspectionNotes: string | null; inspectionResult: Result | null; inspectionRejectionReason: string | null;
  refundAmount: number | null; deductionAmount: number; deductionReason: string | null; customerImages: number[]; inspectionImages: number[];
};
type ReturnDetail = {
  id: number; returnNumber: string; status: ReturnStatus; createdAt: string; rejectionReason: string | null; customer: Person;
  order: { id: number; orderNumber: string; status: string; placedAt: string | null; total: number; payment: { provider: string; transactionId: string; amount: number } | null };
  pickupAddress: Address; pickup: { courier: string | null; date: string | null; window: string | null; trackingNumber: string | null; notes: string | null };
  items: ReturnItem[];
  calculation: { lines: { returnItemId: number; title: string; units: number; unitPrice: number; beforeDeduction: number; deduction: number; refund: number; final: boolean }[]; itemsTotal: number; shipping: number; total: number; method: string | null };
  refunds: { id: number; amount: number; status: string; attempt: number; providerRefundId: string | null; failureReason: string | null; processedAt: string | null; createdAt: string; provider: string }[];
  events: { id: number; status: ReturnStatus | null; action: string; note: string | null; actorType: string; createdAt: string }[];
};
type Meta = { page: number; perPage: number; total: number; totalPages: number; summary?: Partial<Record<ReturnStatus, number>> };

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = { RETURN_REQUESTED: "Requested", RETURN_APPROVED: "Approved", RETURN_REJECTED: "Rejected", PICKUP_SCHEDULED: "Pickup scheduled", PICKED_UP: "Picked up", RETURN_RECEIVED: "Received", INSPECTION: "Inspection", REFUND_APPROVED: "Refund approved", REFUND_PROCESSING: "Refund processing", COMPLETED: "Completed", CANCELLED: "Cancelled" };
const TABS: ReturnStatus[] = ["RETURN_REQUESTED", "RETURN_APPROVED", "PICKUP_SCHEDULED", "PICKED_UP", "RETURN_RECEIVED", "INSPECTION", "REFUND_APPROVED", "REFUND_PROCESSING", "COMPLETED", "RETURN_REJECTED", "CANCELLED"];
const CONDITIONS: Record<Condition, string> = { NEW: "New / unopened", OPENED: "Opened, as new", USED: "Used", DAMAGED: "Damaged", DEFECTIVE: "Defective", MISSING_PARTS: "Missing parts" };
const RESULTS: Record<Result, string> = { ACCEPTED: "Accepted", PARTIALLY_ACCEPTED: "Partially accepted", REJECTED: "Rejected" };

export function statusTone(status: ReturnStatus) {
  if (status === "COMPLETED") return "bg-positive-tint text-positive-tint-ink";
  if (status === "RETURN_REJECTED") return "bg-danger-tint text-danger-tint-ink";
  if (status === "RETURN_REQUESTED" || status === "REFUND_APPROVED") return "bg-accent-tint text-accent-tint-ink";
  return "bg-neutral-tint text-ink-muted";
}
export function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
export function money(amount: number | string) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(Number(amount)); }
const dateTime = (value: string) => new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const customerName = (person: Person) => `${person.firstName} ${person.lastName}`.trim() || person.email;

const PER_PAGE_OPTIONS = [20, 50, 100] as const;
const fieldClass = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-accent-strong";
const inputClass = "mt-1.5 h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "block text-xs font-semibold text-ink-secondary";
const primary = "inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white hover:bg-[#1d2939] disabled:opacity-50";
const secondary = "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-4 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50";
const iconButton = "flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint";
const emptyFilters = { q: "", dateFrom: "", dateTo: "" };

export function ReturnsListing() {
  const initialStatus = useSearchParams().get("status") ?? "";
  const [items, setItems] = useState<ReturnRow[]>([]), [meta, setMeta] = useState<Meta | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [status, setStatus] = useState(initialStatus), [filters, setFilters] = useState(emptyFilters), [search, setSearch] = useState("");
  const [page, setPage] = useState(1), [perPage, setPerPage] = useState<number>(20);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(filters.q.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [filters.q]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    try {
      const response = await fetch(`/api/payments/returns?${params}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "Returns could not be loaded."));
      setItems(payload.data ?? []); setMeta(payload.meta);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Returns could not be loaded."); } finally { setLoading(false); }
  }, [page, perPage, search, status, filters.dateFrom, filters.dateTo]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const counts = meta?.summary ?? {};
  const allCount = Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0);
  const filtered = Boolean(search || filters.dateFrom || filters.dateTo);
  const from = meta && meta.total ? (meta.page - 1) * meta.perPage + 1 : 0;
  const to = meta ? Math.min(meta.page * meta.perPage, meta.total) : 0;
  const tab = (value: string, label: string, count: number) => <button key={value || "all"} type="button" onClick={() => { setStatus(value); setPage(1); }} aria-pressed={status === value} className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold ${status === value ? "bg-ink text-white" : "text-ink-secondary hover:bg-neutral-tint"}`}>{label}<span className={`rounded-full px-1.5 text-[10.5px] ${status === value ? "bg-white/20" : "bg-neutral-tint text-ink-muted"}`}>{count}</span></button>;

  return <div className="w-full"><nav className="flex items-center gap-1.5 text-xs text-ink-muted"><span>Sales</span><ChevronRight className="h-3.5 w-3.5" /><span>Returns</span></nav><h1 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-ink">Returns &amp; refunds</h1><p className="mt-1 text-[13.5px] text-ink-muted">Review return requests, arrange collection, inspect what comes back and send the refund.</p>
    {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
    <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1.5 shadow-card">{tab("", "All", allCount)}{TABS.map((value) => tab(value, RETURN_STATUS_LABEL[value], counts[value] ?? 0))}</div>
    <div className="mt-3 flex flex-wrap items-end gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-card">
      <label className="relative min-w-[240px] flex-1"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Return number, order number, product, customer name or email" className={`${fieldClass} w-full pl-8`} /></label>
      <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">From<DatePicker type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(value) => { setFilters((current) => ({ ...current, dateFrom: value })); setPage(1); }} className={`${fieldClass} mt-1 block`} /></label>
      <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">To<DatePicker type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(value) => { setFilters((current) => ({ ...current, dateTo: value })); setPage(1); }} className={`${fieldClass} mt-1 block`} /></label>
      {filtered ? <button type="button" onClick={() => { setFilters(emptyFilters); setSearch(""); setPage(1); }} className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint"><X className="h-4 w-4" />Clear</button> : null}
    </div>
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Return</th><th className="px-4 py-3 font-semibold">Order</th><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">Items</th><th className="px-4 py-3 font-semibold">Requested</th><th className="px-4 py-3 text-right font-semibold">Refund</th><th className="px-4 py-3 text-center font-semibold">Status</th></tr></thead>
      <tbody className="divide-y divide-border">{loading ? <tr><td colSpan={7} className="h-40 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr> : items.map((row) => <tr key={row.id} onClick={() => setOpenId(row.id)} className="cursor-pointer hover:bg-canvas">
        <td className="px-4 py-3"><button type="button" className="text-[13px] font-semibold text-ink hover:text-accent-strong hover:underline">{row.returnNumber}</button></td>
        <td className="px-4 py-3 text-xs text-ink-secondary">{row.order.orderNumber}</td>
        <td className="px-4 py-3"><span className="block max-w-[200px] truncate text-[13px] font-medium text-ink">{customerName(row.user)}</span><span className="block max-w-[200px] truncate text-[11.5px] text-ink-muted">{row.user.email}</span></td>
        <td className="px-4 py-3 text-xs text-ink-secondary">{row.itemCount} {row.itemCount === 1 ? "product" : "products"} · {row.unitCount} {row.unitCount === 1 ? "unit" : "units"}</td>
        <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">{new Date(row.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
        <td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(row.refundAmount)}</td>
        <td className="px-4 py-3 text-center"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${statusTone(row.status)}`}>{RETURN_STATUS_LABEL[row.status]}</span></td>
      </tr>)}{!loading && !items.length ? <tr><td colSpan={7} className="h-40 text-center text-[13px] text-ink-muted">{filtered || status ? "No returns match these filters." : "No return requests yet."}</td></tr> : null}</tbody></table></div>
      {meta && meta.total ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-ink-muted"><span>Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{meta.total}</strong></span><div className="flex items-center gap-3"><label className="flex items-center gap-2">Rows per page<select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className={fieldClass}>{PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><span>Page {meta.page} of {Math.max(meta.totalPages, 1)}</span><button type="button" disabled={meta.page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page" className={`${iconButton} disabled:opacity-40`}><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Next page" className={`${iconButton} disabled:opacity-40`}><ChevronRight className="h-4 w-4" /></button></div></div> : null}
    </section>
    {openId ? <ReturnDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => void load()} /> : null}
  </div>;
}

/** The whole return: what the customer asked for, evidence, the next workflow action, the refund calculation and the audit trail. */
export function ReturnDrawer({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<ReturnDetail | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null), [customerId, setCustomerId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await fetch(`/api/payments/returns/${id}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "The return could not be loaded."));
      setDetail(payload.data);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "The return could not be loaded."); }
  }, [id]);
  useEffect(() => { const timer = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(timer); }, [reload]);

  /** Every workflow endpoint answers with the updated return. */
  async function act(path: string, body?: unknown): Promise<boolean> {
    setBusy(true); setError("");
    try {
      const isForm = body instanceof FormData;
      const response = await fetch(`/api/payments/returns/${id}/${path}`, { method: "POST", headers: body && !isForm ? { "Content-Type": "application/json" } : undefined, body: isForm ? body : body ? JSON.stringify(body) : undefined });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { await reload(); throw new Error(apiMessage(payload, "The return could not be updated.")); }
      setDetail(payload.data); onChanged(); return true;
    } catch (actError) { setError(actError instanceof Error ? actError.message : "The return could not be updated."); onChanged(); return false; } finally { setBusy(false); }
  }

  async function updateOrderStatus(orderIdToUpdate: number, toStatus: OrderStatus) {
    const response = await fetch(`/api/orders/${orderIdToUpdate}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toStatus }) });
    if (!response.ok) setError(apiMessage(await response.json().catch(() => ({})), "The order status could not be updated."));
    setOrderId(null); await reload();
  }

  const section = "rounded-lg border border-border bg-surface p-4";
  const heading = "mb-3 text-[13px] font-semibold text-ink";
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="max-w-3xl">
    <DialogHeader className="border-b border-border px-5 py-4 pr-12"><DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-ink">Return {detail?.returnNumber ?? ""}{detail ? <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${statusTone(detail.status)}`}>{RETURN_STATUS_LABEL[detail.status]}</span> : null}</DialogTitle>
      <DialogDescription className="text-xs text-ink-muted">{detail ? <>Order <button type="button" onClick={() => setOrderId(detail.order.id)} className="font-semibold text-ink-secondary underline underline-offset-2">{detail.order.orderNumber}</button> · <button type="button" onClick={() => setCustomerId(detail.customer.id)} className="font-semibold text-ink-secondary underline underline-offset-2">{customerName(detail.customer)}</button> · requested {dateTime(detail.createdAt)}</> : "Loading…"}</DialogDescription></DialogHeader>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-canvas px-5 py-5">
      {error ? <div role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
      {!detail ? (error ? null : <LoaderCircle className="mx-auto mt-10 h-5 w-5 animate-spin text-ink-muted" />) : <>
        <NextStep detail={detail} busy={busy} act={act} />

        <section className={section}><h3 className={heading}>Returned items</h3><div className="divide-y divide-border">{detail.items.map((item) => <div key={item.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[13px] font-semibold text-ink">{item.title}</p><p className="text-xs text-ink-muted">{[item.variant, item.sku].filter(Boolean).join(" · ")}</p></div>{item.refundAmount !== null ? <span className="text-[13px] font-semibold text-ink">{money(item.refundAmount)}</span> : null}</div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">{([["Ordered", item.orderedQuantity], ["Returned before", item.previouslyReturned], ["Requested", item.quantity], ["Approved", item.approvedQuantity], ["Received", item.receivedQuantity], ["Accepted", item.acceptedQuantity]] as const).map(([label, value]) => <div key={label}><dt className="text-ink-muted">{label}</dt><dd className="font-semibold text-ink">{value ?? "—"}</dd></div>)}<div className="col-span-2"><dt className="text-ink-muted">Return window</dt><dd className="font-semibold text-ink">{item.returnDeadline ? `Until ${new Date(item.returnDeadline).toLocaleDateString("en-GB")}` : "—"}</dd></div></dl>
          <p className="mt-2 text-xs text-ink-secondary"><strong>Reason:</strong> {item.reasonOther ? `${item.reasonLabel} – ${item.reasonOther}` : item.reasonLabel}</p>
          {item.description ? <p className="mt-1 whitespace-pre-line text-xs text-ink-secondary"><strong>Customer notes:</strong> {item.description}</p> : null}
          <Photos returnId={detail.id} ids={item.customerImages} label="Customer photos" empty="No photos from the customer." />
          {item.inspectionResult ? <div className="mt-2 rounded-md bg-canvas p-2.5 text-xs text-ink-secondary"><strong>Inspection:</strong> {RESULTS[item.inspectionResult]} · {item.condition ? CONDITIONS[item.condition] : "—"} · accessories {item.accessoriesPresent ? "present" : "missing"}{item.inspectionRejectionReason ? <> · {item.inspectionRejectionReason}</> : null}{item.deductionAmount > 0 ? <> · deduction {money(item.deductionAmount)} ({item.deductionReason})</> : null}{item.inspectionNotes ? <span className="mt-1 block whitespace-pre-line">{item.inspectionNotes}</span> : null}</div> : null}
          {item.inspectionImages.length || detail.status === "INSPECTION" || detail.status === "RETURN_RECEIVED" ? <Photos returnId={detail.id} ids={item.inspectionImages} label="Inspection photos" empty="No inspection photos yet." upload={detail.status === "INSPECTION" || detail.status === "RETURN_RECEIVED" ? (files) => { const form = new FormData(); files.forEach((file) => form.append("images", file)); return act(`items/${item.id}/images`, form); } : undefined} busy={busy} /> : null}
          {detail.status === "INSPECTION" && (item.receivedQuantity ?? 0) > 0 ? <InspectionForm key={`${item.id}-${item.inspectionResult}`} item={item} busy={busy} onSubmit={(body) => act(`items/${item.id}/inspection`, body)} /> : null}
        </div>)}</div></section>

        <section className={section}><h3 className={heading}>Refund calculation</h3>
          <table className="w-full text-xs"><thead className="text-ink-muted"><tr><th className="pb-1.5 text-left font-medium">Item</th><th className="pb-1.5 text-right font-medium">Units × paid</th><th className="pb-1.5 text-right font-medium">Deduction</th><th className="pb-1.5 text-right font-medium">Refund</th></tr></thead><tbody className="divide-y divide-border">{detail.calculation.lines.map((line) => <tr key={line.returnItemId}><td className="py-1.5 text-ink-secondary">{line.title}{line.final ? "" : <span className="text-ink-muted"> (estimate)</span>}</td><td className="py-1.5 text-right">{line.units} × {money(line.unitPrice)}</td><td className="py-1.5 text-right">{line.deduction ? `−${money(line.deduction)}` : "—"}</td><td className="py-1.5 text-right font-semibold text-ink">{money(line.refund)}</td></tr>)}
            <tr><td className="py-1.5 text-ink-secondary" colSpan={3}>Delivery {detail.calculation.shipping ? "(whole order returned)" : "(refunded only when the whole order is returned)"}</td><td className="py-1.5 text-right">{money(detail.calculation.shipping)}</td></tr>
            <tr><td className="pt-2 font-semibold text-ink" colSpan={3}>Total to refund{detail.calculation.method ? ` to ${detail.calculation.method}` : ""}</td><td className="pt-2 text-right text-[13px] font-semibold text-ink">{money(detail.calculation.total)}</td></tr></tbody></table>
          <p className="mt-2 text-[11.5px] text-ink-muted">Calculated by the server from the price actually paid per unit, after discounts and coupons. {detail.order.payment ? `Captured ${money(detail.order.payment.amount)} via ${detail.order.payment.provider} (${detail.order.payment.transactionId}).` : "No captured payment on this order."}</p>
          {detail.refunds.length ? <div className="mt-3 divide-y divide-border rounded-md border border-border">{detail.refunds.map((refund) => <div key={refund.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"><span className="text-ink-secondary">Attempt {refund.attempt} · {refund.provider}{refund.providerRefundId ? ` · ${refund.providerRefundId}` : ""}{refund.failureReason ? <span className="block text-danger-tint-ink">{refund.failureReason}</span> : null}</span><span className="flex items-center gap-2"><strong className="text-ink">{money(refund.amount)}</strong><span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${refund.status === "PROCESSED" ? "bg-positive-tint text-positive-tint-ink" : refund.status === "FAILED" ? "bg-danger-tint text-danger-tint-ink" : "bg-neutral-tint text-ink-muted"}`}>{refund.status === "PROCESSED" ? "Successful" : refund.status.charAt(0) + refund.status.slice(1).toLowerCase()}</span></span></div>)}</div> : null}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className={section}><h3 className={heading}>Collect from</h3><p className="text-xs leading-relaxed text-ink-secondary">{[detail.pickupAddress.fullName, detail.pickupAddress.line1, detail.pickupAddress.line2, detail.pickupAddress.city, detail.pickupAddress.county, detail.pickupAddress.postcode].filter(Boolean).join(", ")}{detail.pickupAddress.phone ? <span className="block">{detail.pickupAddress.phone}</span> : null}</p></section>
          <section className={section}><h3 className={heading}>Pickup</h3>{detail.pickup.courier ? <p className="text-xs leading-relaxed text-ink-secondary">{detail.pickup.courier}{detail.pickup.date ? ` · ${new Date(detail.pickup.date).toLocaleDateString("en-GB", { timeZone: "UTC" })}` : ""}{detail.pickup.window ? ` · ${detail.pickup.window}` : ""}{detail.pickup.trackingNumber ? <span className="block">Tracking {detail.pickup.trackingNumber}</span> : null}{detail.pickup.notes ? <span className="block">{detail.pickup.notes}</span> : null}</p> : <p className="text-xs text-ink-muted">Not scheduled yet.</p>}</section>
        </div>

        <section className={section}><h3 className={heading}>History</h3><ol className="space-y-2.5">{[...detail.events].reverse().map((event) => <li key={event.id} className="text-xs"><div className="flex flex-wrap items-baseline gap-x-2"><strong className="text-ink">{event.status ? RETURN_STATUS_LABEL[event.status] : event.action.replace(/[._]/g, " ")}</strong><span className="text-ink-muted">{dateTime(event.createdAt)} · {event.actorType.toLowerCase()}</span></div>{event.note ? <p className="mt-0.5 whitespace-pre-line text-ink-secondary">{event.note}</p> : null}</li>)}</ol></section>
      </>}
    </div>
    {orderId ? <OrderDrawer id={orderId} onClose={() => setOrderId(null)} onStatus={(next) => void updateOrderStatus(orderId, next)} /> : null}
    {customerId ? <CustomerDrawer id={customerId} onClose={() => setCustomerId(null)} onChanged={() => undefined} /> : null}
  </DrawerContent></Dialog>;
}

/** The action(s) valid for the current status. */
function NextStep({ detail, busy, act }: { detail: ReturnDetail; busy: boolean; act: (path: string, body?: unknown) => Promise<boolean> }) {
  const [mode, setMode] = useState<"" | "reject" | "pickup" | "receive">("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [note, setNote] = useState(""), [reason, setReason] = useState("");
  const [pickup, setPickup] = useState({ courier: detail.pickup.courier ?? "", pickupDate: detail.pickup.date?.slice(0, 10) ?? "", pickupWindow: detail.pickup.window ?? "", trackingNumber: detail.pickup.trackingNumber ?? "", notes: detail.pickup.notes ?? "" });
  const status = detail.status;
  const box = "rounded-lg border border-accent-tint-border bg-accent-tint/40 p-4";
  const qty = (item: ReturnItem, fallback: number) => quantities[item.id] ?? fallback;
  const quantityRows = (max: (item: ReturnItem) => number, label: string) => <div className="mt-3 space-y-2">{detail.items.map((item) => <label key={item.id} className="flex items-center justify-between gap-3 text-xs text-ink-secondary"><span>{item.title} <span className="text-ink-muted">({label} {max(item)})</span></span><input type="number" min={0} max={max(item)} value={qty(item, max(item))} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.max(0, Math.min(max(item), Number(event.target.value) || 0)) }))} className={`${fieldClass} w-20 text-right`} /></label>)}</div>;
  const itemsBody = (max: (item: ReturnItem) => number) => ({ items: detail.items.map((item) => ({ returnItemId: item.id, quantity: qty(item, max(item)) })) });
  const done = (ok: boolean) => { if (ok) { setMode(""); setQuantities({}); } };

  const receiveForm = <>{quantityRows((item) => item.approvedQuantity ?? 0, "approved")}<div className="mt-3 flex justify-end gap-2">{status === "PICKUP_SCHEDULED" ? <button type="button" onClick={() => setMode("")} className={secondary}>Back</button> : null}<button type="button" disabled={busy} onClick={() => void act("receive", itemsBody((item) => item.approvedQuantity ?? 0)).then(done)} className={primary}>Confirm received</button></div></>;
  const rejectForm = <form onSubmit={(event: FormEvent) => { event.preventDefault(); void act("reject", { reason: reason.trim() }).then(done); }} className="mt-3"><label className={labelClass}>Reason shown to the customer<textarea required minLength={10} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className={`${inputClass} h-auto resize-y py-2`} /></label><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setMode("")} className={secondary}>Back</button><button disabled={busy || reason.trim().length < 10} className={`${primary} bg-danger hover:bg-danger`}>Reject return</button></div></form>;
  const pickupForm = <form onSubmit={(event: FormEvent) => { event.preventDefault(); void act("pickup", { ...pickup, pickupWindow: pickup.pickupWindow || undefined, trackingNumber: pickup.trackingNumber || undefined, notes: pickup.notes || undefined }).then(done); }} className="mt-3 grid gap-3 sm:grid-cols-2">
    <label className={labelClass}>Courier<input required minLength={2} value={pickup.courier} onChange={(event) => setPickup({ ...pickup, courier: event.target.value })} placeholder="e.g. DPD" className={inputClass} /></label>
    <label className={labelClass}>Pickup date<input required type="date" value={pickup.pickupDate} onChange={(event) => setPickup({ ...pickup, pickupDate: event.target.value })} className={inputClass} /></label>
    <label className={labelClass}>Time window<input value={pickup.pickupWindow} onChange={(event) => setPickup({ ...pickup, pickupWindow: event.target.value })} placeholder="e.g. 9am – 1pm" className={inputClass} /></label>
    <label className={labelClass}>Tracking number<input value={pickup.trackingNumber} onChange={(event) => setPickup({ ...pickup, trackingNumber: event.target.value })} className={inputClass} /></label>
    <label className={`${labelClass} sm:col-span-2`}>Notes for the courier<input value={pickup.notes} onChange={(event) => setPickup({ ...pickup, notes: event.target.value })} className={inputClass} /></label>
    <div className="flex justify-end gap-2 sm:col-span-2">{status === "PICKUP_SCHEDULED" ? <button type="button" onClick={() => setMode("")} className={secondary}>Back</button> : null}<button disabled={busy} className={primary}>{status === "PICKUP_SCHEDULED" ? "Reschedule pickup" : "Schedule pickup"}</button></div></form>;

  if (status === "RETURN_REQUESTED") return <section className={box}><h3 className="text-[13px] font-semibold text-ink">Review the request</h3><p className="mt-1 text-xs text-ink-secondary">Check the reason and photos, then approve the quantities you will accept back, or reject with a reason.</p>
    {mode === "reject" ? rejectForm : <>{quantityRows((item) => item.quantity, "requested")}<label className={`${labelClass} mt-3`}>Internal note (optional)<input value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} /></label><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setMode("reject")} className={secondary}>Reject</button><button type="button" disabled={busy} onClick={() => void act("approve", { ...itemsBody((item) => item.quantity), note: note.trim() || undefined }).then(done)} className={primary}>Approve return</button></div></>}</section>;
  if (status === "RETURN_APPROVED") return <section className={box}><h3 className="text-[13px] font-semibold text-ink">Schedule the collection</h3>{mode === "reject" ? rejectForm : <>{pickupForm}<button type="button" onClick={() => setMode("reject")} className="mt-2 text-xs font-semibold text-danger-tint-ink underline">Reject instead</button></>}</section>;
  if (status === "PICKUP_SCHEDULED") return <section className={box}><h3 className="text-[13px] font-semibold text-ink">Waiting for the courier</h3>
    {mode === "pickup" ? pickupForm : mode === "reject" ? rejectForm : mode === "receive" ? receiveForm : <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setMode("reject")} className={secondary}>Reject</button><button type="button" onClick={() => setMode("pickup")} className={secondary}>Reschedule</button><button type="button" onClick={() => setMode("receive")} className={secondary}>Mark received</button><button type="button" disabled={busy} onClick={() => void act("picked-up")} className={primary}>Mark picked up</button></div>}</section>;
  if (status === "PICKED_UP") return <section className={box}><h3 className="text-[13px] font-semibold text-ink">Record what arrived</h3>{receiveForm}</section>;
  if (status === "RETURN_RECEIVED") return <section className={box}><h3 className="text-[13px] font-semibold text-ink">Items received</h3><p className="mt-1 text-xs text-ink-secondary">Start the inspection to record the condition of each item.</p><div className="mt-3 flex justify-end"><button type="button" disabled={busy} onClick={() => void act("inspection")} className={primary}>Start inspection</button></div></section>;
  if (status === "INSPECTION") {
    const pending = detail.items.filter((item) => (item.receivedQuantity ?? 0) > 0 && !item.inspectionResult);
    return <section className={box}><h3 className="text-[13px] font-semibold text-ink">Inspection</h3><p className="mt-1 text-xs text-ink-secondary">{pending.length ? `Record the inspection for each received item below (${pending.length} left).` : `All items inspected. Approving sends ${money(detail.calculation.total)} to the original payment method.`}</p><div className="mt-3 flex justify-end"><button type="button" disabled={busy || pending.length > 0} onClick={() => { if (window.confirm(`Approve and send a refund of ${money(detail.calculation.total)}?`)) void act("refund"); }} className={primary}>Approve refund</button></div></section>;
  }
  if (status === "REFUND_APPROVED") return <section className={box}><h3 className="text-[13px] font-semibold text-ink">Refund not sent</h3><p className="mt-1 text-xs text-ink-secondary">The last refund attempt failed. Check the reason under Refund calculation, then try again.</p><div className="mt-3 flex justify-end"><button type="button" disabled={busy} onClick={() => void act("refund/retry")} className={primary}>Retry refund</button></div></section>;
  if (status === "REFUND_PROCESSING") return <section className={box}><h3 className="text-[13px] font-semibold text-ink">Waiting for the payment provider</h3><p className="mt-1 text-xs text-ink-secondary">The refund completes once the gateway confirms it.</p></section>;
  if (status === "RETURN_REJECTED") return <section className="rounded-lg border border-danger-tint-border bg-danger-tint p-4 text-xs text-danger-tint-ink"><strong>Rejected.</strong> {detail.rejectionReason}</section>;
  return null;
}

function InspectionForm({ item, busy, onSubmit }: { item: ReturnItem; busy: boolean; onSubmit: (body: unknown) => Promise<boolean> }) {
  const received = item.receivedQuantity ?? 0;
  const [form, setForm] = useState({ condition: item.condition ?? "OPENED", accessoriesPresent: item.accessoriesPresent ?? true, result: item.inspectionResult ?? "ACCEPTED", acceptedQuantity: String(item.acceptedQuantity ?? Math.max(1, received - 1)), rejectionReason: item.inspectionRejectionReason ?? "", deductionAmount: item.deductionAmount ? String(item.deductionAmount) : "", deductionReason: item.deductionReason ?? "", notes: item.inspectionNotes ?? "" });
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  function submit(event: FormEvent) {
    event.preventDefault();
    const deduction = form.result === "REJECTED" ? 0 : Number(form.deductionAmount) || 0;
    void onSubmit({ condition: form.condition, accessoriesPresent: form.accessoriesPresent, result: form.result, notes: form.notes.trim() || undefined, acceptedQuantity: form.result === "PARTIALLY_ACCEPTED" ? Number(form.acceptedQuantity) : undefined, rejectionReason: form.result === "REJECTED" ? form.rejectionReason.trim() : undefined, deductionAmount: deduction || undefined, deductionReason: deduction ? form.deductionReason.trim() : undefined });
  }
  return <form onSubmit={submit} className="mt-3 grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
    <p className="text-xs font-semibold text-ink sm:col-span-2">{item.inspectionResult ? "Update inspection" : "Record inspection"} ({received} received)</p>
    <label className={labelClass}>Condition<select value={form.condition} onChange={(event) => set({ condition: event.target.value as Condition })} className={inputClass}>{Object.entries(CONDITIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className={labelClass}>Result<select value={form.result} onChange={(event) => set({ result: event.target.value as Result })} className={inputClass}>{Object.entries(RESULTS).filter(([value]) => value !== "PARTIALLY_ACCEPTED" || received > 1).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="flex items-center gap-2 text-xs font-semibold text-ink-secondary sm:col-span-2"><input type="checkbox" checked={form.accessoriesPresent} onChange={(event) => set({ accessoriesPresent: event.target.checked })} />All accessories and packaging present</label>
    {form.result === "PARTIALLY_ACCEPTED" ? <label className={labelClass}>Units accepted<input required type="number" min={1} max={received - 1} value={form.acceptedQuantity} onChange={(event) => set({ acceptedQuantity: event.target.value })} className={inputClass} /></label> : null}
    {form.result === "REJECTED" ? <label className={`${labelClass} sm:col-span-2`}>Reason for rejecting (shown to the customer)<input required value={form.rejectionReason} onChange={(event) => set({ rejectionReason: event.target.value })} className={inputClass} /></label> : <>
      <label className={labelClass}>Deduction (optional)<input type="number" min={0} step="0.01" value={form.deductionAmount} onChange={(event) => set({ deductionAmount: event.target.value })} placeholder="0.00" className={inputClass} /></label>
      <label className={labelClass}>Deduction reason<input required={Number(form.deductionAmount) > 0} value={form.deductionReason} onChange={(event) => set({ deductionReason: event.target.value })} placeholder="e.g. Missing charger" className={inputClass} /></label></>}
    <label className={`${labelClass} sm:col-span-2`}>Inspection notes (internal)<textarea value={form.notes} onChange={(event) => set({ notes: event.target.value })} rows={2} className={`${inputClass} h-auto resize-y py-2`} /></label>
    <div className="flex justify-end sm:col-span-2"><button disabled={busy} className={primary}>Save inspection</button></div>
  </form>;
}

/** Private images, streamed through the authenticated proxy; click opens full size. */
function Photos({ returnId, ids, label, empty, upload, busy }: { returnId: number; ids: number[]; label: string; empty: string; upload?: (files: File[]) => Promise<boolean>; busy?: boolean }) {
  return <div className="mt-2"><p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</p><div className="mt-1.5 flex flex-wrap gap-2">
    {ids.map((imageId) => { const src = `/api/payments/returns/${returnId}/images/${imageId}`; return <a key={imageId} href={src} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-md border border-border bg-canvas hover:ring-2 hover:ring-accent">
      {/* eslint-disable-next-line @next/next/no-img-element -- private image behind the auth proxy */}
      <img src={src} alt={label} className="h-full w-full object-cover" /></a>; })}
    {upload ? <label className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong text-[10.5px] text-ink-muted hover:bg-neutral-tint ${busy ? "pointer-events-none opacity-50" : ""}`}><ImagePlus className="h-4 w-4" />Add photos<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; if (files.length) void upload(files); }} /></label> : null}
    {!ids.length && !upload ? <span className="text-xs text-ink-muted">{empty}</span> : null}
  </div></div>;
}
