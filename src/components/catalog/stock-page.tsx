"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Boxes, ChevronLeft, ChevronRight, Check, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/cn";

type StockRow = {
  variantId: number;
  productId: number;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  barcode: string | null;
  supplier: string | null;
  stockQty: number;
  lowStockThreshold: number;
  isLowStock: boolean;
};

type Meta = { page: number; perPage: number; total: number; totalPages: number };
const emptyMeta: Meta = { page: 1, perPage: 20, total: 0, totalPages: 0 };

function message(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const value = (payload as { message?: unknown }).message;
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return fallback;
}

export function StockPage() {
  const [items, setItems] = useState<StockRow[]>([]);
  const [meta, setMeta] = useState<Meta>(emptyMeta);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkQty, setBulkQty] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), perPage: "20" });
      if (search) params.set("q", search);
      if (lowStockOnly) params.set("lowStockOnly", "true");
      const response = await fetch(`/api/products/stock?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(message(payload, "Stock could not be loaded."));
      const rows = (payload as { data?: StockRow[] }).data ?? [];
      setItems(rows);
      setMeta((payload as { meta?: Meta }).meta ?? emptyMeta);
      setDrafts(Object.fromEntries(rows.map((row) => [row.variantId, String(row.stockQty)])));
      setSelected(new Set());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Stock could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, search, lowStockOnly]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function saveRow(row: StockRow) {
    const nextQty = Number(drafts[row.variantId]);
    if (!Number.isInteger(nextQty) || nextQty < 0 || nextQty === row.stockQty) return;
    setSavingIds((current) => new Set(current).add(row.variantId));
    setError("");
    try {
      const response = await fetch(`/api/products/${row.productId}/variants/${row.variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockQty: nextQty }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(message(payload, `${row.productTitle} stock could not be updated.`));
      setItems((current) => current.map((item) => item.variantId === row.variantId ? { ...item, stockQty: nextQty, isLowStock: nextQty <= item.lowStockThreshold } : item));
      setNotice(`${row.productTitle} updated to ${nextQty} in stock.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Stock could not be updated.");
    } finally {
      setSavingIds((current) => { const next = new Set(current); next.delete(row.variantId); return next; });
    }
  }

  async function applyBulk() {
    const qty = Number(bulkQty);
    if (!Number.isInteger(qty) || qty < 0 || selected.size === 0) return;
    setBulkSaving(true);
    setError("");
    try {
      const targets = items.filter((row) => selected.has(row.variantId));
      const results = await Promise.all(targets.map((row) =>
        fetch(`/api/products/${row.productId}/variants/${row.variantId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockQty: qty }),
        }),
      ));
      const failed = results.filter((response) => !response.ok).length;
      if (failed > 0) throw new Error(`${failed} of ${targets.length} rows could not be updated.`);
      setNotice(`${targets.length} ${targets.length === 1 ? "variant" : "variants"} updated to ${qty} in stock.`);
      setBulkQty("");
      await load();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Bulk update failed.");
    } finally {
      setBulkSaving(false);
    }
  }

  const allSelected = items.length > 0 && selected.size === items.length;

  return <div className="pb-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink sm:text-2xl">Stock management</h1><p className="mt-1 text-[13.5px] text-ink-muted">Review and adjust stock levels across every product variant.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink-secondary shadow-card hover:bg-neutral-tint disabled:opacity-50"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh</button>
    </div>

    {notice ? <div className="mt-4 rounded-md bg-positive-tint px-4 py-2.5 text-xs text-positive-tint-ink ring-1 ring-inset ring-positive-tint-border">{notice}</div> : null}
    {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}

    <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-[13.5px] font-semibold text-ink">Variants ({meta.total})</h2><p className="mt-0.5 text-xs text-ink-muted">Search by product name, SKU or barcode.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search products, SKU, barcode" className="h-9 w-full rounded-md border border-border-strong pl-9 pr-3 text-xs outline-none focus:border-accent-strong sm:w-72" /></label>
          <label className="flex h-9 items-center gap-2 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary"><input type="checkbox" checked={lowStockOnly} onChange={(event) => { setLowStockOnly(event.target.checked); setPage(1); }} className="h-3.5 w-3.5 accent-ink" />Low stock only</label>
        </div>
      </div>

      {selected.size > 0 ? <div className="flex flex-col gap-2 bg-ink px-4 py-3 text-white sm:flex-row sm:items-center"><span className="text-xs font-semibold">{selected.size} selected</span><input type="number" min="0" value={bulkQty} onChange={(event) => setBulkQty(event.target.value)} placeholder="New quantity" className="h-8 w-32 rounded-md border border-white/20 bg-white/10 px-2 text-xs text-white placeholder:text-white/50 sm:ml-auto" /><button type="button" disabled={bulkSaving || !bulkQty} onClick={() => void applyBulk()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-semibold text-ink disabled:opacity-50">{bulkSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Apply to selected</button><button type="button" onClick={() => setSelected(new Set())} className="text-xs font-semibold text-white/70 hover:text-white">Clear</button></div> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead><tr className="border-b border-border bg-canvas text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
            <th className="w-12 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((item) => item.variantId)))} aria-label="Select all variants" /></th>
            <th className="px-3 py-3">Product</th>
            <th className="px-3 py-3">SKU</th>
            <th className="px-3 py-3">Supplier</th>
            <th className="px-3 py-3 text-right">Threshold</th>
            <th className="px-3 py-3 text-right">Stock</th>
            <th className="px-3 py-3 text-right">Set quantity</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={7} className="h-40 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr> : items.map((row) => <tr key={row.variantId} className="border-b border-border last:border-0 hover:bg-canvas/70">
            <td className="px-4 py-3"><input type="checkbox" checked={selected.has(row.variantId)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(row.variantId)) next.delete(row.variantId); else next.add(row.variantId); return next; })} aria-label={`Select ${row.productTitle} ${row.variantTitle}`} /></td>
            <td className="px-3 py-3"><p className="text-[13px] font-semibold text-ink">{row.productTitle}</p><p className="mt-0.5 text-[10.5px] text-ink-muted">{row.variantTitle}</p></td>
            <td className="px-3 py-3 font-mono text-[11px] text-ink-muted">{row.sku ?? "—"}</td>
            <td className="px-3 py-3 text-xs text-ink-secondary">{row.supplier ?? "—"}</td>
            <td className="px-3 py-3 text-right text-xs tabular-nums text-ink-secondary">{row.lowStockThreshold}</td>
            <td className="px-3 py-3 text-right"><span className={cn("rounded-full px-2 py-1 text-xs font-semibold tabular-nums", row.isLowStock ? "bg-danger-tint text-danger-tint-ink" : "text-ink")}>{row.stockQty}</span></td>
            <td className="px-3 py-3"><div className="flex items-center justify-end gap-1.5"><input type="number" min="0" value={drafts[row.variantId] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [row.variantId]: event.target.value }))} className="h-8 w-20 rounded-md border border-border-strong bg-surface px-2 text-right text-xs outline-none focus:border-accent-strong" /><button type="button" disabled={savingIds.has(row.variantId) || Number(drafts[row.variantId]) === row.stockQty} onClick={() => void saveRow(row)} aria-label={`Save stock for ${row.productTitle} ${row.variantTitle}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink disabled:opacity-30">{savingIds.has(row.variantId) ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}</button></div></td>
          </tr>)}{!loading && !items.length ? <tr><td colSpan={7} className="h-40 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-tint text-ink-muted"><Boxes className="h-6 w-6" /></span><p className="mt-3 text-[13px] font-semibold text-ink">No variants found</p><p className="mt-1 text-xs text-ink-muted">Try clearing the search or low-stock filter.</p></td></tr> : null}</tbody>
        </table>
      </div>

      {!loading && meta.totalPages > 1 ? <div className="flex items-center justify-between border-t border-border px-4 py-3"><p className="text-xs text-ink-muted">Page {meta.page} of {meta.totalPages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary disabled:opacity-45"><ChevronLeft className="h-4 w-4" />Previous</button><button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary disabled:opacity-45">Next<ChevronRight className="h-4 w-4" /></button></div></div> : null}
    </section>
  </div>;
}
