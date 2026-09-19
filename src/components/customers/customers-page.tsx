"use client";

import { CURRENCY } from "@/lib/currency";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LoaderCircle,
  MailCheck,
  Pencil,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CustomerStatus = "ACTIVE" | "SUSPENDED";
type Customer = {
  id: number;
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  emailVerifiedAt: string | null;
  status: CustomerStatus;
  createdAt: string;
  totalSpend: number;
  lastOrderAt: string | null;
  _count: { orders: number };
};
type CustomerDetail = Customer & {
  mobileVerifiedAt: string | null;
  updatedAt: string;
  addresses: Array<{ id: number; label: string | null; fullName: string; companyName: string | null; line1: string; line2: string | null; city: string; county: string | null; postcode: string; country: string; phone: string | null; addressType: string; isDefault: boolean }>;
  _count: { orders: number; reviews: number };
};
type CustomerOrder = { id: number; orderNumber: string; status: string; paymentStatus: string; total: string; placedAt: string };
type Meta = { page: number; perPage: number; total: number; totalPages: number };
type Summary = { totalCustomers: number; activeCustomers: number; customersWithOrders: number; registeredLast30Days: number; averageOrdersPerCustomer: number };

const emptyMeta: Meta = { page: 1, perPage: 20, total: 0, totalPages: 0 };
const emptySummary: Summary = { totalCustomers: 0, activeCustomers: 0, customersWithOrders: 0, registeredLast30Days: 0, averageOrdersPerCustomer: 0 };

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) return (payload as { data: T }).data;
  return payload as T;
}
function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const value = (payload as { message?: unknown }).message;
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return fallback;
}
function money(value: string | number) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(Number(value)); }
function customerName(customer: Pick<Customer, "firstName" | "lastName">) { return `${customer.firstName} ${customer.lastName}`.trim() || "Unnamed customer"; }
function statusClass(status: CustomerStatus) { return status === "ACTIVE" ? "bg-positive-tint text-positive-tint-ink ring-positive-tint-border" : "bg-danger-tint text-danger-tint-ink ring-danger-tint-border"; }

export function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<Meta>(emptyMeta);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [searchInput]);

  const query = useCallback((requestedPage = page, perPage = 20) => {
    const params = new URLSearchParams({ page: String(requestedPage), perPage: String(perPage) });
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) params.set("dateTo", new Date(`${dateTo}T23:59:59`).toISOString());
    return params;
  }, [dateFrom, dateTo, page, search, status]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [customersResponse, summaryResponse] = await Promise.all([fetch(`/api/customers?${query()}`, { cache: "no-store" }), fetch("/api/customers/summary", { cache: "no-store" })]);
      const [customersPayload, summaryPayload] = await Promise.all([customersResponse.json(), summaryResponse.json()]);
      if (!customersResponse.ok) throw new Error(errorMessage(customersPayload, "Customers could not be loaded."));
      setItems((customersPayload as { data?: Customer[] }).data ?? []);
      setMeta((customersPayload as { meta?: Meta }).meta ?? emptyMeta);
      setSelected(new Set());
      if (summaryResponse.ok) setSummary(unwrap<Summary>(summaryPayload));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Customers could not be loaded."); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function updateCustomers(ids: number[], nextStatus: CustomerStatus) {
    setMutating(true); setError(""); setNotice("");
    try {
      for (const id of ids) {
        const response = await fetch(`/api/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(errorMessage(payload, `Customer ${id} could not be updated.`));
      }
      setNotice(`${ids.length} customer ${ids.length === 1 ? "account" : "accounts"} ${nextStatus === "ACTIVE" ? "activated" : "suspended"}.`);
      await load();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Customer accounts could not be updated."); }
    finally { setMutating(false); }
  }

  async function exportCustomers() {
    setError("");
    try {
      const response = await fetch(`/api/customers?${query(1, 100)}`); const payload = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "The customer export could not be prepared."));
      const exported = (payload as { data?: Customer[] }).data ?? [];
      const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const rows = [["ID", "First name", "Last name", "Email", "Phone", "Status", "Orders", "Total spend", "Registered", "Last order"], ...exported.map((customer) => [customer.id, customer.firstName, customer.lastName, customer.email, customer.phone, customer.status, customer._count.orders, customer.totalSpend, customer.createdAt, customer.lastOrderAt])];
      const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(quote).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : "The customer export failed."); }
  }

  const filtersActive = Boolean(searchInput || status || dateFrom || dateTo);
  const allSelected = items.length > 0 && selected.size === items.length;
  const metrics = useMemo(() => [
    { label: "Total customers", value: summary.totalCustomers.toLocaleString("en-GB"), note: `${summary.registeredLast30Days} registered in 30 days`, icon: Users },
    { label: "Active accounts", value: summary.activeCustomers.toLocaleString("en-GB"), note: `${Math.max(0, summary.totalCustomers - summary.activeCustomers)} suspended`, icon: UserCheck },
    { label: "Customers with orders", value: summary.customersWithOrders.toLocaleString("en-GB"), note: "Purchased at least once", icon: ShoppingBag },
    { label: "Orders per customer", value: summary.averageOrdersPerCustomer.toLocaleString("en-GB"), note: "Average across all accounts", icon: BadgeCheck },
  ], [summary]);

  return <div className="pb-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink sm:text-2xl">Customers</h1><p className="mt-1 text-[13.5px] text-ink-muted">Manage customer accounts, activity and purchase history.</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink-secondary shadow-card hover:bg-neutral-tint disabled:opacity-50"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh</button><button type="button" onClick={() => void exportCustomers()} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white hover:bg-[#1d2939]"><Download className="h-4 w-4" />Export customers</button></div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, note, icon: Icon }) => <div key={label} className="rounded-xl border border-border bg-surface p-4 shadow-card"><div className="flex items-start justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</p><p className="mt-2 text-xl font-semibold tabular-nums text-ink">{value}</p><p className="mt-1 text-[11px] text-ink-muted">{note}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-tint text-ink-secondary"><Icon className="h-[18px] w-[18px]" /></span></div></div>)}</div>

    <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center"><div><h2 className="text-[14px] font-semibold text-ink">Customers ({meta.total})</h2><p className="mt-0.5 text-[11.5px] text-ink-muted">Newest registrations are shown first.</p></div><div className="flex flex-1 flex-col gap-2 sm:flex-row lg:ml-auto lg:max-w-2xl"><label className="relative flex-1"><span className="sr-only">Search customers</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name, email or phone" className="h-10 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-[13px] outline-none placeholder:text-ink-faint focus:border-accent-strong focus:ring-2 focus:ring-accent-tint-border" /></label><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by account status" className="h-10 rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink-secondary"><option value="">All accounts</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></div></div>
      <div className="flex flex-col gap-2 border-b border-border bg-canvas/60 px-4 py-3 sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-xs text-ink-muted"><CalendarDays className="h-4 w-4" />Registration date</div><input type="date" aria-label="Registered from" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary" /><span className="hidden text-xs text-ink-faint sm:inline">to</span><input type="date" aria-label="Registered to" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink-secondary" />{filtersActive ? <button type="button" onClick={() => { setSearchInput(""); setStatus(""); setDateFrom(""); setDateTo(""); setPage(1); }} className="text-xs font-semibold text-ink-secondary hover:text-ink">Clear filters</button> : null}</div>
      {notice ? <div className="border-b border-positive-tint-border bg-positive-tint px-4 py-2.5 text-xs text-positive-tint-ink">{notice}</div> : null}
      {selected.size ? <div className="flex flex-col gap-2 bg-ink px-4 py-3 text-white sm:flex-row sm:items-center"><span className="text-xs font-semibold">{selected.size} selected</span><button type="button" disabled={mutating} onClick={() => void updateCustomers([...selected], "ACTIVE")} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15 sm:ml-auto">Activate</button><button type="button" disabled={mutating} onClick={() => void updateCustomers([...selected], "SUSPENDED")} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15">Suspend</button><button type="button" onClick={() => setSelected(new Set())} className="text-xs font-semibold text-white/70 hover:text-white">Clear</button></div> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <LoadingState /> : items.length === 0 ? <EmptyState filtered={filtersActive} /> : <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] border-collapse"><thead><tr className="border-b border-border bg-canvas text-left text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted"><th className="w-12 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)))} aria-label="Select all customers" /></th><th className="px-2 py-3">Customer</th><th className="px-3 py-3">Email address</th><th className="px-3 py-3">Orders</th><th className="px-3 py-3">Total spend</th><th className="px-3 py-3">Verified</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Registration</th><th className="px-3 py-3">Last order</th><th className="w-14 px-3 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{items.map((customer) => <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-canvas/70"><td className="px-4 py-3"><input type="checkbox" checked={selected.has(customer.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(customer.id)) next.delete(customer.id); else next.add(customer.id); return next; })} aria-label={`Select ${customerName(customer)}`} /></td><td className="px-2 py-3"><button type="button" onClick={() => setDetailId(customer.id)} className="text-left"><p className="text-xs font-semibold text-ink hover:underline">{customerName(customer)}</p><p className="mt-0.5 font-mono text-[10.5px] text-ink-muted">ID {customer.id}</p></button></td><td className="px-3 py-3"><p className="max-w-64 truncate text-xs text-ink-secondary">{customer.email}</p>{customer.phone ? <p className="mt-0.5 text-[10.5px] text-ink-muted">{customer.phone}</p> : null}</td><td className="px-3 py-3 text-xs font-semibold tabular-nums text-ink-secondary">{customer._count.orders}</td><td className="px-3 py-3 text-xs font-semibold tabular-nums text-ink">{money(customer.totalSpend)}</td><td className="px-3 py-3">{customer.emailVerifiedAt ? <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-positive-tint-ink"><MailCheck className="h-4 w-4" />Email</span> : <span className="text-[10.5px] text-ink-muted">Not verified</span>}</td><td className="px-3 py-3"><select value={customer.status} disabled={mutating} onChange={(event) => void updateCustomers([customer.id], event.target.value as CustomerStatus)} aria-label={`Change status for ${customerName(customer)}`} className={cn("rounded-full px-2 py-1 text-[10.5px] font-semibold ring-1 ring-inset outline-none", statusClass(customer.status))}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></td><td className="px-3 py-3 text-xs text-ink-muted">{new Date(customer.createdAt).toLocaleDateString("en-GB")}</td><td className="px-3 py-3 text-xs text-ink-muted">{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("en-GB") : "—"}</td><td className="px-3 py-3"><button type="button" onClick={() => setDetailId(customer.id)} aria-label={`View ${customerName(customer)}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></table></div><div className="divide-y divide-border md:hidden">{items.map((customer) => <article key={customer.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><button type="button" onClick={() => setDetailId(customer.id)} className="text-left text-[13px] font-semibold text-ink">{customerName(customer)}</button><p className="mt-1 text-[11px] text-ink-muted">{customer.email}</p></div><span className={cn("rounded-full px-2 py-1 text-[10.5px] font-semibold ring-1 ring-inset", statusClass(customer.status))}>{customer.status === "ACTIVE" ? "Active" : "Suspended"}</span></div><div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3"><div><p className="text-[10.5px] text-ink-muted">Orders</p><p className="mt-1 text-xs font-semibold tabular-nums">{customer._count.orders}</p></div><div><p className="text-[10.5px] text-ink-muted">Spent</p><p className="mt-1 text-xs font-semibold tabular-nums">{money(customer.totalSpend)}</p></div><div><p className="text-[10.5px] text-ink-muted">Registered</p><p className="mt-1 text-xs text-ink-secondary">{new Date(customer.createdAt).toLocaleDateString("en-GB")}</p></div></div><button type="button" onClick={() => setDetailId(customer.id)} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-ink-secondary"><Eye className="h-4 w-4" />View customer</button></article>)}</div></>}
      {!loading && !error && meta.totalPages > 1 ? <div className="flex items-center justify-between border-t border-border px-4 py-3"><p className="text-xs text-ink-muted">Page {meta.page} of {meta.totalPages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary disabled:opacity-45"><ChevronLeft className="h-4 w-4" />Previous</button><button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary disabled:opacity-45">Next<ChevronRight className="h-4 w-4" /></button></div></div> : null}
    </section>
    {detailId ? <CustomerDrawer id={detailId} onClose={() => setDetailId(null)} onChanged={load} /> : null}
  </div>;
}

function CustomerDrawer({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  useEffect(() => { const timer = window.setTimeout(async () => { try { const [customerResponse, ordersResponse] = await Promise.all([fetch(`/api/customers/${id}`), fetch(`/api/customers/${id}/orders?page=1&perPage=5`)]); const [customerPayload, ordersPayload] = await Promise.all([customerResponse.json(), ordersResponse.json()]); if (!customerResponse.ok) throw new Error(errorMessage(customerPayload, "Customer details could not be loaded.")); setCustomer(unwrap<CustomerDetail>(customerPayload)); if (ordersResponse.ok) setOrders((ordersPayload as { data?: CustomerOrder[] }).data ?? []); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Customer details could not be loaded."); } }, 0); return () => window.clearTimeout(timer); }, [id]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [onClose]);
  async function setStatus(nextStatus: CustomerStatus) {
    if (actionBusy) return;
    setActionBusy(true); setActionError("");
    try {
      const response = await fetch(`/api/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "Customer could not be updated."));
      setCustomer((current) => (current ? { ...current, status: nextStatus } : current));
      onChanged();
    } catch (statusError) { setActionError(statusError instanceof Error ? statusError.message : "Customer could not be updated."); }
    finally { setActionBusy(false); }
  }
  function startEditing() {
    if (!customer) return;
    setForm({ firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone ?? "" });
    setActionError(""); setIsEditing(true);
  }
  async function saveEdit() {
    if (actionBusy) return;
    setActionBusy(true); setActionError("");
    try {
      const body = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim() || null };
      const response = await fetch(`/api/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "Customer could not be updated."));
      setCustomer((current) => (current ? { ...current, ...body } : current));
      setIsEditing(false);
      onChanged();
    } catch (editError) { setActionError(editError instanceof Error ? editError.message : "Customer could not be updated."); }
    finally { setActionBusy(false); }
  }
  async function remove() {
    if (actionBusy) return;
    setActionBusy(true); setActionError("");
    try {
      const response = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) throw new Error(errorMessage(await response.json().catch(() => ({})), "Customer could not be deleted."));
      onChanged();
      onClose();
    } catch (deleteError) { setConfirmDelete(false); setActionError(deleteError instanceof Error ? deleteError.message : "Customer could not be deleted."); }
    finally { setActionBusy(false); }
  }
  return <div className="fixed inset-0 z-50"><button type="button" onClick={onClose} aria-label="Close customer details" className="absolute inset-0 bg-slate-950/40" /><aside role="dialog" aria-modal="true" aria-labelledby="customer-detail-title" className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto bg-surface shadow-panel"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-surface px-5 py-4"><div><p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Customer profile</p><h2 id="customer-detail-title" className="mt-1 text-[14px] font-semibold text-ink">{customer ? customerName(customer) : `Customer ${id}`}</h2></div><button type="button" onClick={onClose} aria-label="Close customer details" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint"><X className="h-5 w-5" /></button></div>{error ? <div className="m-5 rounded-md bg-danger-tint p-4 text-xs text-danger-tint-ink">{error}</div> : !customer ? <LoaderCircle className="mx-auto mt-24 h-6 w-6 animate-spin text-ink-muted" /> : <div className="space-y-6 p-5"><div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", statusClass(customer.status))}>{customer.status === "ACTIVE" ? "Active" : "Suspended"}</span>{customer.emailVerifiedAt ? <span className="inline-flex items-center gap-1.5 rounded-full bg-positive-tint px-2.5 py-1 text-xs font-semibold text-positive-tint-ink"><MailCheck className="h-3.5 w-3.5" />Email verified</span> : null}</div><div className="flex flex-wrap gap-2"><button type="button" disabled={actionBusy} onClick={startEditing} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Pencil className="h-3.5 w-3.5" />Edit details</button>{customer.status === "ACTIVE" ? <button type="button" disabled={actionBusy} onClick={() => void setStatus("SUSPENDED")} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Ban className="h-3.5 w-3.5" />Suspend account</button> : <button type="button" disabled={actionBusy} onClick={() => void setStatus("ACTIVE")} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><UserCheck className="h-3.5 w-3.5" />Activate account</button>}<button type="button" disabled={actionBusy} onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 rounded-md border border-danger-tint-border bg-danger-tint px-3 py-1.5 text-xs font-semibold text-danger-tint-ink hover:bg-danger-tint/70 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete customer</button></div>{actionError ? <p role="alert" className="text-xs text-danger-tint-ink">{actionError}</p> : null}{isEditing ? <section className="rounded-lg border border-border-strong bg-canvas p-4"><h3 className="text-[13px] font-semibold text-ink">Edit details</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-ink-muted">First name<input value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} className="mt-1 h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink outline-none focus:border-accent-strong" /></label><label className="text-xs text-ink-muted">Last name<input value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} className="mt-1 h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink outline-none focus:border-accent-strong" /></label><label className="text-xs text-ink-muted sm:col-span-2">Phone<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="mt-1 h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink outline-none focus:border-accent-strong" /></label></div><div className="mt-3 flex gap-2"><button type="button" disabled={actionBusy} onClick={() => void saveEdit()} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-xs font-semibold text-white disabled:opacity-50">{actionBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}Save changes</button><button type="button" onClick={() => setIsEditing(false)} className="h-9 rounded-md border border-border px-3.5 text-xs font-semibold text-ink-secondary">Cancel</button></div></section> : null}<section><h3 className="text-[13px] font-semibold text-ink">Contact</h3><dl className="mt-3 grid gap-3 rounded-lg bg-canvas p-4 text-xs sm:grid-cols-2"><Info term="Email" value={customer.email} /><Info term="Phone" value={customer.phone || "Not provided"} /><Info term="Registered" value={new Date(customer.createdAt).toLocaleDateString("en-GB")} /><Info term="Customer ID" value={String(customer.id)} mono /></dl></section><section><h3 className="text-[13px] font-semibold text-ink">Activity</h3><div className="mt-3 grid grid-cols-3 gap-3"><Stat label="Orders" value={customer._count.orders} /><Stat label="Reviews" value={customer._count.reviews} /><Stat label="Addresses" value={customer.addresses.length} /></div></section><section><h3 className="text-[13px] font-semibold text-ink">Addresses</h3>{customer.addresses.length ? <div className="mt-3 space-y-2">{customer.addresses.map((address) => <div key={address.id} className="rounded-lg border border-border p-3 text-xs"><div className="flex items-center gap-2"><p className="font-semibold text-ink">{address.label || address.addressType.toLowerCase()}</p>{address.isDefault ? <span className="rounded-full bg-neutral-tint px-2 py-0.5 text-[10px] font-semibold text-ink-muted">Default</span> : null}</div><p className="mt-2 leading-5 text-ink-secondary">{address.fullName}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}{address.county ? `, ${address.county}` : ""} {address.postcode}<br />{address.country}</p></div>)}</div> : <p className="mt-2 text-xs text-ink-muted">No saved addresses.</p>}</section><section><h3 className="text-[13px] font-semibold text-ink">Recent orders</h3>{orders.length ? <div className="mt-3 divide-y divide-border rounded-lg border border-border">{orders.map((order) => <div key={order.id} className="flex items-center gap-3 p-3"><div className="min-w-0 flex-1"><p className="font-mono text-[11px] font-semibold text-ink">{order.orderNumber}</p><p className="mt-1 text-[10.5px] text-ink-muted">{new Date(order.placedAt).toLocaleDateString("en-GB")} · {order.status.toLowerCase().replaceAll("_", " ")}</p></div><p className="text-xs font-semibold tabular-nums">{money(order.total)}</p></div>)}</div> : <p className="mt-2 text-xs text-ink-muted">No orders placed yet.</p>}</section></div>}</aside>
    <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}><DialogContent><DialogHeader><DialogTitle>Delete customer account?</DialogTitle><DialogDescription>{customer ? `"${customerName(customer)}" (${customer.email}) will be permanently removed from customer accounts. This cannot be undone.` : ""}</DialogDescription></DialogHeader><DialogFooter><button type="button" onClick={() => setConfirmDelete(false)} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={() => void remove()} disabled={actionBusy} className="inline-flex h-9 items-center gap-2 rounded-md bg-danger px-4 text-xs font-semibold text-white disabled:opacity-50">{actionBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete</button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Info({ term, value, mono = false }: { term: string; value: string; mono?: boolean }) { return <div><dt className="text-ink-muted">{term}</dt><dd className={cn("mt-1 text-ink-secondary", mono && "font-mono")}>{value}</dd></div>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-canvas p-3"><p className="text-[10.5px] text-ink-muted">{label}</p><p className="mt-1 text-base font-semibold tabular-nums text-ink">{value}</p></div>; }
function LoadingState() { return <div className="divide-y divide-border">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="flex items-center gap-4 p-4"><div className="h-4 w-4 animate-pulse rounded bg-neutral-tint" /><div className="h-3 w-32 animate-pulse rounded bg-neutral-tint" /><div className="h-3 flex-1 animate-pulse rounded bg-neutral-tint" /><div className="h-6 w-20 animate-pulse rounded-full bg-neutral-tint" /></div>)}</div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><AlertTriangle className="h-7 w-7 text-danger" /><h2 className="mt-4 text-[13.5px] font-semibold text-ink">Customers could not be loaded</h2><p className="mt-1 max-w-md text-xs leading-5 text-danger-tint-ink">{message}</p><button type="button" onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-xs font-semibold text-white"><RefreshCw className="h-4 w-4" />Try again</button></div>; }
function EmptyState({ filtered }: { filtered: boolean }) { return <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-tint text-ink-muted"><Users className="h-6 w-6" /></span><h2 className="mt-4 text-[13.5px] font-semibold text-ink">{filtered ? "No customers match these filters" : "No customer accounts yet"}</h2><p className="mt-1 max-w-sm text-xs leading-5 text-ink-muted">{filtered ? "Try another name, email, phone, status or registration date." : "New customer registrations will appear here automatically."}</p></div>; }
