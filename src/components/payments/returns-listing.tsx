"use client";

import { CURRENCY } from "@/lib/currency";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, LoaderCircle, PackageCheck, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { collectionFromApi } from "@/lib/api-response";

type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED";
type ReturnItem = {
  id: number;
  reason: string;
  comment: string | null;
  refundAmount: string | null;
  returnStatus: ReturnStatus;
  user: { firstName: string; lastName: string; email: string };
  orderItem: { subtotal: string; order: { orderNumber: string }; product: { title: string }; productVariant: { title: string } | null };
};
type Action = { type: "approve" | "reject" | "receive" | "refund"; target: ReturnItem };
const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const statusTone: Record<ReturnStatus, string> = { REQUESTED: "bg-accent-tint text-accent-tint-ink", APPROVED: "bg-neutral-tint text-ink-muted", RECEIVED: "bg-neutral-tint text-ink-muted", REFUNDED: "bg-positive-tint text-positive-tint-ink", REJECTED: "bg-danger-tint text-danger-tint-ink" };
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function money(amount: string) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(Number(amount)); }

export function ReturnsListing() {
  const [items, setItems] = useState<ReturnItem[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await fetch("/api/payments/returns", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(apiMessage(payload, "Returns could not be loaded.")); setItems(collectionFromApi<ReturnItem>(payload)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Returns could not be loaded."); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const pendingCount = items.filter((item) => item.returnStatus === "REQUESTED").length;

  return <div className="w-full"><nav className="flex items-center gap-1.5 text-xs text-ink-muted"><span>Sales</span><ChevronRight className="h-3.5 w-3.5" /><span>Returns</span></nav><h1 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-ink">Returns &amp; refunds</h1><p className="mt-1 text-[13.5px] text-ink-muted">Customer return requests, from approval through refund.</p>
  <div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric icon={RotateCcw} label="Awaiting review" value={String(pendingCount)} detail="Return requests" /><Metric icon={PackageCheck} label="Total requests" value={String(items.length)} detail="All statuses" /></div>
  {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Order</th><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">Reason</th><th className="px-4 py-3 text-right font-semibold">Amount</th><th className="px-4 py-3 text-center font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-border">{loading ? <tr><td colSpan={7} className="h-40 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr> : items.map((item) => <tr key={item.id} className="hover:bg-canvas"><td className="px-4 py-3 text-[13px] font-semibold text-ink">{item.orderItem.order.orderNumber}</td><td className="px-4 py-3 text-xs text-ink-secondary">{item.orderItem.product.title}{item.orderItem.productVariant ? ` — ${item.orderItem.productVariant.title}` : ""}</td><td className="px-4 py-3 text-xs text-ink-secondary">{item.user.firstName} {item.user.lastName}</td><td className="max-w-xs px-4 py-3"><p className="line-clamp-2 text-xs text-ink-muted">{item.reason}</p></td><td className="px-4 py-3 text-right text-xs font-semibold text-ink">{money(item.refundAmount ?? item.orderItem.subtotal)}</td><td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${statusTone[item.returnStatus]}`}>{item.returnStatus}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2">{item.returnStatus === "REQUESTED" ? <><button type="button" onClick={() => setAction({ type: "reject", target: item })} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Reject</button><button type="button" onClick={() => setAction({ type: "approve", target: item })} className="h-8 rounded-md bg-ink px-3 text-xs font-semibold text-white hover:bg-[#1d2939]">Approve</button></> : null}{item.returnStatus === "APPROVED" ? <button type="button" onClick={() => setAction({ type: "receive", target: item })} className="h-8 rounded-md bg-ink px-3 text-xs font-semibold text-white hover:bg-[#1d2939]">Mark received</button> : null}{item.returnStatus === "RECEIVED" ? <button type="button" onClick={() => setAction({ type: "refund", target: item })} className="h-8 rounded-md bg-ink px-3 text-xs font-semibold text-white hover:bg-[#1d2939]">Refund</button> : null}{item.returnStatus === "REFUNDED" || item.returnStatus === "REJECTED" ? <span className="text-xs text-ink-faint">—</span> : null}</div></td></tr>)}{!loading && !items.length ? <tr><td colSpan={7} className="h-40 text-center text-[13px] text-ink-muted">No return requests yet.</td></tr> : null}</tbody></table></div></section>
  <ActionDialog action={action} onClose={() => setAction(null)} onDone={load} /></div>;
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
