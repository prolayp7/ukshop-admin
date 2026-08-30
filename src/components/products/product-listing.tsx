"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileJson,
  LoaderCircle,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { mediaFileUrl } from "@/lib/media";
import type { CatalogOption, ProductListItem, ProductListMeta, ProductStatus } from "@/lib/products";
import { ProductTypeChooser, type ProductCreationType } from "@/components/products/product-type-chooser";

const emptyMeta: ProductListMeta = { page: 1, perPage: 20, total: 0, totalPages: 0 };

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  }
  return fallback;
}

function money(value?: string | null) {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
}

function priceIncludingTax(item: ProductListItem, value?: string | null) {
  if (value === undefined || value === null) return "—";
  const rate = Number(item.taxRate?.ratePercent ?? 0);
  return money(String(Number(value) * (1 + rate / 100)));
}

function RangeInput({ label, value, onChange, step = "1" }: { label: string; value: string; onChange: (value: string) => void; step?: string }) {
  return <label><span className="sr-only">{label}</span><input type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong" /></label>;
}

function statusClass(status: ProductStatus) {
  if (status === "ACTIVE") return "bg-positive-tint text-positive-tint-ink ring-positive-tint-border";
  if (status === "ARCHIVED") return "bg-neutral-tint text-ink-secondary ring-border-strong";
  return "bg-accent-tint text-accent-tint-ink ring-accent-tint-border";
}

export function ProductListing() {
  const router = useRouter();
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [meta, setMeta] = useState<ProductListMeta>(emptyMeta);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [idMin, setIdMin] = useState(""); const [idMax, setIdMax] = useState("");
  const [priceMin, setPriceMin] = useState(""); const [priceMax, setPriceMax] = useState("");
  const [stockMin, setStockMin] = useState(""); const [stockMax, setStockMax] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mutating, setMutating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [typeChooserOpen, setTypeChooserOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | "new" | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    Promise.all([fetch("/api/catalog/categories"), fetch("/api/catalog/brands")])
      .then(async ([categoryResponse, brandResponse]) => {
        const [categoryPayload, brandPayload] = await Promise.all([categoryResponse.json(), brandResponse.json()]);
        if (categoryResponse.ok) setCategories(categoryPayload.data ?? []);
        if (brandResponse.ok) setBrands(brandPayload.data ?? []);
      })
      .catch(() => undefined);
  }, []);

  const queryParams = useCallback((requestedPage = page, perPage = 20) => {
    const params = new URLSearchParams({ page: String(requestedPage), perPage: String(perPage) });
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (categoryId) params.set("categoryId", categoryId);
    if (brandId) params.set("brandId", brandId);
    if (idMin) params.set("idMin", idMin); if (idMax) params.set("idMax", idMax);
    if (priceMin) params.set("priceMin", priceMin); if (priceMax) params.set("priceMax", priceMax);
    if (stockMin) params.set("stockMin", stockMin); if (stockMax) params.set("stockMax", stockMax);
    return params;
  }, [brandId, categoryId, idMax, idMin, page, priceMax, priceMin, search, status, stockMax, stockMin]);

  const loadProducts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/products?${queryParams()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "Products could not be loaded."));
      setItems(payload.data ?? []); setMeta(payload.meta ?? emptyMeta); setSelected(new Set());
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Products could not be loaded."); }
    finally { setLoading(false); }
  }, [queryParams]);

  useEffect(() => { const timer = window.setTimeout(() => void loadProducts(), 0); return () => window.clearTimeout(timer); }, [loadProducts]);

  function toggleAll() { setSelected(selected.size === items.length ? new Set() : new Set(items.map((item) => item.id))); }
  function toggleOne(id: number) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  async function updateProducts(ids: number[], nextStatus: ProductStatus) {
    setMutating(true); setError(""); setNotice("");
    try {
      for (const id of ids) {
        const response = await fetch(`/api/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(errorMessage(payload, "A product could not be updated."));
      }
      setNotice(`${ids.length} ${ids.length === 1 ? "product" : "products"} updated.`); await loadProducts();
    } catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : "Products could not be updated."); }
    finally { setMutating(false); }
  }

  async function deleteProduct(id: number) {
    setMutating(true); setError("");
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(errorMessage(await response.json().catch(() => ({})), "Product could not be deleted."));
      setNotice("Product deleted."); await loadProducts();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Product could not be deleted."); }
    finally { setMutating(false); }
  }

  async function duplicateProduct(id: number) {
    setMutating(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/products/${id}/duplicate`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "Product could not be duplicated."));
      setNotice("Product duplicated as a draft. View it under Draft.");
      await loadProducts();
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Product could not be duplicated.");
    } finally { setMutating(false); }
  }

  async function exportProducts() {
    setExporting(true); setError("");
    try {
      const firstResponse = await fetch(`/api/products?${queryParams(1, 100)}`); const first = await firstResponse.json();
      if (!firstResponse.ok) throw new Error(errorMessage(first, "Export could not be prepared."));
      const exported: ProductListItem[] = [...(first.data ?? [])];
      for (let nextPage = 2; nextPage <= (first.meta?.totalPages ?? 1); nextPage += 1) {
        const response = await fetch(`/api/products?${queryParams(nextPage, 100)}`); const payload = await response.json();
        if (!response.ok) throw new Error(errorMessage(payload, "Export could not be prepared.")); exported.push(...(payload.data ?? []));
      }
      const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const rows = [["ID", "Title", "SKU", "Category", "Brand", "Status", "Variants", "Stock", "Price"], ...exported.map((item) => [item.id, item.title, item.sku, item.category.title, item.brand?.title, item.status, item._count.variants, item.inventory.stockQty, item.variants[0]?.salePrice ?? item.variants[0]?.price ?? ""])];
      const blob = new Blob([rows.map((row) => row.map(quote).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `products-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : "Export failed."); }
    finally { setExporting(false); }
  }

  const filtersActive = Boolean(searchInput || status || categoryId || brandId || idMin || idMax || priceMin || priceMax || stockMin || stockMax);

  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink sm:text-2xl">Products</h1><p className="mt-1 text-[13.5px] text-ink-muted">Manage catalogue details, pricing, variants and stock availability.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setTypeChooserOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white hover:bg-[#1d2939]"><Plus className="h-4 w-4" />Add product</button><button type="button" onClick={() => void exportProducts()} disabled={exporting} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink-secondary shadow-card hover:bg-neutral-tint disabled:opacity-55">{exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Export</button><button type="button" onClick={() => setImportOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong"><Upload className="h-4 w-4" />Import</button></div>
    </div>

    <div className="mt-6 border-b border-border"><div className="flex gap-1 overflow-x-auto">{["", "ACTIVE", "DRAFT", "ARCHIVED"].map((value) => <button key={value || "ALL"} type="button" onClick={() => { setStatus(value); setPage(1); }} className={cn("relative shrink-0 px-3 py-2.5 text-[13px] font-semibold transition-colors", status === value ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent" : "text-ink-muted hover:text-ink")}>{value ? value[0] + value.slice(1).toLowerCase() : "All products"}</button>)}</div></div>

    <div className="mt-4 flex flex-col gap-2.5 lg:flex-row lg:items-center">
      <label className="relative block flex-1 lg:max-w-md"><span className="sr-only">Search products</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search title, SKU, MPN or slug" className="h-10 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-[13px] text-ink shadow-card outline-none placeholder:text-ink-faint focus:border-accent-strong focus:ring-2 focus:ring-accent-tint-border" /></label>
      <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} aria-label="Filter by category" className="h-10 rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink-secondary shadow-card outline-none focus:border-accent-strong"><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <select value={brandId} onChange={(event) => { setBrandId(event.target.value); setPage(1); }} aria-label="Filter by brand" className="h-10 rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink-secondary shadow-card outline-none focus:border-accent-strong"><option value="">All brands</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <span className="ml-auto text-xs text-ink-muted">{meta.total} {meta.total === 1 ? "product" : "products"}</span>
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <RangeInput label="Minimum ID" value={idMin} onChange={(value) => { setIdMin(value); setPage(1); }} />
      <RangeInput label="Maximum ID" value={idMax} onChange={(value) => { setIdMax(value); setPage(1); }} />
      <RangeInput label="Minimum price" value={priceMin} step="0.01" onChange={(value) => { setPriceMin(value); setPage(1); }} />
      <RangeInput label="Maximum price" value={priceMax} step="0.01" onChange={(value) => { setPriceMax(value); setPage(1); }} />
      <RangeInput label="Minimum quantity" value={stockMin} onChange={(value) => { setStockMin(value); setPage(1); }} />
      <RangeInput label="Maximum quantity" value={stockMax} onChange={(value) => { setStockMax(value); setPage(1); }} />
    </div>

    {notice ? <div className="mt-4 flex items-center justify-between rounded-md bg-positive-tint px-3.5 py-2.5 text-xs text-positive-tint-ink ring-1 ring-inset ring-positive-tint-border"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div> : null}
    {selected.size ? <BulkBar count={selected.size} disabled={mutating} onUpdate={(nextStatus) => void updateProducts([...selected], nextStatus)} onClear={() => setSelected(new Set())} /> : null}

    {error ? <ErrorState message={error} onRetry={loadProducts} /> : loading ? <LoadingState /> : items.length === 0 ? <EmptyState filtered={filtersActive} onClear={() => { setSearchInput(""); setStatus(""); setCategoryId(""); setBrandId(""); setIdMin(""); setIdMax(""); setPriceMin(""); setPriceMax(""); setStockMin(""); setStockMax(""); setPage(1); }} onImport={() => setImportOpen(true)} /> : <><DesktopTable items={items} selected={selected} disabled={mutating} onToggleAll={toggleAll} onToggle={toggleOne} onStatus={(id, nextStatus) => void updateProducts([id], nextStatus)} onEdit={setEditingProduct} onDuplicate={(id) => void duplicateProduct(id)} onDelete={(id) => void deleteProduct(id)} /><MobileList items={items} disabled={mutating} onStatus={(id, nextStatus) => void updateProducts([id], nextStatus)} onEdit={setEditingProduct} onDuplicate={(id) => void duplicateProduct(id)} onDelete={(id) => void deleteProduct(id)} /></>}

    {!loading && !error && meta.totalPages > 1 ? <div className="mt-5 flex items-center justify-between border-t border-border pt-4"><p className="text-xs text-ink-muted">Page {meta.page} of {meta.totalPages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-ink-secondary shadow-card disabled:opacity-45"><ChevronLeft className="h-4 w-4" />Previous</button><button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-ink-secondary shadow-card disabled:opacity-45">Next<ChevronRight className="h-4 w-4" /></button></div></div> : null}
    {importOpen ? <ImportDialog onClose={() => setImportOpen(false)} onComplete={(message) => { setImportOpen(false); setNotice(message); void loadProducts(); }} /> : null}
    {typeChooserOpen ? <ProductTypeChooser onClose={() => setTypeChooserOpen(false)} onContinue={(type) => { setTypeChooserOpen(false); router.push(`/products/new?type=${type}`); }} /> : null}
    {editingProduct ? <ProductDialog product={editingProduct === "new" ? null : editingProduct} creationType="standard" categories={categories} brands={brands} onClose={() => setEditingProduct(null)} onComplete={(message) => { setEditingProduct(null); setNotice(message); void loadProducts(); }} /> : null}
  </div>;
}

function ProductThumb({ item }: { item: ProductListItem }) {
  return <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-neutral-tint">{item.featuredMedia ? <Image src={mediaFileUrl(item.featuredMedia.url)} alt={item.featuredMedia.altText || ""} fill unoptimized sizes="44px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-ink-faint"><Package className="h-5 w-5" /></div>}</div>;
}

function Stock({ item }: { item: ProductListItem }) {
  const tone = item.inventory.outOfStock ? "text-danger-tint-ink" : item.inventory.lowStock ? "text-accent-tint-ink" : "text-positive-tint-ink";
  return <div><p className={cn("text-[13px] font-semibold", tone)}>{item.inventory.stockQty}</p><p className="mt-0.5 text-[10.5px] text-ink-muted">{item.inventory.outOfStock ? "Out of stock" : item.inventory.lowStock ? "Low stock" : "In stock"}</p></div>;
}

function StatusSelect({ item, disabled, onChange }: { item: ProductListItem; disabled: boolean; onChange: (status: ProductStatus) => void }) {
  return <select value={item.status} disabled={disabled} onChange={(event) => onChange(event.target.value as ProductStatus)} aria-label={`Change status for ${item.title}`} className={cn("rounded-full px-2 py-1 text-[10.5px] font-semibold ring-1 ring-inset outline-none", statusClass(item.status))}><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>;
}

function DesktopTable({ items, selected, disabled, onToggleAll, onToggle, onStatus, onEdit, onDuplicate, onDelete }: { items: ProductListItem[]; selected: Set<number>; disabled: boolean; onToggleAll: () => void; onToggle: (id: number) => void; onStatus: (id: number, status: ProductStatus) => void; onEdit: (item: ProductListItem) => void; onDuplicate: (id: number) => void; onDelete: (id: number) => void }) {
  return <div className="mt-4 hidden overflow-x-auto rounded-lg border border-border bg-surface shadow-card md:block"><table className="w-full min-w-[980px] border-collapse"><thead><tr className="border-b border-border bg-canvas text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted"><th className="w-12 px-4 py-3"><input type="checkbox" checked={selected.size === items.length} onChange={onToggleAll} aria-label="Select all products" className="h-4 w-4 accent-ink" /></th><th className="px-2 py-3">ID</th><th className="px-2 py-3">Product</th><th className="px-3 py-3">Reference</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Price (excl.)</th><th className="px-3 py-3">Price (incl.)</th><th className="px-3 py-3">Quantity</th><th className="px-3 py-3">Variants</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Updated</th><th className="w-14 px-3 py-3" /></tr></thead><tbody>{items.map((item) => { const variant = item.variants[0]; return <tr key={item.id} className="border-b border-border last:border-0 hover:bg-canvas/70"><td className="px-4 py-3"><input type="checkbox" checked={selected.has(item.id)} onChange={() => onToggle(item.id)} aria-label={`Select ${item.title}`} className="h-4 w-4 accent-ink" /></td><td className="px-2 py-3 text-xs font-semibold text-ink-secondary">{item.id}</td><td className="px-2 py-3"><div className="flex min-w-60 items-center gap-3"><ProductThumb item={item} /><div className="min-w-0"><p className="max-w-72 truncate text-[13px] font-semibold text-ink">{item.title}</p><p className="mt-0.5 font-mono text-[10.5px] text-ink-muted">{item.sku || item.mpn || `ID-${item.id}`}</p></div></div></td><td className="px-3 py-3 font-mono text-[10.5px] text-ink-secondary">{item.sku || item.mpn || "—"}</td><td className="px-3 py-3"><p className="max-w-36 truncate text-xs font-medium text-ink-secondary">{item.category.title}</p><p className="mt-0.5 max-w-36 truncate text-[10.5px] text-ink-muted">{item.brand?.title || "No brand"}</p></td><td className="px-3 py-3"><p className="text-[13px] font-semibold text-ink">{money(variant?.salePrice ?? variant?.price)}</p>{variant?.salePrice ? <p className="mt-0.5 text-[10.5px] text-ink-muted line-through">{money(variant.price)}</p> : null}</td><td className="px-3 py-3 text-[13px] font-semibold text-ink">{priceIncludingTax(item, variant?.salePrice ?? variant?.price)}</td><td className="px-3 py-3"><Stock item={item} /></td><td className="px-3 py-3 text-xs font-medium text-ink-secondary">{item._count.variants}</td><td className="px-3 py-3"><StatusSelect item={item} disabled={disabled} onChange={(nextStatus) => onStatus(item.id, nextStatus)} /></td><td className="px-3 py-3 text-xs text-ink-muted">{new Date(item.updatedAt).toLocaleDateString("en-GB")}</td><td className="px-3 py-3"><RowActions item={item} disabled={disabled} onStatus={(nextStatus) => onStatus(item.id, nextStatus)} onEdit={() => onEdit(item)} onDuplicate={() => onDuplicate(item.id)} onDelete={() => onDelete(item.id)} /></td></tr>; })}</tbody></table></div>;
}

function MobileList({ items, disabled, onStatus, onEdit, onDuplicate, onDelete }: { items: ProductListItem[]; disabled: boolean; onStatus: (id: number, status: ProductStatus) => void; onEdit: (item: ProductListItem) => void; onDuplicate: (id: number) => void; onDelete: (id: number) => void }) {
  return <div className="mt-4 space-y-3 md:hidden">{items.map((item) => { const variant = item.variants[0]; return <article key={item.id} className="rounded-lg border border-border bg-surface p-3 shadow-card"><div className="flex gap-3"><ProductThumb item={item} /><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h2 className="truncate text-[13.5px] font-semibold text-ink">{item.title}</h2><p className="mt-0.5 truncate font-mono text-[10.5px] text-ink-muted">{item.sku || item.mpn || `ID-${item.id}`}</p></div><RowActions item={item} disabled={disabled} onStatus={(nextStatus) => onStatus(item.id, nextStatus)} onEdit={() => onEdit(item)} onDuplicate={() => onDuplicate(item.id)} onDelete={() => onDelete(item.id)} /></div></div></div><div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3"><div><p className="text-[10.5px] text-ink-muted">Price</p><p className="mt-1 text-xs font-semibold text-ink">{money(variant?.salePrice ?? variant?.price)}</p></div><div><p className="text-[10.5px] text-ink-muted">Stock</p><div className="mt-0.5"><Stock item={item} /></div></div><div><p className="text-[10.5px] text-ink-muted">Status</p><div className="mt-1"><StatusSelect item={item} disabled={disabled} onChange={(nextStatus) => onStatus(item.id, nextStatus)} /></div></div></div><p className="mt-3 truncate text-xs text-ink-muted">{item.category.title} · {item.brand?.title || "No brand"} · {item._count.variants} {item._count.variants === 1 ? "variant" : "variants"}</p></article>; })}</div>;
}

function RowActions({ item, disabled, onStatus, onEdit, onDuplicate, onDelete }: { item: ProductListItem; disabled: boolean; onStatus: (status: ProductStatus) => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function toggleMenu() {
    if (open) {
      setOpen(false);
      setConfirming(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 176;
    const menuHeight = 184;
    const spaceBelow = window.innerHeight - rect.bottom;
    setPosition({
      top: Math.max(8, spaceBelow >= menuHeight + 8 ? rect.bottom + 4 : rect.top - menuHeight - 4),
      left: Math.min(window.innerWidth - menuWidth - 8, Math.max(8, rect.right - menuWidth)),
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const closeFromPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setConfirming(false);
        buttonRef.current?.focus();
      }
    };
    const closeFromViewportChange = () => {
      setOpen(false);
      setConfirming(false);
    };
    document.addEventListener("pointerdown", closeFromPointer);
    document.addEventListener("keydown", closeFromKeyboard);
    window.addEventListener("resize", closeFromViewportChange);
    window.addEventListener("scroll", closeFromViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", closeFromPointer);
      document.removeEventListener("keydown", closeFromKeyboard);
      window.removeEventListener("resize", closeFromViewportChange);
      window.removeEventListener("scroll", closeFromViewportChange, true);
    };
  }, [open]);

  const menu = open ? createPortal(
    <div ref={menuRef} role="menu" aria-label={`Actions for ${item.title}`} style={{ top: position.top, left: position.left }} className="fixed z-[70] w-44 rounded-lg border border-border bg-surface p-1.5 shadow-panel">
      {confirming ? <div className="p-2"><p className="text-xs font-medium leading-5 text-danger-tint-ink">Delete this product?</p><div className="mt-2 flex gap-1.5"><button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-border px-2 py-1.5 text-[10.5px] font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={() => { setOpen(false); onDelete(); }} className="rounded-md bg-danger px-2 py-1.5 text-[10.5px] font-semibold text-white">Delete</button></div></div> : <><button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-neutral-tint"><Pencil className="h-4 w-4" />Edit product</button><button type="button" role="menuitem" onClick={() => { setOpen(false); onDuplicate(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-neutral-tint"><Copy className="h-4 w-4" />Duplicate product</button><button type="button" role="menuitem" onClick={() => { setOpen(false); onStatus(item.status === "ACTIVE" ? "DRAFT" : "ACTIVE"); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-neutral-tint"><CheckCircle2 className="h-4 w-4" />{item.status === "ACTIVE" ? "Move to draft" : "Activate"}</button><button type="button" role="menuitem" onClick={() => { setOpen(false); onStatus("ARCHIVED"); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-neutral-tint"><Archive className="h-4 w-4" />Archive</button><button type="button" role="menuitem" onClick={() => setConfirming(true)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-danger-tint-ink hover:bg-danger-tint"><Trash2 className="h-4 w-4" />Delete</button></>}
    </div>,
    document.body,
  ) : null;

  return <><button ref={buttonRef} type="button" disabled={disabled} onClick={toggleMenu} aria-label={`Actions for ${item.title}`} aria-haspopup="menu" aria-expanded={open} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><MoreHorizontal className="h-4 w-4" /></button>{menu}</>;
}

function BulkBar({ count, disabled, onUpdate, onClear }: { count: number; disabled: boolean; onUpdate: (status: ProductStatus) => void; onClear: () => void }) {
  return <div className="mt-4 flex flex-col gap-3 rounded-lg bg-ink px-4 py-3 text-white sm:flex-row sm:items-center"><p className="text-[13px] font-semibold">{count} selected</p><div className="flex flex-wrap gap-2 sm:ml-auto"><button type="button" disabled={disabled} onClick={() => onUpdate("ACTIVE")} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15">Activate</button><button type="button" disabled={disabled} onClick={() => onUpdate("DRAFT")} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15">Move to draft</button><button type="button" disabled={disabled} onClick={() => onUpdate("ARCHIVED")} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15">Archive</button><button type="button" onClick={onClear} className="px-2 py-1.5 text-xs font-semibold text-white/70 hover:text-white">Clear</button></div></div>;
}

function LoadingState() { return <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="flex items-center gap-3 border-b border-border p-3 last:border-0"><div className="h-11 w-11 animate-pulse rounded-md bg-neutral-tint" /><div className="flex-1"><div className="h-3 w-48 max-w-full animate-pulse rounded bg-neutral-tint" /><div className="mt-2 h-2.5 w-28 animate-pulse rounded bg-neutral-tint" /></div><div className="hidden h-5 w-20 animate-pulse rounded-full bg-neutral-tint sm:block" /></div>)}</div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-lg border border-danger-tint-border bg-danger-tint p-8 text-center"><AlertTriangle className="h-7 w-7 text-danger" /><h2 className="mt-4 text-[13.5px] font-semibold text-ink">Products could not be loaded</h2><p className="mt-1 max-w-md text-[13px] leading-5 text-danger-tint-ink">{message}</p><button type="button" onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-white"><RefreshCw className="h-4 w-4" />Try again</button></div>; }
function EmptyState({ filtered, onClear, onImport }: { filtered: boolean; onClear: () => void; onImport: () => void }) { return <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface p-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-tint text-accent-strong"><Package className="h-6 w-6" /></span><h2 className="mt-4 text-[13.5px] font-semibold text-ink">{filtered ? "No products match these filters" : "Your catalogue is empty"}</h2><p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-muted">{filtered ? "Try another search, status, category, or brand." : "Import your product catalogue to begin managing pricing and stock."}</p><button type="button" onClick={filtered ? onClear : onImport} className="mt-5 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-white">{filtered ? <RefreshCw className="h-4 w-4" /> : <Upload className="h-4 w-4" />}{filtered ? "Clear filters" : "Import products"}</button></div>; }

function ProductDialog({ product, creationType, categories, brands, onClose, onComplete }: { product: ProductListItem | null; creationType: ProductCreationType; categories: CatalogOption[]; brands: CatalogOption[]; onClose: () => void; onComplete: (message: string) => void }) {
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState(String(product?.category.id ?? categories[0]?.id ?? ""));
  const [brandId, setBrandId] = useState(String(product?.brand?.id ?? ""));
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "DRAFT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateTitle(value: string) {
    setTitle(value);
    if (!product && (!slug || slug === title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))) {
      setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !slug.trim() || !categoryId) { setError("Name, slug, and category are required."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(product ? `/api/products/${product.id}` : "/api/products", {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), slug: slug.trim(), categoryId: Number(categoryId), ...(sku.trim() ? { sku: sku.trim() } : {}), ...(brandId ? { brandId: Number(brandId) } : {}), status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, `Product could not be ${product ? "updated" : "created"}.`));
      onComplete(`Product ${product ? "updated" : "created"}.`);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Product could not be saved."); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-sidebar/60 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="w-full rounded-t-xl bg-surface shadow-panel sm:max-w-xl sm:rounded-xl"><header className="flex items-start gap-4 border-b border-border px-5 py-4"><div className="flex-1"><h2 id="product-dialog-title" className="text-[13.5px] font-semibold text-ink">{product ? "Edit product" : creationType === "variants" ? "Add product with variants" : "Add standard product"}</h2><p className="mt-1 text-xs text-ink-muted">{product ? "Update the core catalogue identity." : creationType === "variants" ? "Create the catalogue record first, then add its RAM, storage, colour or other configurations." : "Create a single physical catalogue item. Pricing and stock are managed after creation."}</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Close product editor" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint"><X className="h-4 w-4" /></button></header><form onSubmit={submit} className="p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2 text-[13px] font-semibold text-ink-secondary">Product name<input value={title} onChange={(event) => updateTitle(event.target.value)} maxLength={255} autoFocus className="mt-2 h-10 w-full rounded-md border border-border-strong px-3 text-[13px] font-normal text-ink outline-none focus:border-accent-strong" /></label><label className="text-[13px] font-semibold text-ink-secondary">Slug<input value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={255} className="mt-2 h-10 w-full rounded-md border border-border-strong px-3 font-mono text-xs font-normal text-ink outline-none focus:border-accent-strong" /></label><label className="text-[13px] font-semibold text-ink-secondary">Reference / SKU<input value={sku} onChange={(event) => setSku(event.target.value)} maxLength={255} className="mt-2 h-10 w-full rounded-md border border-border-strong px-3 text-[13px] font-normal text-ink outline-none focus:border-accent-strong" /></label><label className="text-[13px] font-semibold text-ink-secondary">Category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none"><option value="">Choose category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-[13px] font-semibold text-ink-secondary">Brand<select value={brandId} onChange={(event) => setBrandId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none"><option value="">No brand</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-[13px] font-semibold text-ink-secondary">Status<select value={status} onChange={(event) => setStatus(event.target.value as ProductStatus)} className="mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none"><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></label></div>{error ? <p role="alert" className="mt-4 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border">{error}</p> : null}<div className="mt-6 flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onClose} disabled={saving} className="rounded-md border border-border px-4 py-2 text-[13px] font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{saving ? "Saving…" : product ? "Save changes" : "Add product"}</button></div></form></section></div>;
}

function ImportDialog({ onClose, onComplete }: { onClose: () => void; onComplete: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null); const [file, setFile] = useState<File | null>(null); const [uploading, setUploading] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); if (!file) { setError("Choose a JSON or CSV file."); return; } setUploading(true); setError(""); try { const body = new FormData(); body.set("file", file); const response = await fetch("/api/products/import", { method: "POST", body }); const payload = await response.json(); if (!response.ok) throw new Error(errorMessage(payload, "Import failed.")); const result = payload.data; onComplete(`Import complete: ${result.created} created, ${result.updated} updated${result.errors.length ? `, ${result.errors.length} failed` : ""}.`); } catch (importError) { setError(importError instanceof Error ? importError.message : "Import failed."); } finally { setUploading(false); } }
  function choose(event: ChangeEvent<HTMLInputElement>) { const next = event.target.files?.[0] ?? null; if (next && !/\.(json|csv)$/i.test(next.name)) { setError("Only JSON and CSV product imports are supported."); return; } if (next && next.size > 5 * 1024 * 1024) { setError("Import files must be 5 MB or smaller."); return; } setFile(next); setError(""); }
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-sidebar/60 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !uploading) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="import-title" className="w-full rounded-t-xl bg-surface shadow-panel sm:max-w-lg sm:rounded-xl"><header className="flex items-start gap-4 border-b border-border px-5 py-4"><div className="flex-1"><h2 id="import-title" className="text-[13.5px] font-semibold text-ink">Import products</h2><p className="mt-1 text-xs text-ink-muted">Create or update up to 5,000 products from JSON or CSV.</p></div><button type="button" onClick={onClose} disabled={uploading} aria-label="Close import" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint"><X className="h-4 w-4" /></button></header><form onSubmit={submit} className="p-5"><button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-40 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-canvas p-6 text-center hover:border-accent-strong"><FileJson className="h-7 w-7 text-ink-muted" /><span className="mt-3 text-[13.5px] font-semibold text-ink">{file ? file.name : "Choose an import file"}</span><span className="mt-1 text-xs text-ink-muted">JSON or CSV · maximum 5 MB</span></button><input ref={inputRef} type="file" accept=".json,.csv,application/json,text/csv" onChange={choose} className="sr-only" />{error ? <p role="alert" className="mt-4 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border">{error}</p> : null}<div className="mt-6 flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onClose} disabled={uploading} className="rounded-md border border-border px-4 py-2 text-[13px] font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={!file || uploading} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{uploading ? "Importing…" : "Import"}</button></div></form></section></div>;
}
