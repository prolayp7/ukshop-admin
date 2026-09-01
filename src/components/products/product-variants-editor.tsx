"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Check, Layers3, LoaderCircle, Plus, Trash2 } from "lucide-react";

type AttributeValue = { id: number; value: string };
type Attribute = { id: number; title: string; values: AttributeValue[] };
type VariantAttribute = { attributeValue: AttributeValue; attribute: { id: number; title: string } };
type VariantRow = { key: string; id?: number; title: string; slug: string; barcode: string; price: string; salePrice: string; stockQty: string; lowStockThreshold: string; isDefault: boolean; attributeValueIds: number[] };

export type ProductVariantsHandle = { save: (productId: number) => Promise<void> };

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function message(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload && typeof (payload as { message?: unknown }).message === "string") return (payload as { message: string }).message; return fallback; }

export const ProductVariantsEditor = forwardRef<ProductVariantsHandle, { productId?: number; productTitle: string }>(function ProductVariantsEditor({ productId, productTitle }, ref) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [attributesResponse, variantsResponse] = await Promise.all([fetch("/api/catalog/product-attributes", { cache: "no-store" }), productId ? fetch(`/api/products/${productId}/variants`, { cache: "no-store" }) : Promise.resolve(null)]);
      const attributesPayload = await attributesResponse.json().catch(() => ({}));
      if (!attributesResponse.ok) throw new Error(message(attributesPayload, "Attributes could not be loaded."));
      setAttributes((attributesPayload.data ?? attributesPayload) as Attribute[]);
      if (variantsResponse) {
        const variantsPayload = await variantsResponse.json().catch(() => ({}));
        if (!variantsResponse.ok) throw new Error(message(variantsPayload, "Variants could not be loaded."));
        const variants = (variantsPayload.data ?? variantsPayload) as Array<{ id: number; title: string; slug: string; barcode: string | null; price: string; salePrice: string | null; stockQty: number; lowStockThreshold: number; isDefault: boolean; attributes: VariantAttribute[] }>;
        setRows(variants.map((variant) => ({ key: `variant-${variant.id}`, id: variant.id, title: variant.title, slug: variant.slug, barcode: variant.barcode ?? "", price: variant.price, salePrice: variant.salePrice ?? "", stockQty: String(variant.stockQty), lowStockThreshold: String(variant.lowStockThreshold), isDefault: variant.isDefault, attributeValueIds: variant.attributes.map((item) => item.attributeValue.id) })));
      }
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Variants could not be loaded."); }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  function toggleValue(attributeId: number, valueId: number) {
    setSelected((current) => { const values = current[attributeId] ?? []; return { ...current, [attributeId]: values.includes(valueId) ? values.filter((id) => id !== valueId) : [...values, valueId] }; });
  }

  function generate() {
    const groups = attributes.map((attribute) => ({ attribute, values: (selected[attribute.id] ?? []).map((id) => attribute.values.find((value) => value.id === id)).filter((value): value is AttributeValue => Boolean(value)) })).filter((group) => group.values.length);
    if (!groups.length) { setError("Select at least one attribute value before generating combinations."); return; }
    const combinations = groups.reduce<Array<Array<{ attribute: Attribute; value: AttributeValue }>>>((current, group) => current.flatMap((combination) => group.values.map((value) => [...combination, { attribute: group.attribute, value }])), [[]]);
    const existingKeys = new Set(rows.map((row) => [...row.attributeValueIds].sort((a, b) => a - b).join("-")));
    const additions = combinations.filter((combination) => !existingKeys.has(combination.map((item) => item.value.id).sort((a, b) => a - b).join("-"))).map((combination, index) => { const title = combination.map((item) => `${item.attribute.title}: ${item.value.value}`).join(" · "); return { key: `new-${crypto.randomUUID()}`, title, slug: slugify(combination.map((item) => item.value.value).join("-")), barcode: "", price: "0", salePrice: "", stockQty: "0", lowStockThreshold: "5", isDefault: rows.length === 0 && index === 0, attributeValueIds: combination.map((item) => item.value.id) }; });
    setRows((current) => [...current, ...additions]); setError("");
  }

  function update(key: string, values: Partial<VariantRow>) { setRows((current) => current.map((row) => row.key === key ? { ...row, ...values } : row)); }
  function setDefault(key: string) { setRows((current) => current.map((row) => ({ ...row, isDefault: row.key === key }))); }
  function remove(row: VariantRow) { if (row.id) setDeletedIds((current) => [...current, row.id!]); setRows((current) => { const next = current.filter((item) => item.key !== row.key); if (row.isDefault && next[0]) next[0] = { ...next[0], isDefault: true }; return next; }); }

  useImperativeHandle(ref, () => ({ async save(ownerId: number) {
    if (!rows.length) throw new Error("Generate at least one product combination before saving.");
    if (rows.some((row) => !row.title.trim() || !row.slug.trim())) throw new Error("Every combination needs a name.");
    if (rows.some((row) => row.salePrice && Number(row.salePrice) >= Number(row.price || 0))) throw new Error("Each sale price must be lower than its normal price.");
    for (const id of deletedIds) { const response = await fetch(`/api/products/${ownerId}/variants/${id}`, { method: "DELETE" }); if (!response.ok) throw new Error("A removed combination could not be deleted."); }
    for (const row of [...rows].sort((a, b) => Number(a.isDefault) - Number(b.isDefault))) {
      const body = { title: row.title.trim(), slug: row.slug.trim(), ...(row.id || row.barcode.trim() ? { barcode: row.barcode.trim() } : {}), price: Number(row.price || 0), ...(row.id ? { salePrice: row.salePrice ? Number(row.salePrice) : null } : row.salePrice ? { salePrice: Number(row.salePrice) } : {}), stockQty: Number(row.stockQty || 0), lowStockThreshold: Number(row.lowStockThreshold || 0), isDefault: row.isDefault, status: "ACTIVE", attributeValueIds: row.attributeValueIds };
      const response = await fetch(row.id ? `/api/products/${ownerId}/variants/${row.id}` : `/api/products/${ownerId}/variants`, { method: row.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(message(payload, `${row.title} could not be saved.`));
    }
  } }), [deletedIds, rows]);

  if (loading) return <div className="flex min-h-56 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-accent" /></div>;
  return <div className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-sm font-semibold text-ink">Product combinations</h2><p className="mt-1 text-xs leading-5 text-ink-muted">Select attribute values for {productTitle.trim() || "this product"}, generate combinations, then set the price and available stock for each one.</p></div><button type="button" onClick={generate} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white"><Layers3 className="h-4 w-4" />Generate combinations</button></div>
    {error ? <p role="alert" className="rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border">{error}</p> : null}
    <section><h3 className="text-xs font-semibold text-ink-secondary">Attributes and values</h3>{attributes.length ? <div className="mt-3 grid gap-3 md:grid-cols-2">{attributes.map((attribute) => <div key={attribute.id} className="rounded-lg border border-border p-3"><p className="text-xs font-semibold text-ink">{attribute.title}</p><div className="mt-2 flex flex-wrap gap-2">{attribute.values.map((value) => { const checked = selected[attribute.id]?.includes(value.id) ?? false; return <button key={value.id} type="button" onClick={() => toggleValue(attribute.id, value.id)} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${checked ? "border-accent-strong bg-accent-tint text-accent-tint-ink" : "border-border text-ink-secondary hover:bg-neutral-tint"}`}>{checked ? <Check className="h-3.5 w-3.5" /> : null}{value.value}</button>; })}</div></div>)}</div> : <div className="mt-3 rounded-md border border-dashed border-border-strong p-5 text-center text-xs text-ink-muted">No product attributes are configured yet.</div>}</section>
    <section><div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-ink-secondary">Combinations ({rows.length})</h3><button type="button" onClick={() => setRows((current) => [...current, { key: `new-${crypto.randomUUID()}`, title: "Custom combination", slug: `combination-${current.length + 1}`, barcode: "", price: "0", salePrice: "", stockQty: "0", lowStockThreshold: "5", isDefault: current.length === 0, attributeValueIds: [] }])} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary"><Plus className="h-4 w-4" />Add manually</button></div>{rows.length ? <div className="mt-3 overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[1000px] text-left"><thead className="bg-canvas text-[10.5px] uppercase tracking-wide text-ink-muted"><tr><th className="px-3 py-3">Combination</th><th className="px-3 py-3">Reference</th><th className="px-3 py-3">Price excl.</th><th className="px-3 py-3">Sale price</th><th className="px-3 py-3">Quantity</th><th className="px-3 py-3">Low stock</th><th className="px-3 py-3 text-center">Default</th><th className="w-12 px-3 py-3" /></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.key}><td className="px-3 py-3"><input value={row.title} onChange={(event) => update(row.key, { title: event.target.value, slug: slugify(event.target.value) })} className="h-9 w-56 rounded-md border border-border-strong px-2.5 text-xs font-semibold" /></td><td className="px-3 py-3"><input value={row.barcode} onChange={(event) => update(row.key, { barcode: event.target.value })} placeholder="SKU / barcode" className="h-9 w-36 rounded-md border border-border-strong px-2.5 text-xs" /></td><td className="px-3 py-3"><input type="number" min="0" step="0.01" value={row.price} onChange={(event) => update(row.key, { price: event.target.value })} className="h-9 w-28 rounded-md border border-border-strong px-2.5 text-xs" /></td><td className="px-3 py-3"><input type="number" min="0" step="0.01" value={row.salePrice} onChange={(event) => update(row.key, { salePrice: event.target.value })} placeholder="—" className="h-9 w-28 rounded-md border border-border-strong px-2.5 text-xs" /></td><td className="px-3 py-3"><input type="number" min="0" value={row.stockQty} onChange={(event) => update(row.key, { stockQty: event.target.value })} className="h-9 w-24 rounded-md border border-border-strong px-2.5 text-xs" /></td><td className="px-3 py-3"><input type="number" min="0" value={row.lowStockThreshold} onChange={(event) => update(row.key, { lowStockThreshold: event.target.value })} className="h-9 w-24 rounded-md border border-border-strong px-2.5 text-xs" /></td><td className="px-3 py-3 text-center"><input type="radio" name="default-variant" checked={row.isDefault} onChange={() => setDefault(row.key)} aria-label={`Set ${row.title} as default`} className="h-4 w-4 accent-ink" /></td><td className="px-3 py-3"><button type="button" onClick={() => remove(row)} aria-label={`Remove ${row.title}`} className="flex h-8 w-8 items-center justify-center rounded-md text-danger hover:bg-danger-tint"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div> : <div className="mt-3 flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-canvas p-6 text-center"><Layers3 className="h-6 w-6 text-ink-muted" /><p className="mt-3 text-[13px] font-semibold text-ink">No combinations generated</p><p className="mt-1 text-xs text-ink-muted">Select values above or add a combination manually.</p></div>}</section>
  </div>;
});
