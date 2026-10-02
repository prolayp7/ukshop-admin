"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock3, LoaderCircle, Pencil, RefreshCw, Save } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { CURRENCY } from "@/lib/currency";
import type { ProductListItem, ProductListMeta } from "@/lib/products";

const emptyMeta: ProductListMeta = { page: 1, perPage: 20, total: 0, totalPages: 0 };
const inputClass = "h-9 w-full min-w-44";

function apiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  }
  return fallback;
}

function money(value: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(Number(value));
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function productPrice(item: ProductListItem) {
  const variant = item.variants.find((entry) => entry.isDefault) ?? item.variants[0];
  if (!variant) return "No price";
  return variant.salePrice ? <>{money(variant.salePrice)} <s className="text-xs text-ink-muted">{money(variant.price)}</s></> : money(variant.price);
}

export function DealsListing() {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [meta, setMeta] = useState<ProductListMeta>(emptyMeta);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), perPage: "20", status: "ACTIVE", onSale: "true" });
      if (search) params.set("q", search);
      const response = await fetch(`/api/products?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(apiMessage(payload, "Deals could not be loaded."));
      const nextItems = (payload.data ?? []) as ProductListItem[];
      setItems(nextItems);
      setMeta(payload.meta ?? emptyMeta);
      setDrafts(Object.fromEntries(nextItems.map((item) => [item.id, localDateTime(item.dealEndsAt)])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Deals could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDeals(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDeals]);

  async function saveExpiry(item: ProductListItem) {
    setSavingId(item.id);
    setError("");
    setNotice("");
    try {
      const draft = drafts[item.id] ?? "";
      const response = await fetch(`/api/products/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealEndsAt: draft ? new Date(draft).toISOString() : null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "The deal timer could not be saved."));
      setNotice(`Deal timer saved for ${item.title}.`);
      await loadDeals();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The deal timer could not be saved.");
    } finally {
      setSavingId(null);
    }
  }

  return <div className="w-full">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Deals</h1>
        <p className="mt-1 text-[13.5px] text-ink-muted">{meta.total} sale-priced {meta.total === 1 ? "product" : "products"}</p>
      </div>
      <label className="w-full sm:w-72"><span className="sr-only">Search deals</span><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search deals" className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong" /></label>
    </div>

    {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
    {notice ? <p role="status" className="mt-4 rounded-md bg-positive-tint px-3 py-2.5 text-xs text-positive-tint-ink">{notice}</p> : null}

    <div className="mt-5 overflow-hidden rounded-lg border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-190 border-collapse text-left">
          <thead className="bg-canvas text-[11px] font-semibold uppercase text-ink-muted">
            <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Deal ends</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-border text-[13px]">
            {loading ? <tr><td colSpan={5} className="h-28 text-center text-ink-muted"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" /></td></tr> : items.length ? items.map((item) => (
              <tr key={item.id}>
                <td className="max-w-[320px] px-4 py-3"><Link href={`/products/${item.id}`} className="font-medium text-ink hover:text-accent-strong">{item.title}</Link><p className="mt-0.5 text-xs text-ink-muted">{item.sku || item.mpn || `Product #${item.id}`}</p></td>
                <td className="px-4 py-3 text-ink-secondary">{item.category.title}</td>
                <td className="px-4 py-3 font-medium text-ink">{productPrice(item)}</td>
                <td className="w-64 px-4 py-3"><DatePicker type="datetime-local" value={drafts[item.id] ?? ""} onChange={(value) => setDrafts((current) => ({ ...current, [item.id]: value }))} className={inputClass} placeholder="No expiry" aria-label={`Deal ends for ${item.title}`} /></td>
                <td className="px-4 py-3"><div className="flex items-center justify-end gap-2"><Link href={`/products/${item.id}`} title="Edit product" aria-label={`Edit ${item.title}`} className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-neutral-tint"><Pencil className="h-4 w-4" /></Link><button type="button" disabled={savingId === item.id} onClick={() => void saveExpiry(item)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-accent-ink disabled:opacity-50"><Save className="h-3.5 w-3.5" />{savingId === item.id ? "Saving" : "Save"}</button></div></td>
              </tr>
            )) : <tr><td colSpan={5} className="h-28 px-4 text-center text-sm text-ink-muted">{search ? "No matching deals." : "No products are currently on sale."}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-ink-muted">
        <span>{meta.total ? `Page ${meta.page} of ${meta.totalPages}` : "No products"}</span>
        <div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || page <= 1} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-md border border-border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))} disabled={loading || page >= meta.totalPages} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-md border border-border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button><button type="button" onClick={() => void loadDeals()} disabled={loading} aria-label="Refresh deals" className="flex h-8 w-8 items-center justify-center rounded-md border border-border disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5${loading ? " animate-spin" : ""}`} /></button></div>
      </div>
    </div>
    <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted"><Clock3 className="h-3.5 w-3.5" />A timer appears on the storefront when an expiry is set. Update sale pricing in the product editor.</p>
  </div>;
}