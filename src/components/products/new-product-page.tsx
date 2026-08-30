"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, CircleHelp, Layers3, LoaderCircle, Package, Save, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { CatalogOption, ProductListItem, ProductStatus } from "@/lib/products";

type ProductType = "standard" | "variants";
type Tab = "description" | "details" | "stock" | "shipping" | "seo" | "options";

const tabs: { id: Tab; label: string }[] = [
  { id: "description", label: "Description" },
  { id: "details", label: "Details" },
  { id: "stock", label: "Stock & pricing" },
  { id: "shipping", label: "Shipping" },
  { id: "seo", label: "SEO" },
  { id: "options", label: "Options" },
];

function messageFrom(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  }
  return "The product could not be created.";
}

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "text-[13px] font-semibold text-ink-secondary";

function HelpTooltip({ label, children }: { label: string; children: string }) {
  return <Tooltip><TooltipTrigger render={<button type="button" aria-label={`Help for ${label}`} className="inline-flex h-5 w-5 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink" />}><CircleHelp className="h-3.5 w-3.5" /></TooltipTrigger><TooltipContent side="top" align="start" className="max-w-72 bg-ink px-3 py-2 text-[11px] leading-4 text-white shadow-panel">{children}</TooltipContent></Tooltip>;
}

export function NewProductPage({ productType }: { productType: ProductType }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("description");
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [mpn, setMpn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState<number[]>([]);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [relatedSearch, setRelatedSearch] = useState("");
  const [relatedResults, setRelatedResults] = useState<ProductListItem[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<ProductListItem[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("");
  const [returnableDays, setReturnableDays] = useState("30");
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [isReturnable, setIsReturnable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isTopProduct, setIsTopProduct] = useState(false);
  const [isIndexable, setIsIndexable] = useState(true);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/catalog/categories"), fetch("/api/catalog/brands")])
      .then(async ([categoryResponse, brandResponse]) => {
        const [categoryPayload, brandPayload] = await Promise.all([categoryResponse.json(), brandResponse.json()]);
        if (categoryResponse.ok) setCategories(categoryPayload.data ?? []);
        if (brandResponse.ok) setBrands(brandPayload.data ?? []);
      })
      .catch(() => setError("Categories and brands could not be loaded. Refresh the page to try again."));
  }, []);

  useEffect(() => {
    const query = relatedSearch.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRelatedLoading(true);
      try {
        const response = await fetch(`/api/products?q=${encodeURIComponent(query)}&perPage=8`, { signal: controller.signal });
        const payload = await response.json();
        if (response.ok) setRelatedResults((payload.data ?? []).filter((item: ProductListItem) => !relatedProducts.some((selected) => selected.id === item.id)));
      } catch (searchError) {
        if (!(searchError instanceof DOMException && searchError.name === "AbortError")) setRelatedResults([]);
      } finally { setRelatedLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [relatedProducts, relatedSearch]);

  function updateTitle(value: string) {
    const previousGeneratedSlug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setTitle(value);
    if (!slug || slug === previousGeneratedSlug) setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function submit(event: FormEvent, publish: boolean) {
    event.preventDefault();
    if (!title.trim() || !slug.trim() || !categoryId) {
      setActiveTab("description");
      setError("Product name, slug and default category are required.");
      return;
    }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), slug: slug.trim(), categoryId: Number(categoryId), status: publish ? "ACTIVE" : status,
          ...(sku.trim() ? { sku: sku.trim() } : {}), ...(mpn.trim() ? { mpn: mpn.trim() } : {}),
          ...(brandId ? { brandId: Number(brandId) } : {}), secondaryCategoryIds, relatedProductIds: relatedProducts.map((item) => item.id), ...(summary.trim() ? { shortDescription: summary.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(warrantyMonths ? { warrantyMonths: Number(warrantyMonths) } : {}),
          isReturnable, returnableDays: Number(returnableDays || 0), isFeatured, isTopProduct, isIndexable,
          ...(metaTitle.trim() ? { metaTitle: metaTitle.trim() } : {}),
          ...(metaDescription.trim() ? { metaDescription: metaDescription.trim() } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(messageFrom(payload));
      router.push("/products"); router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The product could not be created.");
    } finally { setSaving(false); }
  }

  const TypeIcon = productType === "variants" ? Layers3 : Package;

  return <form onSubmit={(event) => void submit(event, false)} className="w-full pb-20"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-muted"><Link href="/products" className="hover:text-ink">Products</Link><ChevronRight className="h-3.5 w-3.5" /><span>Add product</span></nav><h1 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-ink">Add {productType === "variants" ? "product with variants" : "standard product"}</h1><p className="mt-1 text-[13.5px] text-ink-muted">Create one English catalogue record. No localization fields are included.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-neutral-tint px-3 py-1.5 text-xs font-semibold text-ink-secondary ring-1 ring-inset ring-border"><TypeIcon className="h-4 w-4" />{productType === "variants" ? "Variants" : "Standard"}</span></div>

  <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="grid gap-4 border-b border-border p-5 lg:grid-cols-[1fr_220px]"><label className={labelClass}>Product name<input autoFocus value={title} onChange={(event) => updateTitle(event.target.value)} placeholder="e.g. NVIDIA GeForce RTX 4070" maxLength={255} className={inputClass} /></label><label className={labelClass}>Status<select value={status} onChange={(event) => setStatus(event.target.value as ProductStatus)} className={inputClass}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></label></div><div className="overflow-x-auto border-b border-border"><div role="tablist" aria-label="Product sections" className="flex min-w-max px-3">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`border-b px-3 py-3 text-xs font-semibold ${activeTab === tab.id ? "border-ink bg-neutral-tint text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>{tab.label}</button>)}</div></div>

  <div className="p-4 sm:p-5">{activeTab === "description" ? <div className="space-y-5"><div className={labelClass}><span className="inline-flex items-center gap-1">Summary<HelpTooltip label="Summary">Write a short product overview for catalogue cards and search results. Keep it clear, specific and avoid repeating the full description.</HelpTooltip></span><RichTextEditor value={summary} onChange={setSummary} ariaLabel="Product summary" placeholder="A concise description for product cards and search results." maxLength={800} minHeight="sm" /></div><div className={labelClass}><span className="inline-flex items-center gap-1">Description<HelpTooltip label="Description">Add detailed product information such as features, specifications, compatibility, included items and usage guidance.</HelpTooltip></span><RichTextEditor value={description} onChange={setDescription} ariaLabel="Product description" placeholder="Describe features, compatibility and what is included." minHeight="lg" /></div><div><p className={labelClass}>Categories<HelpTooltip label="Categories">Choose every category where customers should find this product. One category must be selected as the default.</HelpTooltip></p><div className="mt-2 flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-border-strong bg-surface p-2">{categoryId ? <span className="inline-flex items-center rounded-md bg-ink px-2.5 py-1 text-xs font-semibold text-white">{categories.find((item) => item.id === Number(categoryId))?.title}<span className="ml-1.5 text-white/60">Default</span></span> : null}{secondaryCategoryIds.map((id) => { const category = categories.find((item) => item.id === id); return category ? <span key={id} className="inline-flex items-center gap-1 rounded-md bg-neutral-tint px-2.5 py-1 text-xs font-medium text-ink-secondary">{category.title}<button type="button" onClick={() => setSecondaryCategoryIds((current) => current.filter((value) => value !== id))} aria-label={`Remove ${category.title}`} className="text-ink-muted hover:text-ink"><X className="h-3.5 w-3.5" /></button></span> : null; })}{!categoryId && secondaryCategoryIds.length === 0 ? <span className="text-xs text-ink-faint">No categories selected</span> : null}</div><button type="button" onClick={() => setCategoryPickerOpen((open) => !open)} aria-expanded={categoryPickerOpen} className="mt-2 h-9 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">{categoryPickerOpen ? "Close category chooser" : "Choose categories"}</button>{categoryPickerOpen ? <div className="mt-2 grid max-h-52 gap-1 overflow-y-auto rounded-md border border-border bg-canvas p-2 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => { const isDefault = category.id === Number(categoryId); const checked = isDefault || secondaryCategoryIds.includes(category.id); return <label key={category.id} className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-xs text-ink-secondary hover:bg-surface"><input type="checkbox" checked={checked} disabled={isDefault} onChange={(event) => setSecondaryCategoryIds((current) => event.target.checked ? [...current, category.id] : current.filter((id) => id !== category.id))} className="h-4 w-4 accent-ink" /><span className="truncate">{category.title}</span>{isDefault ? <span className="ml-auto text-[10.5px] text-ink-muted">Default</span> : null}</label>; })}</div> : null}</div><label className={labelClass}><span className="inline-flex items-center gap-1">Default category<HelpTooltip label="Default category">The primary category controls catalogue placement, breadcrumbs and the product URL structure.</HelpTooltip></span><select value={categoryId} onChange={(event) => { const nextId = event.target.value; setCategoryId(nextId); setSecondaryCategoryIds((current) => current.filter((id) => id !== Number(nextId))); }} className={inputClass}><option value="">Choose default category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><span className="mt-1 block text-[10.5px] font-normal leading-4 text-ink-muted">The primary category used for breadcrumbs, URLs and catalogue placement.</span></label><label className={labelClass}><span className="inline-flex items-center gap-1">Brand<HelpTooltip label="Brand">Select the product manufacturer or brand. Leave this empty only for genuinely unbranded products.</HelpTooltip></span><select value={brandId} onChange={(event) => setBrandId(event.target.value)} className={inputClass}><option value="">No brand</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div><label className={labelClass}><span className="inline-flex items-center gap-1">Related products<HelpTooltip label="Related products">Add closely connected products such as compatible accessories, upgrades or commonly purchased items.</HelpTooltip></span><div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><Input value={relatedSearch} onChange={(event) => { const value = event.target.value; setRelatedSearch(value); if (value.trim().length < 2) setRelatedResults([]); }} placeholder="Search by product name, SKU or slug" className={`${inputClass} mt-0 pl-9`} />{relatedLoading ? <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-muted" /> : null}</div></label>{relatedResults.length ? <div className="mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-card">{relatedResults.map((item) => <button key={item.id} type="button" onClick={() => { setRelatedProducts((current) => [...current, item]); setRelatedSearch(""); setRelatedResults([]); }} className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-neutral-tint"><span className="min-w-0 truncate text-xs font-semibold text-ink">{item.title}</span><span className="shrink-0 font-mono text-[10.5px] text-ink-muted">{item.sku || `ID-${item.id}`}</span></button>)}</div> : relatedSearch.trim().length >= 2 && !relatedLoading ? <p className="mt-2 text-xs text-ink-muted">No matching products found.</p> : null}{relatedProducts.length ? <div className="mt-2 flex flex-wrap gap-2">{relatedProducts.map((item) => <span key={item.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-neutral-tint px-2.5 py-1.5 text-xs font-medium text-ink-secondary"><span className="truncate">{item.title}</span><button type="button" onClick={() => setRelatedProducts((current) => current.filter((product) => product.id !== item.id))} aria-label={`Remove ${item.title}`} className="shrink-0 text-ink-muted hover:text-ink"><X className="h-3.5 w-3.5" /></button></span>)}</div> : <p className="mt-2 text-xs text-ink-muted">Optional products to recommend alongside this item.</p>}</div></div> : null}
  {activeTab === "details" ? <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Slug<input value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={255} className={`${inputClass} font-mono text-xs`} /></label><label className={labelClass}>SKU / reference<input value={sku} onChange={(event) => setSku(event.target.value)} maxLength={255} className={inputClass} /></label><label className={labelClass}>Manufacturer part number (MPN)<input value={mpn} onChange={(event) => setMpn(event.target.value)} maxLength={255} className={inputClass} /></label><label className={labelClass}>Warranty (months)<input type="number" min="0" value={warrantyMonths} onChange={(event) => setWarrantyMonths(event.target.value)} className={inputClass} /></label></div> : null}
  {activeTab === "stock" ? <div className="rounded-lg bg-accent-tint p-4 text-[13px] leading-5 text-accent-tint-ink ring-1 ring-inset ring-accent-tint-border">{productType === "variants" ? "Save the catalogue record first. Pricing and stock are then assigned to each product variant." : "Save the catalogue record first, then add its price and opening stock from the product variants section."}</div> : null}
  {activeTab === "shipping" ? <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Return window (days)<input type="number" min="0" value={returnableDays} disabled={!isReturnable} onChange={(event) => setReturnableDays(event.target.value)} className={inputClass} /></label><label className="flex items-center gap-3 self-end rounded-md border border-border p-3 text-[13px] font-semibold text-ink-secondary"><input type="checkbox" checked={isReturnable} onChange={(event) => setIsReturnable(event.target.checked)} className="h-4 w-4 accent-ink" />This product can be returned</label></div> : null}
  {activeTab === "seo" ? <div className="space-y-4"><label className={labelClass}>Meta title<input value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} maxLength={255} className={inputClass} /></label><label className={labelClass}>Meta description<textarea value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} rows={4} className={`${inputClass} h-auto py-3 leading-5`} /></label><label className="flex items-center gap-3 rounded-md border border-border p-3 text-[13px] font-semibold text-ink-secondary"><input type="checkbox" checked={isIndexable} onChange={(event) => setIsIndexable(event.target.checked)} className="h-4 w-4 accent-ink" />Allow search engines to index this product</label></div> : null}
  {activeTab === "options" ? <div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-md border border-border p-3 text-[13px] font-semibold text-ink-secondary"><input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} className="h-4 w-4 accent-ink" />Feature this product</label><label className="flex items-center gap-3 rounded-md border border-border p-3 text-[13px] font-semibold text-ink-secondary"><input type="checkbox" checked={isTopProduct} onChange={(event) => setIsTopProduct(event.target.checked)} className="h-4 w-4 accent-ink" />Mark as top product</label></div> : null}</div></section>

  {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}<div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64"><div className="flex w-full items-center justify-between gap-3"><Link href="/products" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3.5 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint"><ArrowLeft className="h-4 w-4" />Back to products</Link><div className="flex gap-2"><button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Save className="h-4 w-4" />Save draft</button><button type="button" disabled={saving} onClick={(event) => void submit(event as unknown as FormEvent, true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white hover:bg-[#1d2939] disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save and publish</button></div></div></div></form>;
}
