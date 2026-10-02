"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { AlertTriangle, ArrowDown, ArrowUp, BookOpen, Briefcase, Compass, ExternalLink, FileSearch, Gamepad2, Gift, Grid3x3, Image as ImageIcon, Images, Laptop, LayoutTemplate, LoaderCircle, Mail, MessageSquareQuote, Network, Percent, Plus, RefreshCw, ShieldCheck, Sparkles, Store, Tag, Trash2, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DrawerContent } from "@/components/ui/dialog";
import { collectionFromApi } from "@/lib/api-response";
import { mediaFileUrl, type MediaItem } from "@/lib/media";

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3002";

type SectionType = "HERO" | "TRUST_STRIP" | "DEALS" | "FEATURED_PRODUCTS" | "NEW_ARRIVALS" | "BRANDS" | "TESTIMONIALS" | "FAQS" | "BANNERS" | "NEWSLETTER" | "CATEGORY_SHOWCASE" | "SHOP_BY_NEED" | "GAMING_SHOWCASE" | "LAPTOP_SHOWCASE" | "BUYING_GUIDES" | "SEO_INTRO" | "BUSINESS_BANNER" | "CATEGORY_SPLIT";
type Section = { id: number; type: SectionType; label: string; sortOrder: number; isVisible: boolean; config: Record<string, unknown> };
type FeaturedSection = { id: number; title: string; slug: string };
type CategoryOption = { id: number; title: string; slug: string; parentId: number | null };
type BrandOption = { id: number; title: string; slug: string; status: string };
type FaqOption = { id: number; question: string; status: string };
type FaqCategoryOption = { id: number; name: string; status: string; faqs: FaqOption[] };
type CmsPageOption = { id: number; title: string; slug: string; status: string };
type ProductOption = { id: number; title: string; slug: string; categoryId: number; status: string };
type GamingSpec = { label: string; value: string };
type GuideSelection = { pageSlug: string; tag: string };
type GamingTier = { productSlug: string; tier: string; fps: string; ctaLabel: string; specs: GamingSpec[] };
type NeedCard = { title: string; text: string; categorySlug: string };
type LaptopCard = { title: string; text: string; categorySlug: string };
type CategorySplitColumn = { heading: string; text: string; linkLabel: string; categorySlug: string; chips: string[] };
const DEFAULT_ARRIVAL_TABS = ["computers", "pc-components", "laptops", "gaming-pcs", "peripherals"];

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }

const meta: Record<SectionType, { icon: typeof LayoutTemplate; description: string }> = {
  HERO: { icon: LayoutTemplate, description: "Homepage hero carousel." },
  TRUST_STRIP: { icon: ShieldCheck, description: "Delivery, warranty and finance trust badges." },
  DEALS: { icon: Percent, description: "Automatic — products currently on sale; the timer follows the next product sale expiry." },
  FEATURED_PRODUCTS: { icon: Sparkles, description: "A curated product rail." },
  NEW_ARRIVALS: { icon: Sparkles, description: "Automatic — most recently added products." },
  BRANDS: { icon: Store, description: "Automatic — brand logos grid." },
  TESTIMONIALS: { icon: MessageSquareQuote, description: "Customer testimonials." },
  FAQS: { icon: Tag, description: "Frequently asked questions." },
  BANNERS: { icon: Images, description: "Promotional banners at a given position." },
  NEWSLETTER: { icon: Mail, description: "Email signup strip." },
  CATEGORY_SHOWCASE: { icon: Grid3x3, description: "Automatic — category tiles grid." },
  SHOP_BY_NEED: { icon: Compass, description: "Fixed content — task-based shopping cards." },
  GAMING_SHOWCASE: { icon: Gamepad2, description: "Gaming PC tiers connected to live catalog products." },
  LAPTOP_SHOWCASE: { icon: Laptop, description: "Fixed content — laptop category cards." },
  BUYING_GUIDES: { icon: BookOpen, description: "Fixed content — computer buying guides." },
  SEO_INTRO: { icon: FileSearch, description: "Fixed content — SEO intro copy and special offer." },
  BUSINESS_BANNER: { icon: Briefcase, description: "Business computing banner linking to a category." },
  CATEGORY_SPLIT: { icon: Network, description: "Two columns of category links (networking and setup)." },
};
// Where each type's content is actually authored - some point at an existing
// admin page (this Homepage view only controls order/visibility for those),
// some open a small config editor here, and the fully-automatic ones need no editor.
const contentLink: Partial<Record<SectionType, string>> = {
  HERO: "/merchandising?tab=hero",
  TRUST_STRIP: "/merchandising?tab=hero",
  BANNERS: "/merchandising?tab=banners",
  FEATURED_PRODUCTS: "/merchandising?tab=sections",
  TESTIMONIALS: "/support-content",
  FAQS: "/support-content",
};
const configurable: SectionType[] = ["HERO", "DEALS", "FEATURED_PRODUCTS", "NEW_ARRIVALS", "BRANDS", "TESTIMONIALS", "FAQS", "BANNERS", "NEWSLETTER", "CATEGORY_SHOWCASE", "SHOP_BY_NEED", "GAMING_SHOWCASE", "LAPTOP_SHOWCASE", "BUYING_GUIDES", "SEO_INTRO", "BUSINESS_BANNER", "CATEGORY_SPLIT"];

// Text fields per section (heading + the line or paragraphs under it). The API returns the text shoppers
// currently see, defaults included; `auto` marks a body the storefront fills from live data when left empty.
type BodyField = { label: string; rows?: number; auto?: string; hint?: string };
const TEXT_FIELDS: Partial<Record<SectionType, { heading?: { auto?: string }; body?: BodyField }>> = {
  DEALS: { heading: {}, body: { label: "Text", rows: 2, auto: "Automatic: “N lines reduced…” with the live on-sale count" } },
  FEATURED_PRODUCTS: { heading: { auto: "Uses the featured section's title" }, body: { label: "Subtitle", auto: "Automatic: matches how the rail picks products (e.g. “ranked by units sold”)" } },
  NEW_ARRIVALS: { heading: {}, body: { label: "Subtitle" } },
  BRANDS: { heading: {}, body: { label: "Subtitle" } },
  TESTIMONIALS: { heading: {} },
  FAQS: { heading: {}, body: { label: "Subtitle" } },
  NEWSLETTER: { heading: {}, body: { label: "Text", rows: 2 } },
  CATEGORY_SHOWCASE: { heading: {}, body: { label: "Subtitle", hint: "{count} is replaced with the number of categories shown." } },
  SHOP_BY_NEED: { heading: {}, body: { label: "Subtitle" } },
  GAMING_SHOWCASE: { heading: {}, body: { label: "Subtitle", rows: 2 } },
  LAPTOP_SHOWCASE: { heading: {}, body: { label: "Subtitle" } },
  BUYING_GUIDES: { heading: {}, body: { label: "Subtitle" } },
  SEO_INTRO: { heading: {}, body: { label: "Paragraphs", rows: 12, hint: "Separate paragraphs with a blank line." } },
  BUSINESS_BANNER: { heading: {}, body: { label: "Text", rows: 2 } },
};

export function HomepageListing() {
  const [allItems, setAllItems] = useState<Section[]>([]);
  const [items, setItems] = useState<Section[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  /* blog was removed: any leftover BLOG_HIGHLIGHTS row is filtered out below */ const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await fetch("/api/homepage-sections", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(apiMessage(payload, "Homepage sections could not be loaded.")); const all = collectionFromApi<Section>(payload); setAllItems(all); setItems(all.filter((section) => (section.type as string) !== "BLOG_HIGHLIGHTS")); setPreviewKey((key) => key + 1); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Homepage sections could not be loaded."); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function toggleVisible(section: Section) { setError(""); try { const response = await fetch(`/api/homepage-sections/${section.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isVisible: !section.isVisible }) }); if (!response.ok) throw new Error(apiMessage(await response.json().catch(() => ({})), "Section could not be updated.")); await load(); } catch (toggleError) { setError(toggleError instanceof Error ? toggleError.message : "Section could not be updated."); } }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const selectedId = items[index]?.id;
    const targetId = items[target]?.id;
    if (selectedId === undefined || targetId === undefined) return;
    const nextAll = [...allItems];
    const selectedIndex = nextAll.findIndex((item) => item.id === selectedId);
    const targetIndex = nextAll.findIndex((item) => item.id === targetId);
    if (selectedIndex === -1 || targetIndex === -1) return;
    [nextAll[selectedIndex], nextAll[targetIndex]] = [nextAll[targetIndex], nextAll[selectedIndex]];
    setAllItems(nextAll);
    setItems(nextAll.filter((section) => (section.type as string) !== "BLOG_HIGHLIGHTS"));
    setSaving(true); setError("");
    try { const response = await fetch("/api/homepage-sections/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: nextAll.map((item) => item.id) }) }); if (!response.ok) throw new Error(apiMessage(await response.json().catch(() => ({})), "Sections could not be reordered.")); await load(); } catch (moveError) { setError(moveError instanceof Error ? moveError.message : "Sections could not be reordered."); await load(); } finally { setSaving(false); }
  }

  return <div className="w-full">
  {error ? <div role="alert" className="mb-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
    <div className="min-w-0 xl:w-[380px] xl:shrink-0">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Homepage</h1><p className="mt-1 text-[13.5px] text-ink-muted">Every section of the homepage, reorderable and switchable without a deployment.</p>
      <div className="mt-5">{loading ? <div className="flex min-h-40 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-ink-muted" /></div> : <div className="space-y-2.5">{items.map((section, index) => {
      const Icon = meta[section.type].icon;
      const link = contentLink[section.type];
      const canConfigure = configurable.includes(section.type);
      return <div key={section.id} className="rounded-xl border border-border bg-surface p-3.5 shadow-card">
        <div className="flex items-start gap-2.5">
          <div className="flex shrink-0 flex-col gap-0.5"><button type="button" onClick={() => void move(index, -1)} disabled={saving || index === 0} aria-label="Move up" className="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void move(index, 1)} disabled={saving || index === items.length - 1} aria-label="Move down" className="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button></div>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canvas text-[11px] font-semibold text-ink-secondary">{index + 1}</span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><Icon className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{section.label}</p><p className="mt-0.5 text-xs text-ink-muted">{meta[section.type].description}</p></div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-secondary"><span className="relative inline-flex h-5 w-9 shrink-0"><input type="checkbox" checked={section.isVisible} onChange={() => void toggleVisible(section)} className="peer sr-only" /><span className="absolute inset-0 rounded-full bg-border-strong transition-colors peer-checked:bg-positive" /><span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" /></span>{section.isVisible ? "Visible" : "Hidden"}</label>
          {section.type === "HERO"
            ? <div className="flex items-center gap-2">{link ? <Link href={link} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Manage slides<ExternalLink className="h-3.5 w-3.5" /></Link> : null}<button type="button" onClick={() => setEditing(section)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit side cards</button></div>
            : canConfigure ? <button type="button" onClick={() => setEditing(section)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit content</button>
            : link ? <Link href={link} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit content<ExternalLink className="h-3.5 w-3.5" /></Link>
            : <span className="text-xs text-ink-faint">No settings</span>}
        </div>
      </div>;
    })}</div>}</div>
    </div>
    <div className="min-w-0 flex-1 xl:sticky xl:top-5"><div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5"><p className="text-[13px] font-semibold text-ink">Live preview</p><div className="flex items-center gap-1"><button type="button" onClick={() => setPreviewKey((key) => key + 1)} aria-label="Refresh preview" className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><RefreshCw className="h-3.5 w-3.5" /></button><a href={STOREFRONT_URL} target="_blank" rel="noreferrer" aria-label="Open storefront in a new tab" className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><ExternalLink className="h-3.5 w-3.5" /></a></div></div>
      <iframe key={previewKey} src={STOREFRONT_URL} title="Storefront live preview" className="h-[80vh] w-full border-0 bg-canvas" />
    </div></div>
  </div>
  {editing ? <ConfigDialog section={editing} onClose={() => setEditing(null)} onSaved={load} /> : null}
  </div>;
}

function ConfigDialog({ section, onClose, onSaved }: { section: Section; onClose: () => void; onSaved: () => Promise<void> }) {
  if (section.type === "HERO") return <HeroCardsDialog section={section} onClose={onClose} onSaved={onSaved} />;
  return <SectionContentDrawer section={section} onClose={onClose} onSaved={onSaved} />;
}

async function saveConfig(id: number, config: Record<string, unknown>) {
  const response = await fetch(`/api/homepage-sections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiMessage(payload, "Section could not be saved."));
}

type HeroCard = { kicker: string; heading: string; description: string; ctaLabel: string; href: string; image: string | null };
const emptyHeroCard: HeroCard = { kicker: "", heading: "", description: "", ctaLabel: "", href: "", image: null };

function HeroCardsDialog({ section, onClose, onSaved }: { section: Section; onClose: () => void; onSaved: () => Promise<void> }) {
  const configCards = Array.isArray(section.config.cards) ? section.config.cards : [];
  const [cards, setCards] = useState<HeroCard[]>([0, 1].map((index) => ({ ...emptyHeroCard, ...configCards[index] })));
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null]);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null]);
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null]);

  function updateCard(index: number, field: keyof HeroCard, value: string) {
    setCards((current) => current.map((card, i) => (i === index ? { ...card, [field]: value } : card)));
  }

  function chooseImage(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Images must be JPG, PNG or WebP files."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Images must be 5 MB or smaller."); return; }
    setImageFiles((current) => current.map((f, i) => (i === index ? file : f)));
    setImagePreviews((current) => current.map((p, i) => (i === index ? URL.createObjectURL(file) : p)));
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const nextCards = await Promise.all(cards.map(async (card, index) => {
        const file = imageFiles[index];
        if (!file) return card;
        const formData = new FormData();
        formData.set("file", file); formData.set("ownerType", "LIBRARY"); formData.set("ownerId", "0");
        formData.set("collection", "hero-side-cards"); formData.set("altText", card.heading.trim() || "Hero side card");
        const uploadResponse = await fetch("/api/media", { method: "POST", body: formData });
        const uploadPayload = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) throw new Error(apiMessage(uploadPayload, "The image could not be uploaded."));
        return { ...card, image: ((uploadPayload.data ?? uploadPayload) as MediaItem).url };
      }));
      await saveConfig(section.id, { cards: nextCards }); onClose(); await onSaved();
    }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Section could not be saved."); }
    finally { setSaving(false); }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="top-0 left-0 right-auto flex h-full max-w-xl translate-x-0 translate-y-0 flex-col rounded-none data-open:slide-in-from-left data-open:zoom-in-100 data-closed:slide-out-to-left data-closed:zoom-out-100"><DialogHeader><DialogTitle>Hero side cards</DialogTitle><DialogDescription>The two promo cards next to the hero carousel.</DialogDescription></DialogHeader><form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <div className="flex-1 space-y-5 overflow-y-auto pr-1">
  {cards.map((card, index) => { const previewSrc = imagePreviews[index] ?? (card.image ? (card.image.startsWith("/uploads/") ? mediaFileUrl(card.image) : card.image) : null); return <div key={index} className={index > 0 ? "border-t border-border pt-5" : undefined}>
    <p className="text-[13px] font-semibold text-ink">Card {index + 1}</p>
    <div className="mt-3 flex items-center gap-3"><div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border-strong bg-canvas">{previewSrc ? <NextImage unoptimized src={previewSrc} width={96} height={64} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-ink-faint" />}</div><div><input ref={(el) => { fileInputRefs.current[index] = el; }} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(index, event)} className="hidden" /><button type="button" onClick={() => fileInputRefs.current[index]?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Upload className="h-3.5 w-3.5" />{imageFiles[index] ? "Replace selection" : card.image ? "Replace image" : "Choose image"}</button><p className="mt-1.5 text-[10.5px] text-ink-muted">JPG, PNG or WebP, up to 5 MB.</p></div></div>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <label className="text-[13px] font-semibold text-ink-secondary">Kicker<input required value={card.kicker} onChange={(event) => updateCard(index, "kicker", event.target.value)} placeholder="e.g. Save up to £220" className={inputClass} /></label>
      <label className="text-[13px] font-semibold text-ink-secondary">Heading<input required value={card.heading} onChange={(event) => updateCard(index, "heading", event.target.value)} className={inputClass} /></label>
    </div>
    <label className="mt-3 block text-[13px] font-semibold text-ink-secondary">Description<textarea required value={card.description} onChange={(event) => updateCard(index, "description", event.target.value)} rows={2} className={`${inputClass} h-auto resize-y py-2`} /></label>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <label className="text-[13px] font-semibold text-ink-secondary">CTA label<input required value={card.ctaLabel} onChange={(event) => updateCard(index, "ctaLabel", event.target.value)} className={inputClass} /></label>
      <label className="text-[13px] font-semibold text-ink-secondary">CTA link<input required value={card.href} onChange={(event) => updateCard(index, "href", event.target.value)} placeholder="e.g. /category?deals=1" className={`${inputClass} font-mono`} /></label>
    </div>
  </div>; })}
  </div>
  <DialogFooter className="mt-4 rounded-none"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter></form></DialogContent></Dialog>;
}



function parseGamingTiers(value: unknown): GamingTier[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const specs = Array.isArray(record.specs) ? record.specs.flatMap((spec) => {
      if (!spec || typeof spec !== "object" || Array.isArray(spec)) return [];
      const entry = spec as Record<string, unknown>;
      return typeof entry.label === "string" && typeof entry.value === "string" ? [{ label: entry.label, value: entry.value }] : [];
    }) : [];
    return [{
      productSlug: typeof record.productSlug === "string" ? record.productSlug : "",
      tier: typeof record.tier === "string" ? record.tier : "",
      fps: typeof record.fps === "string" ? record.fps : "",
      ctaLabel: typeof record.ctaLabel === "string" ? record.ctaLabel : "View gaming PC",
      specs,
    }];
  });
}

function parseNeedCards(value: unknown): NeedCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.title !== "string" || typeof record.text !== "string" || typeof record.categorySlug !== "string") return [];
    return [{ title: record.title, text: record.text, categorySlug: record.categorySlug }];
  });
}

function parseLaptopCards(value: unknown): LaptopCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.title !== "string" || typeof record.text !== "string" || typeof record.categorySlug !== "string") return [];
    return [{ title: record.title, text: record.text, categorySlug: record.categorySlug }];
  });
}

function parseCategorySplitColumns(value: unknown): CategorySplitColumn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const heading = typeof record.heading === "string" ? record.heading : "";
    const text = typeof record.text === "string" ? record.text : "";
    const linkLabel = typeof record.linkLabel === "string" ? record.linkLabel : "";
    const categorySlug = typeof record.categorySlug === "string" ? record.categorySlug : "";
    const chips = Array.isArray(record.chips) ? record.chips.flatMap((chip) => (typeof chip === "string" ? [chip] : [])) : [];
    if (!heading && !text && !linkLabel && !categorySlug && !chips.length) return [];
    return [{ heading, text, linkLabel, categorySlug, chips }];
  });
}

function parseGuideSelections(value: unknown): GuideSelection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    return typeof record.pageSlug === "string" ? [{ pageSlug: record.pageSlug, tag: typeof record.tag === "string" ? record.tag : "Buying guide" }] : [];
  });
}

function gamingSpecsText(specs: GamingSpec[]) {
  return specs.map((spec) => `${spec.label}: ${spec.value}`).join("\n");
}

function parseGamingSpecs(value: string): GamingSpec[] {
  return value.split(/\r?\n/).flatMap((line) => {
    const separator = line.indexOf(":");
    if (separator < 1) return [];
    const label = line.slice(0, separator).trim();
    const text = line.slice(separator + 1).trim();
    return label && text ? [{ label, value: text }] : [];
  });
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

// One drawer for every section's content: heading/subtitle plus the section's own setting
// (featured rail, banner position, deals end date). Keeps any other config keys untouched on save.
function SectionContentDrawer({ section, onClose, onSaved }: { section: Section; onClose: () => void; onSaved: () => Promise<void> }) {
  const fields = TEXT_FIELDS[section.type] ?? {};
  const [heading, setHeading] = useState(text(section.config.heading));
  const [body, setBody] = useState(text(section.config.body));
  const [slug, setSlug] = useState(text(section.config.slug));
  const [position, setPosition] = useState(text(section.config.position));
  const [ctaLabel, setCtaLabel] = useState(text(section.config.ctaLabel));
  const [businessCategorySlug, setBusinessCategorySlug] = useState(text(section.config.categorySlug));
  const [gamingTiers, setGamingTiers] = useState(() => parseGamingTiers(section.config.products));
  const [gamingChips, setGamingChips] = useState<string[]>(() => Array.isArray(section.config.chips) ? section.config.chips.filter((chip): chip is string => typeof chip === "string") : []);
  const [needCards, setNeedCards] = useState(() => parseNeedCards(section.config.cards));
  const [laptopCards, setLaptopCards] = useState(() => parseLaptopCards(section.config.cards));
  const [splitColumns, setSplitColumns] = useState(() => parseCategorySplitColumns(section.config.columns));
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [brandSlugs, setBrandSlugs] = useState<string[]>(Array.isArray(section.config.brandSlugs) ? section.config.brandSlugs.filter((value): value is string => typeof value === "string") : []);
  const [arrivalTabSlugs, setArrivalTabSlugs] = useState<string[]>(Array.isArray(section.config.tabs) ? section.config.tabs.filter((value): value is string => typeof value === "string") : DEFAULT_ARRIVAL_TABS);
  const [faqCategories, setFaqCategories] = useState<FaqCategoryOption[]>([]);
  const [faqIds, setFaqIds] = useState<number[]>(Array.isArray(section.config.faqIds) ? section.config.faqIds.filter((value): value is number => typeof value === "number") : []);
  const [cmsPages, setCmsPages] = useState<CmsPageOption[]>([]);
  const [guideSelections, setGuideSelections] = useState(() => parseGuideSelections(section.config.guides));
  const [selectionLoadError, setSelectionLoadError] = useState("");
  const [gamingProducts, setGamingProducts] = useState<ProductOption[]>([]);
  const [gamingCategoryId, setGamingCategoryId] = useState<number | null>(null);
  const [activeGamingTier, setActiveGamingTier] = useState<number | null>(null);
  const [gamingProductQuery, setGamingProductQuery] = useState("");
  const [gamingProductResults, setGamingProductResults] = useState<ProductOption[]>([]);
  const [gamingProductsLoading, setGamingProductsLoading] = useState(false);
  const [gamingSearchLoading, setGamingSearchLoading] = useState(false);
  const [gamingSearchError, setGamingSearchError] = useState("");
  const [categoryPickerTarget, setCategoryPickerTarget] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySearchResults, setCategorySearchResults] = useState<CategoryOption[]>([]);
  const [categorySearchLoading, setCategorySearchLoading] = useState(false);
  const [categorySearchError, setCategorySearchError] = useState("");
  const [categoryLoadError, setCategoryLoadError] = useState("");
  const [featuredOptions, setFeaturedOptions] = useState<FeaturedSection[]>([]);
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const link = contentLink[section.type];

  useEffect(() => {
    if (section.type !== "FEATURED_PRODUCTS") return;
    const timer = window.setTimeout(async () => { try { const response = await fetch("/api/featured-sections", { cache: "no-store" }); const payload = await response.json(); if (response.ok) setFeaturedOptions(collectionFromApi<FeaturedSection>(payload)); } catch { /* the select still shows the saved slug */ } }, 0);
    return () => window.clearTimeout(timer);
  }, [section.type]);

  useEffect(() => {
    if (section.type !== "GAMING_SHOWCASE" && section.type !== "SHOP_BY_NEED" && section.type !== "LAPTOP_SHOWCASE" && section.type !== "NEW_ARRIVALS" && section.type !== "BUSINESS_BANNER") return;
    const isGaming = section.type === "GAMING_SHOWCASE";
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (isGaming && !cancelled) setGamingProductsLoading(true);
      try {
        const categoryResponse = await fetch("/api/catalog/categories?perPage=100", { cache: "no-store" });
        const categoryPayload = await categoryResponse.json().catch(() => ({}));
        if (!categoryResponse.ok) throw new Error(apiMessage(categoryPayload, "Categories could not be loaded."));
        const categories = collectionFromApi<CategoryOption>(categoryPayload);
        if (!cancelled) setCategoryOptions(categories);
        if (!isGaming) return;
        const gamingCategory = categories.find((category) => category.slug === "gaming-pcs");
        if (!gamingCategory) throw new Error("The Gaming PCs category could not be found.");
        const productsResponse = await fetch(`/api/products?status=ACTIVE&categoryId=${gamingCategory.id}&perPage=50`, { cache: "no-store" });
        const productsPayload = await productsResponse.json().catch(() => ({}));
        if (!productsResponse.ok) throw new Error(apiMessage(productsPayload, "Gaming PC products could not be loaded."));
        if (!cancelled) {
          setGamingCategoryId(gamingCategory.id);
          setGamingProducts(collectionFromApi<ProductOption>(productsPayload));
        }
      } catch (loadError) {
        if (!cancelled) setCategoryLoadError(loadError instanceof Error ? loadError.message : "Catalog data could not be loaded.");
      } finally {
        if (isGaming && !cancelled) setGamingProductsLoading(false);
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [section.type]);

  useEffect(() => {
    if (section.type !== "BRANDS") return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSelectionLoadError("");
      try {
        const response = await fetch("/api/catalog/brands?page=1&perPage=100&status=ACTIVE", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(payload, "Brands could not be loaded."));
        const options = collectionFromApi<BrandOption>(payload).filter((brand) => brand.status === "ACTIVE");
        if (cancelled) return;
        setBrandOptions(options);
        if (!Array.isArray(section.config.brandSlugs)) setBrandSlugs(options.slice(0, 8).map((brand) => brand.slug));
      } catch (loadError) {
        if (!cancelled) setSelectionLoadError(loadError instanceof Error ? loadError.message : "Brands could not be loaded.");
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [section.type, section.config.brandSlugs]);

  useEffect(() => {
    if (section.type !== "FAQS") return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSelectionLoadError("");
      try {
        const response = await fetch("/api/faq-categories", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(payload, "FAQs could not be loaded."));
        const options = collectionFromApi<FaqCategoryOption>(payload).filter((category) => category.status === "ACTIVE");
        if (cancelled) return;
        setFaqCategories(options);
        if (!Array.isArray(section.config.faqIds)) setFaqIds(options.flatMap((category) => category.faqs.filter((faq) => faq.status === "ACTIVE").map((faq) => faq.id)));
      } catch (loadError) {
        if (!cancelled) setSelectionLoadError(loadError instanceof Error ? loadError.message : "FAQs could not be loaded.");
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [section.type, section.config.faqIds]);

  useEffect(() => {
    if (section.type !== "BUYING_GUIDES") return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSelectionLoadError("");
      try {
        const response = await fetch("/api/cms/pages", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(payload, "CMS pages could not be loaded."));
        if (!cancelled) setCmsPages(collectionFromApi<CmsPageOption>(payload).filter((page) => page.status === "PUBLISHED"));
      } catch (loadError) {
        if (!cancelled) setSelectionLoadError(loadError instanceof Error ? loadError.message : "CMS pages could not be loaded.");
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [section.type]);

  useEffect(() => {
    if (section.type !== "GAMING_SHOWCASE" || activeGamingTier === null || gamingCategoryId === null) return;
    const query = gamingProductQuery.trim();
    if (!query) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setGamingSearchLoading(true);
      setGamingSearchError("");
      try {
        const response = await fetch(`/api/products?status=ACTIVE&categoryId=${gamingCategoryId}&perPage=50&q=${encodeURIComponent(query)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(payload, "Gaming PC search failed."));
        if (!cancelled) setGamingProductResults(collectionFromApi<ProductOption>(payload));
      } catch (searchError) {
        if (!cancelled) setGamingSearchError(searchError instanceof Error ? searchError.message : "Gaming PC search failed.");
      } finally {
        if (!cancelled) setGamingSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [section.type, activeGamingTier, gamingCategoryId, gamingProductQuery]);

  useEffect(() => {
    if ((section.type !== "GAMING_SHOWCASE" && section.type !== "SHOP_BY_NEED") || !categoryPickerTarget) return;
    const query = categorySearch.trim();
    if (!query) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCategorySearchLoading(true);
      setCategorySearchError("");
      try {
        const response = await fetch(`/api/catalog/categories?page=1&perPage=50&q=${encodeURIComponent(query)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(payload, "Category search failed."));
        if (!cancelled) setCategorySearchResults(collectionFromApi<CategoryOption>(payload));
      } catch (searchError) {
        if (!cancelled) setCategorySearchError(searchError instanceof Error ? searchError.message : "Category search failed.");
      } finally {
        if (!cancelled) setCategorySearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [section.type, categoryPickerTarget, categorySearch]);

  const invalidSplitColumns = splitColumns.filter((column) => !column.heading.trim() || !column.linkLabel.trim() || !column.categorySlug.trim());
  const missing = (section.type === "FEATURED_PRODUCTS" && !slug) || (section.type === "BANNERS" && !position.trim()) || (section.type === "GAMING_SHOWCASE" && (!gamingTiers.length || gamingTiers.some((tier) => !tier.productSlug || !tier.tier.trim()))) || (section.type === "SHOP_BY_NEED" && needCards.some((card) => !card.title.trim() || !card.categorySlug)) || (section.type === "LAPTOP_SHOWCASE" && laptopCards.some((card) => !card.title.trim() || !card.categorySlug)) || (section.type === "BUSINESS_BANNER" && (!heading.trim() || !businessCategorySlug)) || (section.type === "CATEGORY_SPLIT" && invalidSplitColumns.length > 0);
  function updateGamingTier(index: number, update: Partial<GamingTier>) {
    setGamingTiers((current) => current.map((tier, tierIndex) => tierIndex === index ? { ...tier, ...update } : tier));
  }
  function updateNeedCard(index: number, update: Partial<NeedCard>) {
    setNeedCards((current) => current.map((card, cardIndex) => cardIndex === index ? { ...card, ...update } : card));
  }
  function updateLaptopCard(index: number, update: Partial<LaptopCard>) {
    setLaptopCards((current) => current.map((card, cardIndex) => cardIndex === index ? { ...card, ...update } : card));
  }
  function updateSplitColumn(index: number, update: Partial<CategorySplitColumn>) {
    setSplitColumns((current) => current.map((column, columnIndex) => columnIndex === index ? { ...column, ...update } : column));
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    if (section.type === "CATEGORY_SPLIT" && invalidSplitColumns.length > 0) {
      setError("Each split promo column needs a heading, button label, and destination category.");
      setSaving(false);
      return;
    }
    const config: Record<string, unknown> = { ...section.config };
    // An empty heading falls back to the default; an empty body hides the line, or goes automatic where it has one.
    if (fields.heading) config.heading = heading.trim() || null;
    if (fields.body) config.body = fields.body.auto && !body.trim() ? null : body.trim();
    if (section.type === "FEATURED_PRODUCTS") config.slug = slug;
    if (section.type === "BANNERS") config.position = position.trim();
    if (section.type === "BUSINESS_BANNER") {
      config.categorySlug = businessCategorySlug;
      config.ctaLabel = ctaLabel.trim();
    }
    if (section.type === "BRANDS") config.brandSlugs = brandSlugs.slice(0, 8);
    if (section.type === "NEW_ARRIVALS") config.tabs = arrivalTabSlugs;
    if (section.type === "FAQS") config.faqIds = faqIds;
    if (section.type === "BUYING_GUIDES") config.guides = guideSelections;
    if (section.type === "DEALS") delete config.endsAt;
    if (section.type === "GAMING_SHOWCASE") {
      config.products = gamingTiers.map((tier) => ({
        productSlug: tier.productSlug,
        tier: tier.tier.trim(),
        fps: tier.fps.trim(),
        ctaLabel: tier.ctaLabel.trim() || "View gaming PC",
        specs: tier.specs.filter((spec) => spec.label.trim() && spec.value.trim()).map((spec) => ({ label: spec.label.trim(), value: spec.value.trim() })),
      }));
      config.chips = gamingChips;
    }
    if (section.type === "SHOP_BY_NEED") {
      config.cards = needCards.map((card) => ({ title: card.title.trim(), text: card.text.trim(), categorySlug: card.categorySlug }));
    }
    if (section.type === "LAPTOP_SHOWCASE") {
      config.cards = laptopCards.map((card) => ({ title: card.title.trim(), text: card.text.trim(), categorySlug: card.categorySlug }));
    }
    if (section.type === "CATEGORY_SPLIT") {
      config.columns = splitColumns.filter((column) => column.heading.trim() || column.text.trim() || column.linkLabel.trim() || column.categorySlug || column.chips.length).map((column) => ({
        heading: column.heading.trim(),
        text: column.text.trim(),
        linkLabel: column.linkLabel.trim(),
        categorySlug: column.categorySlug,
        chips: column.chips.filter((chip) => chip.trim()),
      }));
    }
    try { await saveConfig(section.id, config); onClose(); await onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Section could not be saved."); } finally { setSaving(false); }
  }

  const label = "block text-[13px] font-semibold text-ink-secondary";
  const hint = "mt-1 block text-xs font-normal text-ink-muted";
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className={section.type === "SEO_INTRO" ? "max-w-2xl" : undefined}>
    <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="border-b border-border px-5 py-4 pr-12"><DialogTitle className="text-[15px] font-semibold text-ink">{section.label}</DialogTitle><DialogDescription className="text-xs text-ink-muted">{meta[section.type].description}</DialogDescription></DialogHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {error ? <div role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
        {section.type === "FEATURED_PRODUCTS" ? <label className={label}>Featured section<select value={slug} onChange={(event) => setSlug(event.target.value)} className={inputClass}><option value="">Select…</option>{featuredOptions.map((option) => <option key={option.id} value={option.slug}>{option.title}</option>)}{slug && !featuredOptions.some((option) => option.slug === slug) ? <option value={slug}>{slug}</option> : null}</select><span className={hint}>Manage the rails themselves in Merchandising → Featured sections.</span></label> : null}
        {section.type === "BANNERS" ? <label className={label}>Banner position<input required value={position} onChange={(event) => setPosition(event.target.value)} placeholder="e.g. home-top" className={`${inputClass} font-mono`} /><span className={`${hint} flex items-center gap-1.5`}><Gift className="h-3.5 w-3.5" />Add or edit the banners themselves in Merchandising → Banners.</span></label> : null}
        {fields.heading ? <label className={label}>Heading<input value={heading} onChange={(event) => setHeading(event.target.value)} maxLength={120} placeholder={fields.heading.auto ?? "Leave empty to use the original heading"} className={inputClass} />{fields.heading.auto ? <span className={hint}>Leave empty: {fields.heading.auto.toLowerCase()}.</span> : null}</label> : null}
        {fields.body ? <label className={label}>{fields.body.label}<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={fields.body.rows ?? 2} maxLength={section.type === "SEO_INTRO" ? 5000 : 300} placeholder={fields.body.auto ?? "Leave empty to hide this line"} className={`${inputClass} h-auto resize-y py-2 leading-relaxed`} /><span className={hint}>{fields.body.hint ?? (fields.body.auto ? "Leave empty for the automatic text." : "Leave empty to hide it.")}</span></label> : null}
        {selectionLoadError ? <p role="alert" className="rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink">{selectionLoadError}</p> : null}
        {section.type === "BUSINESS_BANNER" ? <div className="space-y-3">
          {categoryLoadError ? <p role="alert" className="rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink">{categoryLoadError}</p> : null}
          <label className={label}>Destination category<select required value={businessCategorySlug} onChange={(event) => setBusinessCategorySlug(event.target.value)} className={inputClass}><option value="">Select a category…</option>{categoryOptions.map((category) => <option key={category.id} value={category.slug}>{category.title}</option>)}</select></label>
          <label className={label}>Button label<input value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} maxLength={40} placeholder="e.g. Explore business PCs" className={inputClass} /></label>
        </div> : null}
        {section.type === "BRANDS" ? <div className="space-y-2">
          <div><h3 className="text-[13px] font-semibold text-ink-secondary">Brand selection</h3><p className={hint}>Choose up to 8 active brands. Leave the current selection to keep the existing homepage grid.</p></div>
          <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border px-3">
            {brandOptions.map((brand) => <label key={brand.id} className="flex min-h-9 items-center gap-2.5 text-xs text-ink-secondary"><input type="checkbox" checked={brandSlugs.includes(brand.slug)} disabled={!brandSlugs.includes(brand.slug) && brandSlugs.length >= 8} onChange={(event) => setBrandSlugs((current) => event.target.checked ? [...current, brand.slug].slice(0, 8) : current.filter((slugValue) => slugValue !== brand.slug))} />{brand.title}<span className="ml-auto text-ink-faint">{brand.slug}</span></label>)}
            {!brandOptions.length && !selectionLoadError ? <p className="py-3 text-xs text-ink-muted">No active brands available.</p> : null}
          </div>
        </div> : null}
        {section.type === "NEW_ARRIVALS" ? <div className="space-y-2">
          <div><h3 className="text-[13px] font-semibold text-ink-secondary">Arrival tabs</h3><p className={hint}>Choose the category tabs shoppers can use. “All” is always shown.</p></div>
          {categoryLoadError ? <p role="alert" className="rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink">{categoryLoadError}</p> : null}
          <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border px-3">
            {categoryOptions.map((category) => <label key={category.id} className="flex min-h-9 items-center gap-2.5 text-xs text-ink-secondary"><input type="checkbox" checked={arrivalTabSlugs.includes(category.slug)} onChange={(event) => setArrivalTabSlugs((current) => event.target.checked ? [...current, category.slug] : current.filter((slugValue) => slugValue !== category.slug))} />{category.title}<span className="ml-auto text-ink-faint">{category.slug}</span></label>)}
            {!categoryOptions.length && !categoryLoadError ? <p className="py-3 text-xs text-ink-muted">Loading categories…</p> : null}
          </div>
        </div> : null}
        {section.type === "FAQS" ? <div className="space-y-2">
          <div><h3 className="text-[13px] font-semibold text-ink-secondary">Homepage FAQs</h3><p className={hint}>Choose the active questions shown in this section.</p></div>
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-border p-3">
            {faqCategories.map((category) => <fieldset key={category.id} className="space-y-1.5">
              <legend className="mb-1 text-xs font-semibold text-ink">{category.name}</legend>
              {category.faqs.filter((faq) => faq.status === "ACTIVE").map((faq) => <label key={faq.id} className="flex items-start gap-2.5 py-1 text-xs text-ink-secondary"><input type="checkbox" checked={faqIds.includes(faq.id)} onChange={(event) => setFaqIds((current) => event.target.checked ? [...current, faq.id] : current.filter((id) => id !== faq.id))} className="mt-0.5" /><span>{faq.question}</span></label>)}
            </fieldset>)}
            {!faqCategories.length && !selectionLoadError ? <p className="text-xs text-ink-muted">Loading FAQs…</p> : null}
          </div>
        </div> : null}
        {section.type === "BUYING_GUIDES" ? <div className="space-y-2">
          <div><h3 className="text-[13px] font-semibold text-ink-secondary">Published CMS pages</h3><p className={hint}>Selected pages appear as buying guides and link to their published storefront page.</p></div>
          <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border px-3">
            {cmsPages.map((page) => <label key={page.id} className="flex min-h-10 items-center gap-2.5 text-xs text-ink-secondary"><input type="checkbox" checked={guideSelections.some((guide) => guide.pageSlug === page.slug)} onChange={(event) => setGuideSelections((current) => event.target.checked ? [...current, { pageSlug: page.slug, tag: "Buying guide" }] : current.filter((guide) => guide.pageSlug !== page.slug))} /><span>{page.title}</span><span className="ml-auto text-ink-faint">/pages/{page.slug}</span></label>)}
            {!cmsPages.length && !selectionLoadError ? <p className="py-3 text-xs text-ink-muted">No published CMS pages available.</p> : null}
          </div>
        </div> : null}
        {section.type === "GAMING_SHOWCASE" ? (
          <div className="space-y-4">
            <div><h3 className="text-[13px] font-semibold text-ink-secondary">Gaming tiers</h3><p className={hint}>Product name, image and current price come from the selected catalog product. Only add specifications and performance details verified for that build.</p></div>
            {categoryLoadError ? <p role="alert" className="rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink">{categoryLoadError}</p> : null}
            {gamingTiers.map((tier, index) => (
              <section key={`${index}-${tier.productSlug}`} className="space-y-3 rounded-md border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3"><h4 className="text-xs font-semibold text-ink">Tier {index + 1}</h4><div className="flex items-center gap-1">
                  <button type="button" disabled={index === 0} onClick={() => setGamingTiers((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} aria-label={`Move tier ${index + 1} up`} className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={index === gamingTiers.length - 1} onClick={() => setGamingTiers((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })} aria-label={`Move tier ${index + 1} down`} className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={gamingTiers.length <= 1} onClick={() => setGamingTiers((current) => current.filter((_, tierIndex) => tierIndex !== index))} aria-label={`Remove tier ${index + 1}`} className="flex h-7 w-7 items-center justify-center rounded text-danger hover:bg-danger-tint disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
                </div></div>
                <div className="relative">
                  <label className={label}>Gaming PC<input
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={activeGamingTier === index}
                    aria-controls={`gaming-product-options-${index}`}
                    autoComplete="off"
                    disabled={gamingProductsLoading}
                    value={activeGamingTier === index ? gamingProductQuery : gamingProducts.find((product) => product.slug === tier.productSlug)?.title ?? tier.productSlug}
                    onFocus={() => { setActiveGamingTier(index); setGamingProductQuery(""); setGamingSearchError(""); }}
                    onChange={(event) => { setActiveGamingTier(index); setGamingProductQuery(event.target.value); setGamingSearchError(""); }}
                    onBlur={(event) => {
                      const nextTarget = event.relatedTarget;
                      if (nextTarget instanceof Node && event.currentTarget.closest(".relative")?.contains(nextTarget)) return;
                      window.setTimeout(() => setActiveGamingTier((active) => active === index ? null : active), 150);
                    }}
                    placeholder={gamingProductsLoading ? "Loading Gaming PCs…" : "Search Gaming PCs…"}
                    className={inputClass}
                  /></label>
                  {activeGamingTier === index ? <div id={`gaming-product-options-${index}`} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-card">
                    {gamingSearchLoading ? <p className="px-2 py-2 text-xs text-ink-muted" role="status">Searching catalog…</p> : null}
                    {gamingSearchError ? <p className="px-2 py-2 text-xs text-danger" role="alert">{gamingSearchError}</p> : null}
                    {(gamingProductQuery.trim() ? gamingProductResults : gamingProducts).map((product) => <button type="button" role="option" aria-selected={product.slug === tier.productSlug} key={product.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { updateGamingTier(index, { productSlug: product.slug }); setGamingProducts((current) => current.some((item) => item.slug === product.slug) ? current : [...current, product]); setActiveGamingTier(null); setGamingProductQuery(""); }} className="block w-full rounded px-2 py-2 text-left text-xs text-ink-secondary hover:bg-neutral-tint"><span className="block font-semibold text-ink">{product.title}</span><span className="mt-0.5 block text-ink-muted">{product.slug}</span></button>)}
                    {!gamingSearchLoading && !gamingSearchError && !(gamingProductQuery.trim() ? gamingProductResults : gamingProducts).length ? <p className="px-2 py-2 text-xs text-ink-muted">No active Gaming PCs found.</p> : null}
                  </div> : null}
                </div>
                <label className={label}>Tier label<input value={tier.tier} onChange={(event) => updateGamingTier(index, { tier: event.target.value })} maxLength={80} placeholder="e.g. TIER 01 · 1080P" className={inputClass} /></label>
                <label className={label}>Performance line<input value={tier.fps} onChange={(event) => updateGamingTier(index, { fps: event.target.value })} maxLength={120} placeholder="e.g. 140–240 FPS @ 1080p Ultra" className={inputClass} /></label>
                <label className={label}>Specifications<textarea value={gamingSpecsText(tier.specs)} onChange={(event) => updateGamingTier(index, { specs: parseGamingSpecs(event.target.value) })} rows={4} maxLength={1200} placeholder={'CPU: verified processor\nGPU: verified graphics card'} className={`${inputClass} h-auto resize-y py-2 leading-relaxed`} /><span className={hint}>One verified “Label: value” pair per line.</span></label>
                <label className={label}>Button label<input value={tier.ctaLabel} onChange={(event) => updateGamingTier(index, { ctaLabel: event.target.value })} maxLength={40} className={inputClass} /></label>
              </section>
            ))}
            <button type="button" disabled={gamingTiers.length >= 6} onClick={() => setGamingTiers((current) => [...current, { productSlug: "", tier: `TIER ${String(current.length + 1).padStart(2, "0")}`, fps: "", ctaLabel: "View gaming PC", specs: [] }])} className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Add tier</button>
            <div className="space-y-2 border-t border-border pt-4">
              <div className="relative">
                <label className={label}>Category chips<input
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={categoryPickerTarget === "chips"}
                  aria-controls="homepage-category-options"
                  autoComplete="off"
                  value={categorySearch}
                  onFocus={() => { setCategoryPickerTarget("chips"); setCategorySearch(""); setCategorySearchError(""); }}
                  onChange={(event) => { setCategoryPickerTarget("chips"); setCategorySearch(event.target.value); setCategorySearchError(""); }}
                  onBlur={(event) => {
                    const nextTarget = event.relatedTarget;
                    if (nextTarget instanceof Node && event.currentTarget.closest(".relative")?.contains(nextTarget)) return;
                    window.setTimeout(() => setCategoryPickerTarget((target) => target === "chips" ? null : target), 150);
                  }}
                  placeholder="Search categories to add…"
                  className={inputClass}
                /></label>
                {categoryPickerTarget === "chips" ? <div id="homepage-category-options" role="listbox" aria-label="Category search results" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-card">
                  {categorySearchLoading ? <p className="px-2 py-2 text-xs text-ink-muted" role="status">Searching categories…</p> : null}
                  {categorySearchError ? <p className="px-2 py-2 text-xs text-danger" role="alert">{categorySearchError}</p> : null}
                  {(categorySearch.trim() ? categorySearchResults : categoryOptions).filter((category) => !gamingChips.includes(category.slug)).map((category) => <button type="button" role="option" aria-selected={false} key={category.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setGamingChips((current) => [...current, category.slug]); setCategoryPickerTarget(null); setCategorySearch(""); }} className="block w-full rounded px-2 py-2 text-left text-xs text-ink-secondary hover:bg-neutral-tint">{category.title}<span className="ml-2 text-ink-muted">{category.slug}</span></button>)}
                  {!categorySearchLoading && !categorySearchError && !(categorySearch.trim() ? categorySearchResults : categoryOptions).filter((category) => !gamingChips.includes(category.slug)).length ? <p className="px-2 py-2 text-xs text-ink-muted">No categories found.</p> : null}
                </div> : null}
              </div>
              <div className="flex flex-wrap gap-2">{gamingChips.map((chip) => {
                const category = [...categoryOptions, ...categorySearchResults].find((item) => item.slug === chip);
                return <span key={chip} className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-1 text-xs text-ink-secondary">{category?.title ?? chip}<button type="button" onClick={() => setGamingChips((current) => current.filter((slug) => slug !== chip))} aria-label={`Remove ${category?.title ?? chip}`} className="text-ink-muted hover:text-danger"><X className="h-3 w-3" /></button></span>;
              })}</div>
            </div>
          </div>
        ) : null}
        {section.type === "SHOP_BY_NEED" ? (
          <div className="space-y-4">
            <div><h3 className="text-[13px] font-semibold text-ink-secondary">Need cards</h3><p className={hint}>Edit each card and choose the category it should open. The card order here is the order on the homepage.</p></div>
            {categoryLoadError ? <p role="alert" className="rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink">{categoryLoadError}</p> : null}
            {!needCards.length ? <p className="rounded-md border border-dashed border-border p-3 text-xs text-ink-muted">No cards yet. Add a card to show this section.</p> : null}
            {needCards.map((card, index) => {
              const target = `need-${index}`;
              const selectedCategory = [...categoryOptions, ...categorySearchResults].find((category) => category.slug === card.categorySlug);
              const options = categorySearch.trim() ? categorySearchResults : categoryOptions;
              return <section key={`${index}-${card.categorySlug}`} className="space-y-3 rounded-md border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3"><h4 className="text-xs font-semibold text-ink">Card {index + 1}</h4><div className="flex items-center gap-1">
                  <button type="button" disabled={index === 0} onClick={() => setNeedCards((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} aria-label={`Move card ${index + 1} up`} className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={index === needCards.length - 1} onClick={() => setNeedCards((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })} aria-label={`Move card ${index + 1} down`} className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setNeedCards((current) => current.filter((_, cardIndex) => cardIndex !== index))} aria-label={`Remove card ${index + 1}`} className="flex h-7 w-7 items-center justify-center rounded text-danger hover:bg-danger-tint"><Trash2 className="h-3.5 w-3.5" /></button>
                </div></div>
                <label className={label}>Card title<input required value={card.title} onChange={(event) => updateNeedCard(index, { title: event.target.value })} maxLength={80} className={inputClass} /></label>
                <label className={label}>Description<textarea value={card.text} onChange={(event) => updateNeedCard(index, { text: event.target.value })} rows={2} maxLength={240} className={`${inputClass} h-auto resize-y py-2 leading-relaxed`} /></label>
                <div className="relative">
                  <label className={label}>Destination category<input
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={categoryPickerTarget === target}
                    aria-controls={`need-category-options-${index}`}
                    autoComplete="off"
                    value={categoryPickerTarget === target ? categorySearch : selectedCategory?.title ?? card.categorySlug}
                    onFocus={() => { setCategoryPickerTarget(target); setCategorySearch(""); setCategorySearchError(""); }}
                    onChange={(event) => { setCategoryPickerTarget(target); setCategorySearch(event.target.value); setCategorySearchError(""); }}
                    onBlur={(event) => {
                      const nextTarget = event.relatedTarget;
                      if (nextTarget instanceof Node && event.currentTarget.closest(".relative")?.contains(nextTarget)) return;
                      window.setTimeout(() => setCategoryPickerTarget((active) => active === target ? null : active), 150);
                    }}
                    placeholder="Search categories…"
                    className={inputClass}
                  /></label>
                  {categoryPickerTarget === target ? <div id={`need-category-options-${index}`} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-card">
                    {categorySearchLoading ? <p className="px-2 py-2 text-xs text-ink-muted" role="status">Searching categories…</p> : null}
                    {categorySearchError ? <p className="px-2 py-2 text-xs text-danger" role="alert">{categorySearchError}</p> : null}
                    {options.map((category) => <button type="button" role="option" aria-selected={category.slug === card.categorySlug} key={category.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { updateNeedCard(index, { categorySlug: category.slug }); setCategoryPickerTarget(null); setCategorySearch(""); }} className="block w-full rounded px-2 py-2 text-left text-xs text-ink-secondary hover:bg-neutral-tint">{category.title}<span className="ml-2 text-ink-muted">{category.slug}</span></button>)}
                    {!categorySearchLoading && !categorySearchError && !options.length ? <p className="px-2 py-2 text-xs text-ink-muted">No categories found.</p> : null}
                  </div> : null}
                </div>
              </section>;
            })}
            <button type="button" disabled={needCards.length >= 9} onClick={() => setNeedCards((current) => [...current, { title: "", text: "", categorySlug: "" }])} className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Add card</button>
          </div>
        ) : null}
        {section.type === "CATEGORY_SPLIT" ? (
          <div className="space-y-4">
            <div><h3 className="text-[13px] font-semibold text-ink-secondary">Split columns</h3><p className={hint}>Edit each large promo column, its link target, and the category chips shown beneath it.</p></div>
            {categoryLoadError ? <p role="alert" className="rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink">{categoryLoadError}</p> : null}
            {!splitColumns.length ? <p className="rounded-md border border-dashed border-border p-3 text-xs text-ink-muted">No columns yet. Add a column to show this section.</p> : null}
            {splitColumns.map((column, index) => {
              const target = `split-${index}`;
              const selectedCategory = [...categoryOptions, ...categorySearchResults].find((category) => category.slug === column.categorySlug);
              const options = categorySearch.trim() ? categorySearchResults : categoryOptions;
              return <section key={`${index}-${column.categorySlug || "new"}`} className="space-y-3 rounded-md border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3"><h4 className="text-xs font-semibold text-ink">Column {index + 1}</h4><div className="flex items-center gap-1">
                  <button type="button" disabled={index === 0} onClick={() => setSplitColumns((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} aria-label={`Move column ${index + 1} up`} className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={index === splitColumns.length - 1} onClick={() => setSplitColumns((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })} aria-label={`Move column ${index + 1} down`} className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setSplitColumns((current) => current.filter((_, columnIndex) => columnIndex !== index))} aria-label={`Remove column ${index + 1}`} className="flex h-7 w-7 items-center justify-center rounded text-danger hover:bg-danger-tint"><Trash2 className="h-3.5 w-3.5" /></button>
                </div></div>
                <label className={label}>Heading<input required value={column.heading} onChange={(event) => updateSplitColumn(index, { heading: event.target.value })} maxLength={80} className={inputClass} /></label>
                <label className={label}>Text<textarea value={column.text} onChange={(event) => updateSplitColumn(index, { text: event.target.value })} rows={2} maxLength={240} className={`${inputClass} h-auto resize-y py-2 leading-relaxed`} /></label>
                <label className={label}>Button label<input required value={column.linkLabel} onChange={(event) => updateSplitColumn(index, { linkLabel: event.target.value })} maxLength={40} className={inputClass} /></label>
                <div className="relative">
                  <label className={label}>Destination category<input
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={categoryPickerTarget === target}
                    aria-controls={`split-category-options-${index}`}
                    autoComplete="off"
                    value={categoryPickerTarget === target ? categorySearch : selectedCategory?.title ?? column.categorySlug}
                    onFocus={() => { setCategoryPickerTarget(target); setCategorySearch(""); setCategorySearchError(""); }}
                    onChange={(event) => { setCategoryPickerTarget(target); setCategorySearch(event.target.value); setCategorySearchError(""); }}
                    onBlur={(event) => {
                      const nextTarget = event.relatedTarget;
                      if (nextTarget instanceof Node && event.currentTarget.closest(".relative")?.contains(nextTarget)) return;
                      window.setTimeout(() => setCategoryPickerTarget((active) => active === target ? null : active), 150);
                    }}
                    placeholder="Search categories…"
                    className={inputClass}
                  /></label>
                  {categoryPickerTarget === target ? <div id={`split-category-options-${index}`} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-card">
                    {categorySearchLoading ? <p className="px-2 py-2 text-xs text-ink-muted" role="status">Searching categories…</p> : null}
                    {categorySearchError ? <p className="px-2 py-2 text-xs text-danger" role="alert">{categorySearchError}</p> : null}
                    {options.map((category) => <button type="button" role="option" aria-selected={category.slug === column.categorySlug} key={category.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { updateSplitColumn(index, { categorySlug: category.slug }); setCategoryPickerTarget(null); setCategorySearch(""); }} className="block w-full rounded px-2 py-2 text-left text-xs text-ink-secondary hover:bg-neutral-tint">{category.title}<span className="ml-2 text-ink-muted">{category.slug}</span></button>)}
                    {!categorySearchLoading && !categorySearchError && !options.length ? <p className="px-2 py-2 text-xs text-ink-muted">No categories found.</p> : null}
                  </div> : null}
                </div>
                <div className="space-y-2">
                  <label className={label}>Chip categories</label>
                  <div className="flex flex-wrap gap-2">
                    {column.chips.map((chip) => <span key={`${chip}-${index}`} className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-1 text-xs text-ink-secondary">{chip}<button type="button" onClick={() => updateSplitColumn(index, { chips: column.chips.filter((item) => item !== chip) })} aria-label={`Remove ${chip}`} className="text-ink-muted hover:text-danger"><X className="h-3 w-3" /></button></span>)}
                  </div>
                  <button type="button" onClick={() => {
                    setCategoryPickerTarget(target);
                    setCategorySearch("");
                    setCategorySearchError("");
                  }} className="inline-flex h-8 items-center gap-2 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"> <Plus className="h-3.5 w-3.5" />Add chip category</button>
                  {categoryPickerTarget === target ? <div className="mt-2 rounded-md border border-border bg-canvas p-2 text-[11px] text-ink-muted">Choose a category from the list above to add it as a chip.</div> : null}
                </div>
              </section>;
            })}
            <button type="button" onClick={() => setSplitColumns((current) => [...current, { heading: "", text: "", linkLabel: "Shop now", categorySlug: "", chips: [] }])} className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Plus className="h-3.5 w-3.5" />Add column</button>
          </div>
        ) : null}
        {section.type === "LAPTOP_SHOWCASE" ? (
          <div className="space-y-4">
            <div><h3 className="text-[13px] font-semibold text-ink-secondary">Laptop cards</h3><p className={hint}>Edit each laptop card and choose the category it should open. The card order here is the order on the homepage.</p></div>
            {categoryLoadError ? <p role="alert" className="rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink">{categoryLoadError}</p> : null}
            {!laptopCards.length ? <p className="rounded-md border border-dashed border-border p-3 text-xs text-ink-muted">No cards yet. Add a card to show this section.</p> : null}
            {laptopCards.map((card, index) => {
              const target = `laptop-${index}`;
              const selectedCategory = [...categoryOptions, ...categorySearchResults].find((category) => category.slug === card.categorySlug);
              const options = categorySearch.trim() ? categorySearchResults : categoryOptions;
              return <section key={`${index}-${card.categorySlug}`} className="space-y-3 rounded-md border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3"><h4 className="text-xs font-semibold text-ink">Card {index + 1}</h4><div className="flex items-center gap-1">
                  <button type="button" disabled={index === 0} onClick={() => setLaptopCards((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} aria-label={`Move card ${index + 1} up`} className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={index === laptopCards.length - 1} onClick={() => setLaptopCards((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })} aria-label={`Move card ${index + 1} down`} className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setLaptopCards((current) => current.filter((_, cardIndex) => cardIndex !== index))} aria-label={`Remove card ${index + 1}`} className="flex h-7 w-7 items-center justify-center rounded text-danger hover:bg-danger-tint"><Trash2 className="h-3.5 w-3.5" /></button>
                </div></div>
                <label className={label}>Card title<input required value={card.title} onChange={(event) => updateLaptopCard(index, { title: event.target.value })} maxLength={80} className={inputClass} /></label>
                <label className={label}>Description<textarea value={card.text} onChange={(event) => updateLaptopCard(index, { text: event.target.value })} rows={2} maxLength={240} className={`${inputClass} h-auto resize-y py-2 leading-relaxed`} /></label>
                <div className="relative">
                  <label className={label}>Destination category<input
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={categoryPickerTarget === target}
                    aria-controls={`laptop-category-options-${index}`}
                    autoComplete="off"
                    value={categoryPickerTarget === target ? categorySearch : selectedCategory?.title ?? card.categorySlug}
                    onFocus={() => { setCategoryPickerTarget(target); setCategorySearch(""); setCategorySearchError(""); }}
                    onChange={(event) => { setCategoryPickerTarget(target); setCategorySearch(event.target.value); setCategorySearchError(""); }}
                    onBlur={(event) => {
                      const nextTarget = event.relatedTarget;
                      if (nextTarget instanceof Node && event.currentTarget.closest(".relative")?.contains(nextTarget)) return;
                      window.setTimeout(() => setCategoryPickerTarget((active) => active === target ? null : active), 150);
                    }}
                    placeholder="Search categories…"
                    className={inputClass}
                  /></label>
                  {categoryPickerTarget === target ? <div id={`laptop-category-options-${index}`} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-card">
                    {categorySearchLoading ? <p className="px-2 py-2 text-xs text-ink-muted" role="status">Searching categories…</p> : null}
                    {categorySearchError ? <p className="px-2 py-2 text-xs text-danger" role="alert">{categorySearchError}</p> : null}
                    {options.map((category) => <button type="button" role="option" aria-selected={category.slug === card.categorySlug} key={category.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { updateLaptopCard(index, { categorySlug: category.slug }); setCategoryPickerTarget(null); setCategorySearch(""); }} className="block w-full rounded px-2 py-2 text-left text-xs text-ink-secondary hover:bg-neutral-tint">{category.title}<span className="ml-2 text-ink-muted">{category.slug}</span></button>)}
                    {!categorySearchLoading && !categorySearchError && !options.length ? <p className="px-2 py-2 text-xs text-ink-muted">No categories found.</p> : null}
                  </div> : null}
                </div>
              </section>;
            })}
            <button type="button" disabled={laptopCards.length >= 9} onClick={() => setLaptopCards((current) => [...current, { title: "", text: "", categorySlug: "" }])} className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Add card</button>
          </div>
        ) : null}
        {section.type === "DEALS" ? <p className="rounded-md border border-border bg-canvas p-3 text-xs leading-relaxed text-ink-muted">The homepage timer follows the earliest end date among the sale products shown in this section. Set each product&rsquo;s sale end date in its product settings. If none of the shown deals have an end date, the timer stays hidden.</p> : null}
        {!fields.heading && !fields.body && section.type !== "FEATURED_PRODUCTS" && section.type !== "BANNERS" ? <p className="text-xs text-ink-muted">This section has no text of its own.</p> : null}
        {link ? <Link href={link} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary underline underline-offset-2 hover:text-ink">Manage the items shown here<ExternalLink className="h-3.5 w-3.5" /></Link> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-border bg-canvas px-5 py-3"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border bg-surface px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving || missing} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></div>
    </form>
  </DrawerContent></Dialog>;
}
