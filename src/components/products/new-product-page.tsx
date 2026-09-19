"use client";

import { CURRENCY, CURRENCY_SYMBOL } from "@/lib/currency";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, CircleHelp, FileText, Layers3, LoaderCircle, Package, Plus, Save, Search, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ProductImagesEditor, type ProductImagesHandle } from "@/components/products/product-images-editor";
import { ProductVariantsEditor, type ProductVariantsHandle } from "@/components/products/product-variants-editor";
import type { CatalogOption, ProductListItem, ProductStatus } from "@/lib/products";

type ProductType = "standard" | "variants";
type Tab = "description" | "details" | "variants" | "stock" | "shipping" | "seo";
type ProductFeature = { id: string; name: string; value: string };
type TaxRate = { id: number; title: string; ratePercent: string; isDefault?: boolean };
type ShippingMethod = { id: number; title: string; carrier: string; estimatedDaysMin: number | null; estimatedDaysMax: number | null; status: string };
type ProductDetail = {
  id: number; title: string; slug: string; sku: string | null; mpn: string | null; gtin: string | null; upc: string | null;
  categoryId: number; brandId: number | null; productConditionId: number | null; taxRateId: number | null; status: ProductStatus;
  shortDescription: string | null; description: string | null; specsSummary: Record<string, unknown> | null;
  warrantyMonths: number | null; allowCustomization: boolean; customizationInstructions: string | null; costPrice: string | null;
  minimumOrderQuantity: number; stockLocation: string | null; receiveLowStockAlert: boolean; outOfStockBehavior: "DENY" | "ALLOW";
  inStockLabel: string | null; outOfStockLabel: string | null; availabilityDate: string | null;
  deliveryTimeMode: "NONE" | "DEFAULT" | "SPECIFIC"; inStockDeliveryTime: string | null; outOfStockDeliveryTime: string | null;
  additionalShippingCost: string | null; isReturnable: boolean; returnableDays: number; isIndexable: boolean;
  metaTitle: string | null; metaDescription: string | null; seoTags: string[]; offlineRedirectBehavior: "NOT_FOUND" | "GONE" | "REDIRECT_CATEGORY_301" | "REDIRECT_CATEGORY_302";
  redirectTargetCategoryId: number | null;
  secondaryCategories: { categoryId: number }[]; relatedProducts: { relatedProduct: ProductListItem }[];
  shippingMethods: { shippingMethodId: number }[];
  variants: { title: string; slug: string; price: string; salePrice: string | null; stockQty: number; lowStockThreshold: number; weightKg: string | null; widthCm: string | null; heightCm: string | null; lengthCm: string | null; attributes?: unknown[] }[];
};

const tabs: { id: Tab; label: string }[] = [
  { id: "description", label: "Description" },
  { id: "details", label: "Details" },
  { id: "variants", label: "Variants" },
  { id: "stock", label: "Stock & pricing" },
  { id: "shipping", label: "Shipping" },
  { id: "seo", label: "SEO" },
];

function messageFrom(payload: unknown, fallback = "The product could not be created.") {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  }
  return fallback;
}

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "text-[13px] font-semibold text-ink-secondary";

function HelpTooltip({ label, children }: { label: string; children: string }) {
  return <Tooltip><TooltipTrigger render={<button type="button" aria-label={`Help for ${label}`} className="inline-flex h-5 w-5 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink" />}><CircleHelp className="h-3.5 w-3.5" /></TooltipTrigger><TooltipContent side="top" align="start" className="max-w-72 bg-ink px-3 py-2 text-[11px] leading-4 text-white shadow-panel">{children}</TooltipContent></Tooltip>;
}

function AttachedFilesSection() {
  return <section><div className="mb-3"><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">Attached files<HelpTooltip label="Attached files">Manuals, technical datasheets and warranty documents can be attached after the catalogue record has been created.</HelpTooltip></h2><p className="mt-1 text-xs text-ink-muted">Customer-downloadable manuals, datasheets and warranty PDFs.</p></div><div className="flex items-start gap-3 rounded-md bg-neutral-tint p-4 ring-1 ring-inset ring-border"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" /><div><p className="text-xs font-semibold text-ink">Save this product before adding files</p><p className="mt-1 text-xs leading-5 text-ink-muted">Attachments need a product record to link to. After saving, add documents from the product’s media section.</p></div></div></section>;
}

export function NewProductPage({ productType, productId }: { productType: ProductType; productId?: number }) {
  const router = useRouter();
  const imagesRef = useRef<ProductImagesHandle>(null);
  const variantsRef = useRef<ProductVariantsHandle>(null);
  const [resolvedProductType, setResolvedProductType] = useState<ProductType>(productType);
  const [activeTab, setActiveTab] = useState<Tab>("description");
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [mpn, setMpn] = useState("");
  const [gtin, setGtin] = useState("");
  const [upc, setUpc] = useState("");
  const [conditions, setConditions] = useState<CatalogOption[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxRateId, setTaxRateId] = useState("");
  const [productConditionId, setProductConditionId] = useState("");
  const [featureName, setFeatureName] = useState("");
  const [featureValue, setFeatureValue] = useState("");
  const [features, setFeatures] = useState<ProductFeature[]>([]);
  const [allowCustomization, setAllowCustomization] = useState(false);
  const [customizationInstructions, setCustomizationInstructions] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState("1");
  const [stockLocation, setStockLocation] = useState("");
  const [receiveLowStockAlert, setReceiveLowStockAlert] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [outOfStockBehavior, setOutOfStockBehavior] = useState<"DENY" | "ALLOW">("DENY");
  const [inStockLabel, setInStockLabel] = useState("");
  const [outOfStockLabel, setOutOfStockLabel] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [packageWidth, setPackageWidth] = useState("");
  const [packageHeight, setPackageHeight] = useState("");
  const [packageDepth, setPackageDepth] = useState("");
  const [packageWeight, setPackageWeight] = useState("");
  const [deliveryTimeMode, setDeliveryTimeMode] = useState<"NONE" | "DEFAULT" | "SPECIFIC">("DEFAULT");
  const [inStockDeliveryTime, setInStockDeliveryTime] = useState("");
  const [outOfStockDeliveryTime, setOutOfStockDeliveryTime] = useState("");
  const [additionalShippingCost, setAdditionalShippingCost] = useState("");
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingMethodIds, setShippingMethodIds] = useState<number[]>([]);
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
  const [isIndexable, setIsIndexable] = useState(true);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [seoTagInput, setSeoTagInput] = useState("");
  const [seoTags, setSeoTags] = useState<string[]>([]);
  const [offlineRedirectBehavior, setOfflineRedirectBehavior] = useState<"NOT_FOUND" | "GONE" | "REDIRECT_CATEGORY_301" | "REDIRECT_CATEGORY_302">("NOT_FOUND");
  const [redirectTargetCategoryId, setRedirectTargetCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(Boolean(productId));
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/catalog/categories"), fetch("/api/catalog/brands"), fetch("/api/catalog/product-conditions"), fetch("/api/catalog/tax-rates"), fetch("/api/shipping-methods")])
      .then(async ([categoryResponse, brandResponse, conditionResponse, taxResponse, shippingResponse]) => {
        const [categoryPayload, brandPayload, conditionPayload, taxPayload, shippingPayload] = await Promise.all([categoryResponse.json(), brandResponse.json(), conditionResponse.json(), taxResponse.json(), shippingResponse.json()]);
        if (categoryResponse.ok) setCategories(categoryPayload.data ?? []);
        if (brandResponse.ok) setBrands(brandPayload.data ?? []);
        if (conditionResponse.ok) setConditions(Array.isArray(conditionPayload) ? conditionPayload : conditionPayload.data ?? []);
        if (taxResponse.ok) {
          const rates = (Array.isArray(taxPayload) ? taxPayload : taxPayload.data ?? []) as TaxRate[];
          setTaxRates(rates);
          const preferred = rates.find((rate) => rate.isDefault) ?? rates.find((rate) => Number(rate.ratePercent) === 20) ?? rates[0];
          if (preferred && !productId) setTaxRateId(String(preferred.id));
        }
        if (shippingResponse.ok) setShippingMethods((Array.isArray(shippingPayload) ? shippingPayload : shippingPayload.data ?? []).filter((method: ShippingMethod) => method.status === "ACTIVE"));
      })
      .catch(() => setError("Categories and brands could not be loaded. Refresh the page to try again."));
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/products/${productId}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(messageFrom(payload, "The product could not be loaded."));
        const product = (payload.data ?? payload) as ProductDetail;
        const variant = product.variants[0];
        if (product.variants.length > 1 || product.variants.some((item) => (item.attributes?.length ?? 0) > 0)) setResolvedProductType("variants");
        setTitle(product.title); setSlug(product.slug); setSku(product.sku ?? ""); setMpn(product.mpn ?? "");
        setGtin(product.gtin ?? ""); setUpc(product.upc ?? ""); setCategoryId(String(product.categoryId));
        setSecondaryCategoryIds(product.secondaryCategories.map((item) => item.categoryId));
        setBrandId(product.brandId ? String(product.brandId) : ""); setProductConditionId(product.productConditionId ? String(product.productConditionId) : "");
        setTaxRateId(product.taxRateId ? String(product.taxRateId) : ""); setStatus(product.status);
        setSummary(product.shortDescription ?? ""); setDescription(product.description ?? "");
        setFeatures(Object.entries(product.specsSummary ?? {}).map(([name, value]) => ({ id: crypto.randomUUID(), name, value: String(value ?? "") })));
        setWarrantyMonths(product.warrantyMonths == null ? "" : String(product.warrantyMonths));
        setAllowCustomization(product.allowCustomization); setCustomizationInstructions(product.customizationInstructions ?? "");
        setCostPrice(product.costPrice ?? ""); setMinimumOrderQuantity(String(product.minimumOrderQuantity ?? 1));
        setStockLocation(product.stockLocation ?? ""); setReceiveLowStockAlert(product.receiveLowStockAlert);
        setOutOfStockBehavior(product.outOfStockBehavior ?? "DENY"); setInStockLabel(product.inStockLabel ?? ""); setOutOfStockLabel(product.outOfStockLabel ?? "");
        setAvailabilityDate(product.availabilityDate?.slice(0, 10) ?? ""); setDeliveryTimeMode(product.deliveryTimeMode ?? "DEFAULT");
        setInStockDeliveryTime(product.inStockDeliveryTime ?? ""); setOutOfStockDeliveryTime(product.outOfStockDeliveryTime ?? "");
        setAdditionalShippingCost(product.additionalShippingCost ?? ""); setShippingMethodIds(product.shippingMethods.map((item) => item.shippingMethodId));
        setRelatedProducts(product.relatedProducts.map((item) => item.relatedProduct));
        setIsReturnable(product.isReturnable); setReturnableDays(String(product.returnableDays ?? 0)); setIsIndexable(product.isIndexable);
        setMetaTitle(product.metaTitle ?? ""); setMetaDescription(product.metaDescription ?? ""); setSeoTags(product.seoTags ?? []);
        setOfflineRedirectBehavior(product.offlineRedirectBehavior ?? "NOT_FOUND");
        setRedirectTargetCategoryId(product.redirectTargetCategoryId ? String(product.redirectTargetCategoryId) : "");
        if (variant) {
          setRetailPrice(variant.price ?? ""); setSalePrice(variant.salePrice ?? ""); setStockQty(String(variant.stockQty));
          setLowStockThreshold(String(variant.lowStockThreshold)); setPackageWeight(variant.weightKg ?? "");
          setPackageWidth(variant.widthCm ?? ""); setPackageHeight(variant.heightCm ?? ""); setPackageDepth(variant.lengthCm ?? "");
        }
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setError(loadError instanceof Error ? loadError.message : "The product could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoadingProduct(false);
      }
    })();
    return () => controller.abort();
  }, [productId]);

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

  function addFeature() {
    const name = featureName.trim();
    const value = featureValue.trim();
    if (!name || !value) return;
    setFeatures((current) => [...current, { id: crypto.randomUUID(), name, value }]);
    setFeatureName("");
    setFeatureValue("");
  }

  function addSeoTag() {
    const tag = seoTagInput.trim().replace(/^#/, "");
    if (!tag || seoTags.some((value) => value.toLowerCase() === tag.toLowerCase())) return;
    setSeoTags((current) => [...current, tag]);
    setSeoTagInput("");
  }

  async function submit(event: FormEvent, publish: boolean) {
    event.preventDefault();
    if (!title.trim() || !slug.trim() || !categoryId) {
      setActiveTab("description");
      setError("Product name, slug and default category are required.");
      return;
    }
    if (gtin && !/^(?:\d{8}|\d{12,14})$/.test(gtin)) {
      setActiveTab("details"); setError("GTIN must contain 8, 12, 13 or 14 digits."); return;
    }
    if (upc && !/^\d{12}$/.test(upc)) {
      setActiveTab("details"); setError("UPC must contain exactly 12 digits."); return;
    }
    if (resolvedProductType === "standard" && salePrice && Number(salePrice) >= Number(retailPrice || 0)) {
      setActiveTab("stock"); setError("Sale price must be lower than the normal retail price."); return;
    }
    setSaving(true); setError("");
    try {
      const response = await fetch(productId ? `/api/products/${productId}` : "/api/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), slug: slug.trim(), categoryId: Number(categoryId), status: publish ? "ACTIVE" : status,
          ...(sku.trim() ? { sku: sku.trim() } : {}), ...(mpn.trim() ? { mpn: mpn.trim() } : {}),
          ...(gtin ? { gtin } : {}), ...(upc ? { upc } : {}),
          ...(productConditionId ? { productConditionId: Number(productConditionId) } : {}),
          ...(taxRateId ? { taxRateId: Number(taxRateId) } : {}),
          ...(features.length ? { specsSummary: Object.fromEntries(features.map((feature) => [feature.name, feature.value])) } : {}),
          ...(brandId ? { brandId: Number(brandId) } : {}), secondaryCategoryIds, relatedProductIds: relatedProducts.map((item) => item.id), ...(summary.trim() ? { shortDescription: summary.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(warrantyMonths ? { warrantyMonths: Number(warrantyMonths) } : {}),
          allowCustomization,
          ...(allowCustomization && customizationInstructions.trim() ? { customizationInstructions: customizationInstructions.trim() } : {}),
          ...(costPrice ? { costPrice: Number(costPrice) } : {}), minimumOrderQuantity: Number(minimumOrderQuantity || 1),
          ...(stockLocation.trim() ? { stockLocation: stockLocation.trim() } : {}), receiveLowStockAlert, outOfStockBehavior,
          ...(inStockLabel.trim() ? { inStockLabel: inStockLabel.trim() } : {}), ...(outOfStockLabel.trim() ? { outOfStockLabel: outOfStockLabel.trim() } : {}),
          ...(availabilityDate ? { availabilityDate } : {}),
          deliveryTimeMode,
          ...(deliveryTimeMode === "SPECIFIC" && inStockDeliveryTime.trim() ? { inStockDeliveryTime: inStockDeliveryTime.trim() } : {}),
          ...(deliveryTimeMode === "SPECIFIC" && outOfStockDeliveryTime.trim() ? { outOfStockDeliveryTime: outOfStockDeliveryTime.trim() } : {}),
          additionalShippingCost: Number(additionalShippingCost || 0), shippingMethodIds,
          ...(resolvedProductType === "standard" ? { initialVariant: { price: Number(retailPrice || 0), ...(salePrice ? { salePrice: Number(salePrice) } : {}), stockQty: Number(stockQty || 0), lowStockThreshold: Number(lowStockThreshold || 0), ...(packageWeight ? { weightKg: Number(packageWeight) } : {}), ...(packageWidth ? { widthCm: Number(packageWidth) } : {}), ...(packageHeight ? { heightCm: Number(packageHeight) } : {}), ...(packageDepth ? { lengthCm: Number(packageDepth) } : {}) } } : {}),
          isReturnable, returnableDays: Number(returnableDays || 0), isIndexable,
          ...(metaTitle.trim() ? { metaTitle: metaTitle.trim() } : {}),
          ...(metaDescription.trim() ? { metaDescription: metaDescription.trim() } : {}),
          seoTags, offlineRedirectBehavior,
          ...(offlineRedirectBehavior.startsWith("REDIRECT_CATEGORY") && redirectTargetCategoryId ? { redirectTargetCategoryId: Number(redirectTargetCategoryId) } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(messageFrom(payload));
      const savedProduct = payload.data ?? payload;
      const savedProductId = productId ?? Number(savedProduct.id);
      if (!Number.isInteger(savedProductId)) throw new Error("The product was saved, but its images could not be attached.");
      await imagesRef.current?.save(savedProductId);
      if (resolvedProductType === "variants") await variantsRef.current?.save(savedProductId);
      router.push("/products"); router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `The product could not be ${productId ? "updated" : "created"}.`);
    } finally { setSaving(false); }
  }

  const TypeIcon = resolvedProductType === "variants" ? Layers3 : Package;
  const visibleTabs = tabs.filter((tab) => resolvedProductType === "variants" || tab.id !== "variants");
  const selectedTaxRate = taxRates.find((rate) => rate.id === Number(taxRateId));
  const vatPercent = Number(selectedTaxRate?.ratePercent ?? 0);
  const priceExVat = Number(retailPrice || 0);
  const priceIncVat = priceExVat * (1 + vatPercent / 100);
  const margin = priceExVat - Number(costPrice || 0);
  const marginRate = priceExVat > 0 ? (margin / priceExVat) * 100 : 0;
  const plainSummary = summary.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const previewTitle = metaTitle.trim() || title.trim() || "Product title";
  const previewDescription = metaDescription.trim() || plainSummary || "Add a concise product summary to preview how this page may appear in search results.";

  if (loadingProduct) return <div className="flex min-h-72 items-center justify-center"><div className="text-center"><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-accent" /><p className="mt-3 text-xs text-ink-muted">Loading product details…</p></div></div>;

  return <form onSubmit={(event) => void submit(event, false)} className="w-full pb-20"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-muted"><Link href="/products" className="hover:text-ink">Products</Link><ChevronRight className="h-3.5 w-3.5" /><span>{productId ? "Edit product" : "Add product"}</span></nav><h1 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-ink">{productId ? `Edit ${title}` : `Add ${resolvedProductType === "variants" ? "product with variants" : "standard product"}`}</h1><p className="mt-1 text-[13.5px] text-ink-muted">{productId ? "Update this product’s catalogue, pricing, stock, shipping and SEO details." : "Create one English catalogue record. No localization fields are included."}</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-neutral-tint px-3 py-1.5 text-xs font-semibold text-ink-secondary ring-1 ring-inset ring-border"><TypeIcon className="h-4 w-4" />{resolvedProductType === "variants" ? "Variants" : "Standard"}</span></div>

  <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="grid gap-4 border-b border-border p-5 lg:grid-cols-[1fr_220px]"><label className={labelClass}>Product name<input autoFocus value={title} onChange={(event) => updateTitle(event.target.value)} placeholder="e.g. NVIDIA GeForce RTX 4070" maxLength={255} className={inputClass} /></label><label className={labelClass}>Status<select value={status} onChange={(event) => setStatus(event.target.value as ProductStatus)} className={inputClass}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></label></div><div className="overflow-x-auto border-b border-border"><div role="tablist" aria-label="Product sections" className="flex min-w-max px-3">{visibleTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`border-b px-3 py-3 text-xs font-semibold ${activeTab === tab.id ? "border-ink bg-neutral-tint text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>{tab.label}</button>)}</div></div>

  <div className={activeTab === "description" ? "block p-4 pb-0 sm:p-5 sm:pb-0" : "hidden"}><ProductImagesEditor ref={imagesRef} productId={productId} /></div>
  {resolvedProductType === "variants" ? <div className={activeTab === "variants" ? "block space-y-7 p-4 sm:p-5" : "hidden"}><ProductVariantsEditor ref={variantsRef} productId={productId} productTitle={title} /><section className="border-t border-border pt-6"><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">Stock rules<HelpTooltip label="Variant stock rules">These rules apply when an individual combination reaches zero stock. Quantities and thresholds are set in the combinations table above.</HelpTooltip></h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{([['DENY', 'Deny orders', 'Customers cannot purchase a combination when its quantity reaches zero.'], ['ALLOW', 'Allow backorders', 'Customers can order combinations while they are out of stock.']] as const).map(([value, titleText, descriptionText]) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${outOfStockBehavior === value ? 'border-ink bg-neutral-tint' : 'border-border'}`}><input type="radio" name="variantOutOfStockBehavior" value={value} checked={outOfStockBehavior === value} onChange={() => setOutOfStockBehavior(value)} className="mt-0.5 h-4 w-4 accent-ink" /><span><span className="block text-[13px] font-semibold text-ink">{titleText}</span><span className="mt-0.5 block text-xs text-ink-muted">{descriptionText}</span></span></label>)}</div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><label className={labelClass}>Minimum quantity for sale<input type="number" min="1" value={minimumOrderQuantity} onChange={(event) => setMinimumOrderQuantity(event.target.value)} className={inputClass} /></label><label className={labelClass}>Stock location<input value={stockLocation} onChange={(event) => setStockLocation(event.target.value)} maxLength={255} placeholder="e.g. Warehouse A · Shelf B12" className={inputClass} /></label><label className={labelClass}>Label when in stock<input value={inStockLabel} onChange={(event) => setInStockLabel(event.target.value)} maxLength={255} placeholder="e.g. In stock" className={inputClass} /></label><label className={labelClass}>Label when out of stock<input value={outOfStockLabel} onChange={(event) => setOutOfStockLabel(event.target.value)} maxLength={255} placeholder="e.g. Available to backorder" className={inputClass} /></label></div><label className="mt-4 flex w-fit items-center gap-3 rounded-md border border-border p-3 text-[13px] font-semibold text-ink-secondary"><input type="checkbox" checked={receiveLowStockAlert} onChange={(event) => setReceiveLowStockAlert(event.target.checked)} className="h-4 w-4 accent-ink" />Send low-stock alerts</label></section></div> : null}
  <div className="p-4 sm:p-5">{activeTab === "description" ? <div className="space-y-5"><div className={labelClass}><span className="inline-flex items-center gap-1">Summary<HelpTooltip label="Summary">Write a short product overview for catalogue cards and search results. Keep it clear, specific and avoid repeating the full description.</HelpTooltip></span><RichTextEditor value={summary} onChange={setSummary} ariaLabel="Product summary" placeholder="A concise description for product cards and search results." maxLength={800} minHeight="sm" /></div><div className={labelClass}><span className="inline-flex items-center gap-1">Description<HelpTooltip label="Description">Add detailed product information such as features, specifications, compatibility, included items and usage guidance.</HelpTooltip></span><RichTextEditor value={description} onChange={setDescription} ariaLabel="Product description" placeholder="Describe features, compatibility and what is included." minHeight="lg" /></div><div><p className={labelClass}>Categories<HelpTooltip label="Categories">Choose every category where customers should find this product. One category must be selected as the default.</HelpTooltip></p><div className="mt-2 flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-border-strong bg-surface p-2">{categoryId ? <span className="inline-flex items-center rounded-md bg-ink px-2.5 py-1 text-xs font-semibold text-white">{categories.find((item) => item.id === Number(categoryId))?.title}<span className="ml-1.5 text-white/60">Default</span></span> : null}{secondaryCategoryIds.map((id) => { const category = categories.find((item) => item.id === id); return category ? <span key={id} className="inline-flex items-center gap-1 rounded-md bg-neutral-tint px-2.5 py-1 text-xs font-medium text-ink-secondary">{category.title}<button type="button" onClick={() => setSecondaryCategoryIds((current) => current.filter((value) => value !== id))} aria-label={`Remove ${category.title}`} className="text-ink-muted hover:text-ink"><X className="h-3.5 w-3.5" /></button></span> : null; })}{!categoryId && secondaryCategoryIds.length === 0 ? <span className="text-xs text-ink-faint">No categories selected</span> : null}</div><button type="button" onClick={() => setCategoryPickerOpen((open) => !open)} aria-expanded={categoryPickerOpen} className="mt-2 h-9 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">{categoryPickerOpen ? "Close category chooser" : "Choose categories"}</button>{categoryPickerOpen ? <div className="mt-2 grid max-h-52 gap-1 overflow-y-auto rounded-md border border-border bg-canvas p-2 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => { const isDefault = category.id === Number(categoryId); const checked = isDefault || secondaryCategoryIds.includes(category.id); return <label key={category.id} className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-xs text-ink-secondary hover:bg-surface"><input type="checkbox" checked={checked} disabled={isDefault} onChange={(event) => setSecondaryCategoryIds((current) => event.target.checked ? [...current, category.id] : current.filter((id) => id !== category.id))} className="h-4 w-4 accent-ink" /><span className="truncate">{category.title}</span>{isDefault ? <span className="ml-auto text-[10.5px] text-ink-muted">Default</span> : null}</label>; })}</div> : null}</div><label className={labelClass}><span className="inline-flex items-center gap-1">Default category<HelpTooltip label="Default category">The primary category controls catalogue placement, breadcrumbs and the product URL structure.</HelpTooltip></span><select value={categoryId} onChange={(event) => { const nextId = event.target.value; setCategoryId(nextId); setSecondaryCategoryIds((current) => current.filter((id) => id !== Number(nextId))); }} className={inputClass}><option value="">Choose default category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><span className="mt-1 block text-[10.5px] font-normal leading-4 text-ink-muted">The primary category used for breadcrumbs, URLs and catalogue placement.</span></label><label className={labelClass}><span className="inline-flex items-center gap-1">Brand<HelpTooltip label="Brand">Select the product manufacturer or brand. Leave this empty only for genuinely unbranded products.</HelpTooltip></span><select value={brandId} onChange={(event) => setBrandId(event.target.value)} className={inputClass}><option value="">No brand</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div><label className={labelClass}><span className="inline-flex items-center gap-1">Related products<HelpTooltip label="Related products">Add closely connected products such as compatible accessories, upgrades or commonly purchased items.</HelpTooltip></span><div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><Input value={relatedSearch} onChange={(event) => { const value = event.target.value; setRelatedSearch(value); if (value.trim().length < 2) setRelatedResults([]); }} placeholder="Search by product name, SKU or slug" className={`${inputClass} mt-0 pl-9`} />{relatedLoading ? <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-muted" /> : null}</div></label>{relatedResults.length ? <div className="mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-card">{relatedResults.map((item) => <button key={item.id} type="button" onClick={() => { setRelatedProducts((current) => [...current, item]); setRelatedSearch(""); setRelatedResults([]); }} className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-neutral-tint"><span className="min-w-0 truncate text-xs font-semibold text-ink">{item.title}</span><span className="shrink-0 font-mono text-[10.5px] text-ink-muted">{item.sku || `ID-${item.id}`}</span></button>)}</div> : relatedSearch.trim().length >= 2 && !relatedLoading ? <p className="mt-2 text-xs text-ink-muted">No matching products found.</p> : null}{relatedProducts.length ? <div className="mt-2 flex flex-wrap gap-2">{relatedProducts.map((item) => <span key={item.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-neutral-tint px-2.5 py-1.5 text-xs font-medium text-ink-secondary"><span className="truncate">{item.title}</span><button type="button" onClick={() => setRelatedProducts((current) => current.filter((product) => product.id !== item.id))} aria-label={`Remove ${item.title}`} className="shrink-0 text-ink-muted hover:text-ink"><X className="h-3.5 w-3.5" /></button></span>)}</div> : <p className="mt-2 text-xs text-ink-muted">Optional products to recommend alongside this item.</p>}</div></div> : null}
  {activeTab === "details" ? <div className="space-y-7">
    <section><div className="mb-3"><h2 className="text-sm font-semibold text-ink">References and identifiers</h2><p className="mt-1 text-xs text-ink-muted">Supplier and barcode identifiers used throughout the UK catalogue.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <label className={labelClass}><span className="inline-flex items-center gap-1">SKU / reference<HelpTooltip label="SKU / reference">Your internal stock reference. It should be unique and easy for staff to recognise.</HelpTooltip></span><input value={sku} onChange={(event) => setSku(event.target.value)} maxLength={255} placeholder="e.g. GPU-NV-4070-12G" className={inputClass} /></label>
      <label className={labelClass}><span className="inline-flex items-center gap-1">Manufacturer part number (MPN)<HelpTooltip label="MPN">The exact part number assigned by the manufacturer. This helps customers confirm compatibility.</HelpTooltip></span><input value={mpn} onChange={(event) => setMpn(event.target.value)} maxLength={255} placeholder="e.g. 90YV0IZ2-M0NA00" className={inputClass} /></label>
      <label className={labelClass}><span className="inline-flex items-center gap-1">GTIN / EAN<HelpTooltip label="GTIN / EAN">Enter the 8, 12, 13 or 14 digit Global Trade Item Number printed beneath the barcode. EAN-13 is common in the UK.</HelpTooltip></span><input inputMode="numeric" value={gtin} onChange={(event) => setGtin(event.target.value.replace(/\D/g, "").slice(0, 14))} placeholder="e.g. 4711387228755" className={`${inputClass} font-mono`} /></label>
      <label className={labelClass}><span className="inline-flex items-center gap-1">UPC<HelpTooltip label="UPC">Optional 12-digit Universal Product Code, commonly found on products supplied from North America.</HelpTooltip></span><input inputMode="numeric" value={upc} onChange={(event) => setUpc(event.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12 digits" className={`${inputClass} font-mono`} /></label>
      <label className={labelClass}><span className="inline-flex items-center gap-1">Product condition<HelpTooltip label="Product condition">Choose New, Refurbished, Open box or Used so the condition is clear to UK customers before purchase.</HelpTooltip></span><select value={productConditionId} onChange={(event) => setProductConditionId(event.target.value)} className={inputClass}><option value="">Not specified</option>{conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.title}</option>)}</select></label>
      <label className={labelClass}><span className="inline-flex items-center gap-1">Warranty (months)<HelpTooltip label="Warranty">The commercial warranty supplied with the item. This does not replace customers’ statutory rights under UK consumer law.</HelpTooltip></span><input type="number" min="0" value={warrantyMonths} onChange={(event) => setWarrantyMonths(event.target.value)} placeholder="e.g. 36" className={inputClass} /></label>
      <label className={`${labelClass} md:col-span-2 xl:col-span-3`}>Slug<input value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={255} className={`${inputClass} font-mono text-xs`} /></label>
    </div></section>

    <section className="border-t border-border pt-6"><div className="mb-3"><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">Technical features<HelpTooltip label="Technical features">Add structured specifications customers use to compare computer products, such as CPU socket, RAM capacity, GPU memory or form factor.</HelpTooltip></h2><p className="mt-1 text-xs text-ink-muted">Add the specifications most useful for comparison and compatibility.</p></div><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><Input value={featureName} onChange={(event) => setFeatureName(event.target.value)} placeholder="Feature, e.g. GPU memory" className={`${inputClass} mt-0`} /><Input value={featureValue} onChange={(event) => setFeatureValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addFeature(); } }} placeholder="Value, e.g. 12 GB GDDR6X" className={`${inputClass} mt-0`} /><button type="button" onClick={addFeature} disabled={!featureName.trim() || !featureValue.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" />Add feature</button></div>{features.length ? <div className="mt-3 overflow-hidden rounded-md border border-border">{features.map((feature) => <div key={feature.id} className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_36px] items-center border-b border-border px-3 py-2.5 text-xs last:border-0"><span className="font-semibold text-ink">{feature.name}</span><span className="text-ink-secondary">{feature.value}</span><button type="button" onClick={() => setFeatures((current) => current.filter((item) => item.id !== feature.id))} aria-label={`Remove ${feature.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink"><Trash2 className="h-4 w-4" /></button></div>)}</div> : <div className="mt-3 rounded-md border border-dashed border-border-strong px-4 py-5 text-center text-xs text-ink-muted">No technical features added yet.</div>}</section>
    <div className="border-t border-border pt-6"><AttachedFilesSection /></div>


    <section className="border-t border-border pt-6"><div className="mb-3"><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">Customer configuration<HelpTooltip label="Customer configuration">Use this only when customers need to provide build, compatibility, engraving or other order-specific instructions.</HelpTooltip></h2><p className="mt-1 text-xs text-ink-muted">Optional for configurable PCs and other made-to-order items.</p></div><label className="flex items-start gap-3 rounded-md border border-border p-3"><input type="checkbox" checked={allowCustomization} onChange={(event) => setAllowCustomization(event.target.checked)} className="mt-0.5 h-4 w-4 accent-ink" /><span><span className="block text-[13px] font-semibold text-ink-secondary">Allow customers to provide configuration notes</span><span className="mt-0.5 block text-xs text-ink-muted">A notes field will be shown for this product during ordering.</span></span></label>{allowCustomization ? <label className={`${labelClass} mt-4 block`}>Instructions for customers<textarea value={customizationInstructions} onChange={(event) => setCustomizationInstructions(event.target.value)} rows={3} placeholder="e.g. Tell us your preferred RAM configuration and any compatibility requirements." className={`${inputClass} h-auto resize-y py-3 leading-5`} /></label> : null}</section>
  </div> : null}
  {activeTab === "stock" ? <div className="space-y-7">
    {resolvedProductType === "variants" ? <div className="rounded-lg bg-accent-tint p-4 text-[13px] leading-5 text-accent-tint-ink ring-1 ring-inset ring-accent-tint-border">Price, quantity and low-stock thresholds are managed separately for every combination in the Variants tab.</div> : <>
      <section><div className="mb-3"><h2 className="text-sm font-semibold text-ink">Retail price</h2><p className="mt-1 text-xs text-ink-muted">Enter the price excluding VAT. The customer-facing {CURRENCY} price is calculated automatically.</p></div><div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}><span className="inline-flex items-center gap-1">Retail price (excl. VAT)<HelpTooltip label="Retail price excluding VAT">{`The net selling price before UK VAT. Prices are stored in ${CURRENCY}.`}</HelpTooltip></span><div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">{CURRENCY_SYMBOL}</span><input type="number" min="0" step="0.01" value={retailPrice} onChange={(event) => setRetailPrice(event.target.value)} placeholder="0.00" className={`${inputClass} mt-0 pl-7`} /></div></label>
        <label className={labelClass}><span className="inline-flex items-center gap-1">Tax rule<HelpTooltip label="Tax rule">Select the VAT rate applicable to this item. Most computer equipment uses the UK standard rate.</HelpTooltip></span><select value={taxRateId} onChange={(event) => setTaxRateId(event.target.value)} className={inputClass}><option value="">No VAT</option>{taxRates.map((rate) => <option key={rate.id} value={rate.id}>{rate.title} ({Number(rate.ratePercent)}%)</option>)}</select></label>
        <label className={labelClass}>Retail price (incl. VAT)<div className="mt-2 flex h-10 items-center rounded-md border border-border bg-neutral-tint px-3 text-[13px] font-semibold text-ink">{CURRENCY_SYMBOL}{priceIncVat.toFixed(2)}</div></label>
        <label className={labelClass}><span className="inline-flex items-center gap-1">Cost price (excl. VAT)<HelpTooltip label="Cost price">Your supplier or acquisition cost before VAT. This is used only for margin reporting and is never shown to customers.</HelpTooltip></span><div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">{CURRENCY_SYMBOL}</span><input type="number" min="0" step="0.01" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} placeholder="0.00" className={`${inputClass} mt-0 pl-7`} /></div></label>
        <label className={labelClass}><span className="inline-flex items-center gap-1">Sale price (optional)<HelpTooltip label="Sale price">A temporary customer price including any discount. It must be lower than the normal price.</HelpTooltip></span><div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">{CURRENCY_SYMBOL}</span><input type="number" min="0" step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} placeholder="No sale price" className={`${inputClass} mt-0 pl-7`} /></div></label>
      </div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-md bg-neutral-tint p-3"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">Price incl. VAT</p><p className="mt-1 text-lg font-semibold text-ink">{CURRENCY_SYMBOL}{priceIncVat.toFixed(2)}</p></div><div className="rounded-md bg-neutral-tint p-3"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">Gross margin</p><p className="mt-1 text-lg font-semibold text-ink">{CURRENCY_SYMBOL}{margin.toFixed(2)}</p></div><div className="rounded-md bg-neutral-tint p-3"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">Margin rate</p><p className="mt-1 text-lg font-semibold text-ink">{marginRate.toFixed(1)}%</p></div></div></section>

      <section className="border-t border-border pt-6"><div className="mb-3"><h2 className="text-sm font-semibold text-ink">Stock</h2><p className="mt-1 text-xs text-ink-muted">Set opening quantity, fulfilment controls and low-stock monitoring.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className={labelClass}>Opening quantity<input type="number" min="0" value={stockQty} onChange={(event) => setStockQty(event.target.value)} className={inputClass} /></label>
        <label className={labelClass}><span className="inline-flex items-center gap-1">Minimum quantity for sale<HelpTooltip label="Minimum quantity for sale">The smallest number a customer may purchase in one order. Use 1 for normal retail products.</HelpTooltip></span><input type="number" min="1" value={minimumOrderQuantity} onChange={(event) => setMinimumOrderQuantity(event.target.value)} className={inputClass} /></label>
        <label className={labelClass}>Stock location<input value={stockLocation} onChange={(event) => setStockLocation(event.target.value)} maxLength={255} placeholder="e.g. Warehouse A · Shelf B12" className={inputClass} /></label>
        <label className={`${labelClass} md:col-span-2 xl:col-span-1`}><span className="inline-flex items-center gap-1">Low-stock threshold<HelpTooltip label="Low-stock threshold">The quantity at which this item is flagged for replenishment.</HelpTooltip></span><input type="number" min="0" value={lowStockThreshold} onChange={(event) => setLowStockThreshold(event.target.value)} className={inputClass} /></label>
        <label className="flex items-center gap-3 self-end rounded-md border border-border p-3 text-[13px] font-semibold text-ink-secondary"><input type="checkbox" checked={receiveLowStockAlert} onChange={(event) => setReceiveLowStockAlert(event.target.checked)} className="h-4 w-4 accent-ink" />Send a low-stock alert</label>
      </div></section>

      <section className="border-t border-border pt-6"><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">When out of stock<HelpTooltip label="When out of stock">Deny orders for immediately fulfilled products. Allow orders only when backorders or pre-orders can be supplied reliably.</HelpTooltip></h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{([['DENY', 'Deny orders', 'Customers cannot purchase when quantity reaches zero.'], ['ALLOW', 'Allow backorders', 'Customers can order while the item is out of stock.']] as const).map(([value, titleText, descriptionText]) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${outOfStockBehavior === value ? 'border-ink bg-neutral-tint' : 'border-border'}`}><input type="radio" name="outOfStockBehavior" value={value} checked={outOfStockBehavior === value} onChange={() => setOutOfStockBehavior(value)} className="mt-0.5 h-4 w-4 accent-ink" /><span><span className="block text-[13px] font-semibold text-ink">{titleText}</span><span className="mt-0.5 block text-xs text-ink-muted">{descriptionText}</span></span></label>)}</div><div className="mt-4 grid gap-4 md:grid-cols-3"><label className={labelClass}>Label when in stock<input value={inStockLabel} onChange={(event) => setInStockLabel(event.target.value)} maxLength={255} placeholder="e.g. In stock · dispatches today" className={inputClass} /></label><label className={labelClass}>Label when out of stock<input value={outOfStockLabel} onChange={(event) => setOutOfStockLabel(event.target.value)} maxLength={255} placeholder="e.g. Available to backorder" className={inputClass} /></label><label className={labelClass}>Availability date<input type="date" value={availabilityDate} onChange={(event) => setAvailabilityDate(event.target.value)} className={inputClass} /></label></div></section>
    </>}
  </div> : null}
  {activeTab === "shipping" ? <div className="space-y-7">
    <section><div className="mb-3"><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">Package dimensions<HelpTooltip label="Package dimensions">Enter the packed dimensions and weight used by carrier rate and size restrictions, not the unpacked product measurements.</HelpTooltip></h2><p className="mt-1 text-xs text-ink-muted">Measure the parcel including retail packaging and protective materials.</p></div>{resolvedProductType === "variants" ? <div className="rounded-md bg-accent-tint p-4 text-xs leading-5 text-accent-tint-ink ring-1 ring-inset ring-accent-tint-border">Combination-specific dimensions can be added through the variant API after the product is saved.</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Width", packageWidth, setPackageWidth, "cm"], ["Height", packageHeight, setPackageHeight, "cm"], ["Depth", packageDepth, setPackageDepth, "cm"], ["Weight", packageWeight, setPackageWeight, "kg"]].map(([label, value, setter, unit]) => <label key={label as string} className={labelClass}>{label as string}<div className="relative mt-2"><input type="number" min="0" step={unit === "kg" ? "0.001" : "0.01"} value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} placeholder="0" className={`${inputClass} mt-0 pr-10`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">{unit as string}</span></div></label>)}</div>}</section>

    <section className="border-t border-border pt-6"><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">Delivery time<HelpTooltip label="Delivery time">Use the store default unless this product needs a different dispatch or delivery promise.</HelpTooltip></h2><div className="mt-3 grid gap-2 sm:grid-cols-3">{([['NONE', 'Do not display', 'Hide delivery messaging.'], ['DEFAULT', 'Use store default', 'Use the selected carrier estimate.'], ['SPECIFIC', 'Product-specific', 'Enter custom messages below.']] as const).map(([value, titleText, descriptionText]) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${deliveryTimeMode === value ? 'border-ink bg-neutral-tint' : 'border-border'}`}><input type="radio" name="deliveryTimeMode" checked={deliveryTimeMode === value} onChange={() => setDeliveryTimeMode(value)} className="mt-0.5 h-4 w-4 accent-ink" /><span><span className="block text-[13px] font-semibold text-ink">{titleText}</span><span className="mt-0.5 block text-xs text-ink-muted">{descriptionText}</span></span></label>)}</div>{deliveryTimeMode === "SPECIFIC" ? <div className="mt-4 grid gap-4 md:grid-cols-2"><label className={labelClass}>Delivery time when in stock<input value={inStockDeliveryTime} onChange={(event) => setInStockDeliveryTime(event.target.value)} maxLength={255} placeholder="e.g. Delivered within 1–2 working days" className={inputClass} /></label><label className={labelClass}>Delivery time for backorders<input value={outOfStockDeliveryTime} onChange={(event) => setOutOfStockDeliveryTime(event.target.value)} maxLength={255} placeholder="e.g. Usually dispatched within 5–7 working days" className={inputClass} /></label></div> : null}</section>

    <section className="border-t border-border pt-6"><div className="grid gap-5 lg:grid-cols-[280px_1fr]"><div><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">Additional shipping charge<HelpTooltip label="Additional shipping charge">{`Adds a product-specific surcharge in ${CURRENCY} on top of the selected delivery method, useful for oversized or unusually heavy items.`}</HelpTooltip></h2><div className="relative mt-3"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">{CURRENCY_SYMBOL}</span><input type="number" min="0" step="0.01" value={additionalShippingCost} onChange={(event) => setAdditionalShippingCost(event.target.value)} placeholder="0.00" className={`${inputClass} mt-0 pl-7`} /></div></div><div><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">Available delivery methods<HelpTooltip label="Available delivery methods">Leave every method unselected to allow all active delivery methods. Select methods to restrict this product.</HelpTooltip></h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{shippingMethods.map((method) => <label key={method.id} className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-neutral-tint"><input type="checkbox" checked={shippingMethodIds.includes(method.id)} onChange={(event) => setShippingMethodIds((current) => event.target.checked ? [...current, method.id] : current.filter((id) => id !== method.id))} className="mt-0.5 h-4 w-4 accent-ink" /><span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-ink">{method.title}</span><span className="mt-0.5 block text-xs text-ink-muted">{method.carrier}{method.estimatedDaysMin != null ? ` · ${method.estimatedDaysMin}${method.estimatedDaysMax != null && method.estimatedDaysMax !== method.estimatedDaysMin ? `–${method.estimatedDaysMax}` : ''} working days` : ''}</span></span></label>)}{!shippingMethods.length ? <p className="text-xs text-ink-muted">No active delivery methods are configured. All methods will remain available.</p> : null}</div>{shippingMethods.length ? <p className="mt-2 text-[10.5px] text-ink-muted">{shippingMethodIds.length ? `${shippingMethodIds.length} method${shippingMethodIds.length === 1 ? '' : 's'} selected.` : 'All active delivery methods are allowed.'}</p> : null}</div></div></section>

    <section className="border-t border-border pt-6"><div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Return window (days)<input type="number" min="0" value={returnableDays} disabled={!isReturnable} onChange={(event) => setReturnableDays(event.target.value)} className={inputClass} /></label><label className="flex items-center gap-3 self-end rounded-md border border-border p-3 text-[13px] font-semibold text-ink-secondary"><input type="checkbox" checked={isReturnable} onChange={(event) => setIsReturnable(event.target.checked)} className="h-4 w-4 accent-ink" />This product can be returned</label></div><p className="mt-2 text-[10.5px] leading-4 text-ink-muted">The configured return window does not limit customers’ statutory cancellation or faulty-goods rights under UK consumer law.</p></section>
  </div> : null}
  {activeTab === "seo" ? <div className="space-y-7">
    <section><div className="mb-3"><h2 className="text-sm font-semibold text-ink">Search engine optimisation</h2><p className="mt-1 text-xs text-ink-muted">Control how this English product page may appear in UK search results.</p></div><div className="rounded-lg border border-border bg-surface p-4 shadow-card"><p className="truncate text-xs text-[#202124]">ukcomputershop.co.uk › products › {slug || "product-url"}</p><p className="mt-1 truncate text-lg leading-6 text-[#1a0dab]">{previewTitle}</p><p className="mt-1 line-clamp-2 max-w-3xl text-[13px] leading-5 text-[#4d5156]">{previewDescription}</p></div></section>

    <section className="space-y-4 border-t border-border pt-6"><label className={`${labelClass} block`}><span className="inline-flex items-center gap-1">Meta title<HelpTooltip label="Meta title">Write a unique, descriptive title. Aim for 50–60 characters and include the product name or key model.</HelpTooltip></span><div className="relative"><input value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} maxLength={70} placeholder={title || "Product title"} className={`${inputClass} pr-16`} /><span className={`absolute bottom-3 right-3 text-[10.5px] ${metaTitle.length > 60 ? 'text-danger-tint-ink' : 'text-ink-muted'}`}>{metaTitle.length}/70</span></div><span className="mt-1 block text-[10.5px] font-normal text-ink-muted">Leave blank to use the product name.</span></label><label className={`${labelClass} block`}><span className="inline-flex items-center gap-1">Meta description<HelpTooltip label="Meta description">Summarise the product’s main benefit and specification naturally. Aim for 120–160 characters.</HelpTooltip></span><div className="relative"><textarea value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} maxLength={320} rows={4} placeholder={plainSummary || "Describe the product for search results."} className={`${inputClass} h-auto py-3 pb-7 leading-5`} /><span className={`absolute bottom-2.5 right-3 text-[10.5px] ${metaDescription.length > 160 ? 'text-danger-tint-ink' : 'text-ink-muted'}`}>{metaDescription.length}/320</span></div><span className="mt-1 block text-[10.5px] font-normal text-ink-muted">Leave blank to use an excerpt from the product summary.</span></label><label className={`${labelClass} block`}><span className="inline-flex items-center gap-1">Friendly URL<HelpTooltip label="Friendly URL">Use lowercase words separated by hyphens. Avoid dates and unnecessary identifiers unless they are part of the model name.</HelpTooltip></span><div className="mt-2 flex h-10 items-center rounded-md border border-border-strong bg-surface focus-within:border-accent-strong"><span className="hidden shrink-0 border-r border-border px-3 text-xs text-ink-muted sm:block">/products/</span><input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={255} className="min-w-0 flex-1 bg-transparent px-3 font-mono text-xs text-ink outline-none" /></div></label><label className="flex items-center gap-3 rounded-md border border-border p-3 text-[13px] font-semibold text-ink-secondary"><input type="checkbox" checked={isIndexable} onChange={(event) => setIsIndexable(event.target.checked)} className="h-4 w-4 accent-ink" /><span><span className="block">Allow search engines to index this product</span><span className="mt-0.5 block text-xs font-normal text-ink-muted">Disable this for private, temporary or unfinished catalogue pages.</span></span></label></section>

    <section className="border-t border-border pt-6"><div className="mb-3"><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">Offline redirection<HelpTooltip label="Offline redirection">Choose what customers and search engines receive if this product is archived or removed. Permanent redirects preserve more SEO value when a replacement category exists.</HelpTooltip></h2><p className="mt-1 text-xs text-ink-muted">Define what happens when this product is no longer available.</p></div><div className="grid gap-4 md:grid-cols-2"><label className={labelClass}>Behaviour<select value={offlineRedirectBehavior} onChange={(event) => setOfflineRedirectBehavior(event.target.value as typeof offlineRedirectBehavior)} className={inputClass}><option value="NOT_FOUND">Not found (404)</option><option value="GONE">Permanently removed (410)</option><option value="REDIRECT_CATEGORY_301">Permanent redirect to category (301)</option><option value="REDIRECT_CATEGORY_302">Temporary redirect to category (302)</option></select></label>{offlineRedirectBehavior.startsWith("REDIRECT_CATEGORY") ? <label className={labelClass}>Target category<select value={redirectTargetCategoryId} onChange={(event) => setRedirectTargetCategoryId(event.target.value)} className={inputClass}><option value="">Use default category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label> : null}</div><div className="mt-3 rounded-md bg-accent-tint p-3 text-xs leading-5 text-accent-tint-ink ring-1 ring-inset ring-accent-tint-border">{offlineRedirectBehavior === "NOT_FOUND" ? "Returns a standard 404 response when the product is offline." : offlineRedirectBehavior === "GONE" ? "Returns 410 Gone to tell search engines the product was permanently removed." : offlineRedirectBehavior === "REDIRECT_CATEGORY_301" ? "Permanently redirects customers and search engines to the selected category." : "Temporarily redirects visitors while preserving the product URL for later use."}</div></section>

    <section className="border-t border-border pt-6"><div className="mb-3"><h2 className="inline-flex items-center gap-1 text-sm font-semibold text-ink">Search tags<HelpTooltip label="Search tags">Add concise phrases customers may use in onsite search, such as a chipset, socket, model family or compatibility term. Avoid repeating broad category names.</HelpTooltip></h2><p className="mt-1 text-xs text-ink-muted">Internal catalogue keywords; these are not HTML meta-keywords.</p></div><div className="flex gap-2"><Input value={seoTagInput} onChange={(event) => setSeoTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addSeoTag(); } }} maxLength={60} placeholder="e.g. AM5 compatible" className={`${inputClass} mt-0`} /><button type="button" onClick={addSeoTag} disabled={!seoTagInput.trim()} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add</button></div>{seoTags.length ? <div className="mt-3 flex flex-wrap gap-2">{seoTags.map((tag) => <span key={tag} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-tint px-2.5 py-1.5 text-xs font-medium text-ink-secondary">{tag}<button type="button" onClick={() => setSeoTags((current) => current.filter((value) => value !== tag))} aria-label={`Remove ${tag}`} className="text-ink-muted hover:text-ink"><X className="h-3.5 w-3.5" /></button></span>)}</div> : null}</section>
  </div> : null}
  </div></section>

  {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}<div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64"><div className="flex w-full items-center justify-between gap-3"><Link href="/products" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3.5 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint"><ArrowLeft className="h-4 w-4" />Back to products</Link><div className="flex gap-2"><button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Save className="h-4 w-4" />{productId ? "Save changes" : "Save draft"}</button><button type="button" disabled={saving} onClick={(event) => void submit(event as unknown as FormEvent, true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white hover:bg-[#1d2939] disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save and publish</button></div></div></div></form>;
}
