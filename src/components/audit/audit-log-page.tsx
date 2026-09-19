"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Row = { id: number; actorType: string; actorId: number | null; action: string; entity: string; entityId: string; meta: unknown; correlationId: string | null; createdAt: string };
type Meta = { page: number; totalPages: number; total: number };

export function AuditLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(action.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [action]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), perPage: "25" });
    if (search) params.set("action", search);
    fetch(`/api/audit-logs?${params}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Could not load the audit log.");
        if (cancelled) return;
        setRows(payload.data ?? []);
        setMeta(payload.meta ?? { page: 1, totalPages: 1, total: 0 });
        setError("");
      })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load the audit log."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search]);

  return (
    <div className="pb-6">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink sm:text-2xl">Audit log</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">Payments, refunds and other sensitive actions, newest first.</p>
      <input value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} placeholder="Filter by action, e.g. refund" className="mt-4 h-10 w-full max-w-xs rounded-md border border-border-strong bg-surface px-3 text-[13px] outline-none focus:border-accent-strong" />
      {error ? <p className="mt-4 text-xs text-danger-tint-ink">{error}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-canvas text-[10.5px] uppercase tracking-[0.06em] text-ink-muted">
            <tr><th className="px-4 py-3 font-semibold">When</th><th className="px-4 py-3 font-semibold">Action</th><th className="px-4 py-3 font-semibold">Entity</th><th className="px-4 py-3 font-semibold">Actor</th><th className="px-4 py-3 font-semibold">Details</th><th className="px-4 py-3 font-semibold">Request ID</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? <tr><td colSpan={6} className="h-32 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr> : null}
            {!loading && !rows.length ? <tr><td colSpan={6} className="h-32 text-center text-[13px] text-ink-muted">No audit entries yet.</td></tr> : null}
            {rows.map((row) => (
              <tr key={row.id} className="align-top hover:bg-canvas">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-secondary">{new Date(row.createdAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">{row.action}</td>
                <td className="px-4 py-3 text-xs text-ink-secondary">{row.entity} #{row.entityId}</td>
                <td className="px-4 py-3 text-xs text-ink-secondary">{row.actorType}{row.actorId ? ` #${row.actorId}` : ""}</td>
                <td className="max-w-xs break-words px-4 py-3 font-mono text-[11px] text-ink-muted">{row.meta ? JSON.stringify(row.meta) : "—"}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">{row.correlationId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-ink-muted">Page {meta.page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold disabled:opacity-50">Previous</button>
              <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold disabled:opacity-50">Next</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
