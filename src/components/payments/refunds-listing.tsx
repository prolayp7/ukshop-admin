"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, LoaderCircle, Search } from "lucide-react";
import { ReturnDrawer, apiMessage, money } from "@/components/payments/returns-listing";

type RefundStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED" | "CANCELLED";
type Refund = {
  id: number; amount: string; status: RefundStatus; reason: string | null; attempt: number; providerRefundId: string | null; failureReason: string | null; processedAt: string | null; createdAt: string;
  order: { id: number; orderNumber: string; email: string }; returnRequest: { id: number; returnNumber: string } | null; transaction: { provider: string; providerTransactionId: string };
};
type Meta = { page: number; perPage: number; total: number; totalPages: number; summary?: Partial<Record<RefundStatus, { count: number; amount: number }>> };

const STATUSES: { value: RefundStatus; label: string; tone: string }[] = [
  { value: "PROCESSED", label: "Successful", tone: "bg-positive-tint text-positive-tint-ink" },
  { value: "PROCESSING", label: "Processing", tone: "bg-accent-tint text-accent-tint-ink" },
  { value: "PENDING", label: "Pending", tone: "bg-neutral-tint text-ink-muted" },
  { value: "FAILED", label: "Failed", tone: "bg-danger-tint text-danger-tint-ink" },
  { value: "CANCELLED", label: "Cancelled", tone: "bg-neutral-tint text-ink-muted" },
];
const fieldClass = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-accent-strong";
const iconButton = "flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint disabled:opacity-40";

/** Every refund sent to a payment provider (returns and whole-order refunds), with its gateway outcome. */
export function RefundsListing() {
  const [items, setItems] = useState<Refund[]>([]), [meta, setMeta] = useState<Meta | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [status, setStatus] = useState(""), [q, setQ] = useState(""), [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [returnId, setReturnId] = useState<number | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(q.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [q]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), perPage: "20" });
    if (status) params.set("status", status);
    if (search) params.set("q", search);
    try {
      const response = await fetch(`/api/payments/refunds?${params}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "Refunds could not be loaded."));
      setItems(payload.data ?? []); setMeta(payload.meta);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Refunds could not be loaded."); } finally { setLoading(false); }
  }, [page, status, search]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const summary = meta?.summary ?? {};
  const tab = (value: string, label: string, count: number) => <button key={value || "all"} type="button" onClick={() => { setStatus(value); setPage(1); }} aria-pressed={status === value} className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold ${status === value ? "bg-ink text-white" : "text-ink-secondary hover:bg-neutral-tint"}`}>{label}<span className={`rounded-full px-1.5 text-[10.5px] ${status === value ? "bg-white/20" : "bg-neutral-tint text-ink-muted"}`}>{count}</span></button>;

  return <div className="w-full"><nav className="flex items-center gap-1.5 text-xs text-ink-muted"><span>Sales</span><ChevronRight className="h-3.5 w-3.5" /><span>Refunds</span></nav><h1 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-ink">Refunds</h1><p className="mt-1 text-[13.5px] text-ink-muted">A refund counts as successful only once the payment provider confirms it.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">{[STATUSES[0], STATUSES[1], STATUSES[3]].map(({ value, label }) => <div key={value} className="rounded-xl border border-border bg-surface p-4 shadow-card"><p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</p><p className="mt-1 text-lg font-semibold text-ink">{money(summary[value]?.amount ?? 0)}</p><p className="text-xs text-ink-muted">{summary[value]?.count ?? 0} refunds</p></div>)}</div>
    {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
    <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-1.5 shadow-card">
      <div className="flex gap-1 overflow-x-auto">{tab("", "All", Object.values(summary).reduce((sum, row) => sum + (row?.count ?? 0), 0))}{STATUSES.map(({ value, label }) => tab(value, label, summary[value]?.count ?? 0))}</div>
      <label className="relative ml-auto min-w-60 flex-1 sm:max-w-sm"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Order, return, refund ID or email" className={`${fieldClass} w-full pl-8`} /></label>
    </div>
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Created</th><th className="px-4 py-3 font-semibold">Order</th><th className="px-4 py-3 font-semibold">Return</th><th className="px-4 py-3 font-semibold">Provider</th><th className="px-4 py-3 text-right font-semibold">Amount</th><th className="px-4 py-3 text-center font-semibold">Status</th></tr></thead>
      <tbody className="divide-y divide-border">{loading ? <tr><td colSpan={6} className="h-40 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr> : items.map((refund) => { const tone = STATUSES.find((entry) => entry.value === refund.status)!; return <tr key={refund.id} className="hover:bg-canvas">
        <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">{new Date(refund.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
        <td className="px-4 py-3"><span className="block text-[13px] font-semibold text-ink">{refund.order.orderNumber}</span><span className="block text-[11.5px] text-ink-muted">{refund.order.email}</span></td>
        <td className="px-4 py-3 text-xs">{refund.returnRequest ? <button type="button" onClick={() => setReturnId(refund.returnRequest!.id)} className="font-semibold text-ink hover:text-accent-strong hover:underline">{refund.returnRequest.returnNumber}</button> : <span className="text-ink-muted">Order refund</span>}{refund.attempt > 1 ? <span className="block text-[11px] text-ink-muted">Attempt {refund.attempt}</span> : null}</td>
        <td className="px-4 py-3 text-xs text-ink-secondary">{refund.transaction.provider}<span className="block font-mono text-[11px] text-ink-muted">{refund.providerRefundId ?? "—"}</span></td>
        <td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(refund.amount)}</td>
        <td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tone.tone}`} title={refund.failureReason ?? undefined}>{tone.label}</span>{refund.failureReason ? <span className="mt-1 block max-w-[220px] text-left text-[11px] text-danger-tint-ink">{refund.failureReason}</span> : null}</td>
      </tr>; })}{!loading && !items.length ? <tr><td colSpan={6} className="h-40 text-center text-[13px] text-ink-muted">No refunds{status || search ? " match these filters" : " yet"}.</td></tr> : null}</tbody></table></div>
      {meta && meta.totalPages > 1 ? <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-3 text-xs text-ink-muted"><span>Page {meta.page} of {meta.totalPages}</span><button type="button" disabled={meta.page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page" className={iconButton}><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Next page" className={iconButton}><ChevronRight className="h-4 w-4" /></button></div> : null}
    </section>
    {returnId ? <ReturnDrawer id={returnId} onClose={() => setReturnId(null)} onChanged={() => void load()} /> : null}
  </div>;
}
