"use client";

import { DatePicker } from "@/components/ui/date-picker";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, LoaderCircle, Mail, Search, UserPlus, X } from "lucide-react";

type Subscriber = { id: number; email: string; createdAt: string; unsubscribedAt: string | null };
type Meta = { page: number; perPage: number; total: number; totalPages: number; summary?: { total: number; last30Days: number } };
const PER_PAGE_OPTIONS = [20, 50, 100] as const;
const fieldClass = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-accent-strong";
const labelClass = "text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted";
const emptyFilters = { q: "", dateFrom: "", dateTo: "" };
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }

export function SubscribersListing() {
  const [items, setItems] = useState<Subscriber[]>([]), [meta, setMeta] = useState<Meta | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [filters, setFilters] = useState(emptyFilters), [search, setSearch] = useState(""); // search = debounced filters.q
  const [sort, setSort] = useState("newest"), [page, setPage] = useState(1), [perPage, setPerPage] = useState<number>(20);
  const [campaignOpen, setCampaignOpen] = useState(false), [campaignBusy, setCampaignBusy] = useState(false);
  const [campaignError, setCampaignError] = useState(""), [campaignNotice, setCampaignNotice] = useState("");
  const [campaign, setCampaign] = useState({ subject: "", preheader: "", heading: "", message: "" });

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(filters.q.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [filters.q]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage), sort });
    if (search) params.set("q", search);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    try {
      const response = await fetch(`/api/subscribers?${params}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "Subscribers could not be loaded."));
      setItems((payload.data ?? []) as Subscriber[]); setMeta(payload.meta as Meta);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Subscribers could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sort, search, filters.dateFrom, filters.dateTo]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const setFilter = (patch: Partial<typeof emptyFilters>) => { setFilters((current) => ({ ...current, ...patch })); if (!("q" in patch)) setPage(1); };
  const filtered = Boolean(search || filters.dateFrom || filters.dateTo);
  const from = meta && meta.total ? (meta.page - 1) * meta.perPage + 1 : 0;
  const to = meta ? Math.min(meta.page * meta.perPage, meta.total) : 0;
  const pageButton = "flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint disabled:opacity-40";

  async function sendCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (campaignBusy) return;
    const recipientCount = meta?.summary?.total ?? 0;
    if (!recipientCount || !window.confirm(`Send this campaign to ${recipientCount} subscribed email addresses?`)) return;
    setCampaignBusy(true); setCampaignError(""); setCampaignNotice("");
    try {
      const response = await fetch("/api/subscribers/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...campaign, subject: campaign.subject.trim(), preheader: campaign.preheader.trim(), heading: campaign.heading.trim(), message: campaign.message.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload?.error ?? payload, "Campaign could not be sent."));
      const result = payload.data ?? payload;
      setCampaignNotice(`Campaign complete: ${result.sent} sent, ${result.failed} failed, ${result.recipients} subscribed recipients.`);
    } catch (sendError) {
      setCampaignError(sendError instanceof Error ? sendError.message : "Campaign could not be sent.");
    } finally {
      setCampaignBusy(false);
    }
  }

  return (
    <div className="w-full">
      <nav className="flex items-center gap-1.5 text-xs text-ink-muted"><span>Marketing</span><ChevronRight className="h-3.5 w-3.5" /><span>Subscribers</span></nav>
      <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-ink">Newsletter subscribers</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">Everyone who signed up for deals &amp; restock alerts from the storefront footer.</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <p className="text-xs text-ink-muted">Campaigns go only to subscribed contacts; each email includes a one-click unsubscribe link.</p>
        <button type="button" onClick={() => { setCampaignOpen((open) => !open); setCampaignError(""); setCampaignNotice(""); }} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-xs font-semibold text-white hover:bg-ink/90">
          <Mail className="h-4 w-4" />{campaignOpen ? "Close composer" : "Compose campaign"}
        </button>
      </div>
      {campaignNotice ? <p className="mt-3 rounded-md bg-positive-tint p-3 text-xs text-positive-tint-ink" role="status">{campaignNotice}</p> : null}
      {campaignOpen ? <form onSubmit={(event) => void sendCampaign(event)} className="mt-3 space-y-3 rounded-lg border border-border bg-surface p-4 shadow-card" aria-busy={campaignBusy}>
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-ink">New campaign</h2><span className="text-xs text-ink-muted">{meta?.summary?.total ?? "—"} subscribed</span></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Subject<input required maxLength={160} value={campaign.subject} onChange={(event) => setCampaign({ ...campaign, subject: event.target.value })} className={`${fieldClass} mt-1 block w-full normal-case tracking-normal`} /></label>
          <label className={labelClass}>Inbox preview<input required maxLength={180} value={campaign.preheader} onChange={(event) => setCampaign({ ...campaign, preheader: event.target.value })} className={`${fieldClass} mt-1 block w-full normal-case tracking-normal`} /></label>
        </div>
        <label className={`${labelClass} block`}>Heading<input required maxLength={120} value={campaign.heading} onChange={(event) => setCampaign({ ...campaign, heading: event.target.value })} className={`${fieldClass} mt-1 block w-full normal-case tracking-normal`} /></label>
        <label className={`${labelClass} block`}>Message<textarea required maxLength={5000} rows={5} value={campaign.message} onChange={(event) => setCampaign({ ...campaign, message: event.target.value })} className={`${fieldClass} mt-1 block h-auto w-full resize-y py-2 normal-case tracking-normal`} /></label>
        {campaignError ? <p className="flex items-center gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink" role="alert"><AlertTriangle className="h-4 w-4 shrink-0" />{campaignError}</p> : null}
        <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={campaignBusy} onClick={() => setCampaignOpen(false)} className="h-9 rounded-md border border-border px-3.5 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={campaignBusy || !meta?.summary?.total} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-xs font-semibold text-white disabled:opacity-50">{campaignBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}{campaignBusy ? "Sending…" : "Send campaign"}</button></div>
      </form> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric icon={Mail} label="Total subscribers" value={meta?.summary ? String(meta.summary.total) : "—"} />
        <Metric icon={UserPlus} label="New in the last 30 days" value={meta?.summary ? String(meta.summary.last30Days) : "—"} />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-card">
        <label className="relative min-w-[240px] max-w-160 flex-1"><span className="sr-only">Search subscribers by email</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={filters.q} onChange={(event) => setFilter({ q: event.target.value })} placeholder="Search by email…" className={`${fieldClass} w-full pl-8`} /></label>
        <label className={labelClass}>Subscribed from<DatePicker type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(value) => setFilter({ dateFrom: value })} className={`${fieldClass} mt-1 w-36`} /></label>
        <label className={labelClass}>To<DatePicker type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(value) => setFilter({ dateTo: value })} className={`${fieldClass} mt-1 w-36`} /></label>
        <label className={labelClass}>Sort<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className={`${fieldClass} mt-1 block`}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="email">Email A–Z</option></select></label>
        {filtered ? <button type="button" onClick={() => { setFilters(emptyFilters); setSearch(""); setPage(1); }} className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint"><X className="h-4 w-4" />Clear</button> : null}
      </div>
      {filtered && meta ? <p className="mt-2 text-xs text-ink-muted">Matching: <strong className="text-ink">{meta.total}</strong> {meta.total === 1 ? "subscriber" : "subscribers"}</p> : null}

      {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}

      <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted">
              <tr><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Subscribed</th><th className="px-4 py-3 font-semibold">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={3} className="h-40 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 text-[13px] font-semibold text-ink">{item.email}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary">{new Date(item.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary">{item.unsubscribedAt ? "Unsubscribed" : "Subscribed"}</td>
                </tr>
              ))}
              {!loading && !items.length ? <tr><td colSpan={3} className="h-40 text-center text-[13px] text-ink-muted">{filtered ? "No subscribers match these filters." : "No subscribers yet."}</td></tr> : null}
            </tbody>
          </table>
        </div>
        {meta && meta.total ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-ink-muted">
            <span>Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{meta.total}</strong></span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">Rows per page<select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className={fieldClass}>{PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <span>Page {meta.page} of {Math.max(meta.totalPages, 1)}</span>
              <button type="button" disabled={meta.page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page" className={pageButton}><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Next page" className={pageButton}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-surface p-4 shadow-card"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</p><p className="mt-0.5 truncate text-lg font-semibold text-ink">{value}</p></div></div></div>;
}
