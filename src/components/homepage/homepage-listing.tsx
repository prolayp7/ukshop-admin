"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowUp, BookOpen, Compass, ExternalLink, FileSearch, Gamepad2, Gift, Grid3x3, Images, Laptop, LayoutTemplate, LoaderCircle, Mail, MessageSquareQuote, Newspaper, Percent, RefreshCw, ShieldCheck, Sparkles, Store, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { collectionFromApi } from "@/lib/api-response";

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3002";

type SectionType = "HERO" | "TRUST_STRIP" | "DEALS" | "FEATURED_PRODUCTS" | "NEW_ARRIVALS" | "BRANDS" | "TESTIMONIALS" | "BLOG_HIGHLIGHTS" | "FAQS" | "BANNERS" | "NEWSLETTER" | "CATEGORY_SHOWCASE" | "SHOP_BY_NEED" | "GAMING_SHOWCASE" | "LAPTOP_SHOWCASE" | "BUYING_GUIDES" | "SEO_INTRO";
type Section = { id: number; type: SectionType; label: string; sortOrder: number; isVisible: boolean; config: Record<string, unknown> };
type FeaturedSection = { id: number; title: string; slug: string };

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }

const meta: Record<SectionType, { icon: typeof LayoutTemplate; description: string }> = {
  HERO: { icon: LayoutTemplate, description: "Homepage hero carousel." },
  TRUST_STRIP: { icon: ShieldCheck, description: "Delivery, warranty and finance trust badges." },
  DEALS: { icon: Percent, description: "Automatic — products currently on sale." },
  FEATURED_PRODUCTS: { icon: Sparkles, description: "A curated product rail." },
  NEW_ARRIVALS: { icon: Sparkles, description: "Automatic — most recently added products." },
  BRANDS: { icon: Store, description: "Automatic — brand logos grid." },
  TESTIMONIALS: { icon: MessageSquareQuote, description: "Customer testimonials." },
  BLOG_HIGHLIGHTS: { icon: Newspaper, description: "Latest published blog posts." },
  FAQS: { icon: Tag, description: "Frequently asked questions." },
  BANNERS: { icon: Images, description: "Promotional banners at a given position." },
  NEWSLETTER: { icon: Mail, description: "Email signup strip." },
  CATEGORY_SHOWCASE: { icon: Grid3x3, description: "Automatic — category tiles grid." },
  SHOP_BY_NEED: { icon: Compass, description: "Fixed content — task-based shopping cards." },
  GAMING_SHOWCASE: { icon: Gamepad2, description: "Fixed content — pre-built gaming PC tiers." },
  LAPTOP_SHOWCASE: { icon: Laptop, description: "Fixed content — laptop category cards." },
  BUYING_GUIDES: { icon: BookOpen, description: "Fixed content — computer buying guides." },
  SEO_INTRO: { icon: FileSearch, description: "Fixed content — SEO intro copy and special offer." },
};
// Where each type's content is actually authored - some point at an existing
// admin page (this Homepage view only controls order/visibility for those),
// some open a small config editor here, and the fully-automatic ones need no editor.
const contentLink: Partial<Record<SectionType, string>> = { HERO: "/merchandising", TRUST_STRIP: "/merchandising", TESTIMONIALS: "/support-content", BLOG_HIGHLIGHTS: "/blog", FAQS: "/support-content" };
const configurable: SectionType[] = ["FEATURED_PRODUCTS", "BANNERS", "NEWSLETTER"];

export function HomepageListing() {
  const [items, setItems] = useState<Section[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await fetch("/api/homepage-sections", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(apiMessage(payload, "Homepage sections could not be loaded.")); setItems(collectionFromApi<Section>(payload)); setPreviewKey((key) => key + 1); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Homepage sections could not be loaded."); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function toggleVisible(section: Section) { setError(""); try { const response = await fetch(`/api/homepage-sections/${section.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isVisible: !section.isVisible }) }); if (!response.ok) throw new Error(apiMessage(await response.json().catch(() => ({})), "Section could not be updated.")); await load(); } catch (toggleError) { setError(toggleError instanceof Error ? toggleError.message : "Section could not be updated."); } }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setSaving(true); setError("");
    try { const response = await fetch("/api/homepage-sections/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: next.map((item) => item.id) }) }); if (!response.ok) throw new Error(apiMessage(await response.json().catch(() => ({})), "Sections could not be reordered.")); await load(); } catch (moveError) { setError(moveError instanceof Error ? moveError.message : "Sections could not be reordered."); await load(); } finally { setSaving(false); }
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
          {canConfigure ? <button type="button" onClick={() => setEditing(section)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit content</button>
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
  if (section.type === "FEATURED_PRODUCTS") return <FeaturedProductsDialog section={section} onClose={onClose} onSaved={onSaved} />;
  if (section.type === "BANNERS") return <BannersConfigDialog section={section} onClose={onClose} onSaved={onSaved} />;
  return <NewsletterConfigDialog section={section} onClose={onClose} onSaved={onSaved} />;
}

async function saveConfig(id: number, config: Record<string, unknown>) {
  const response = await fetch(`/api/homepage-sections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiMessage(payload, "Section could not be saved."));
}

function FeaturedProductsDialog({ section, onClose, onSaved }: { section: Section; onClose: () => void; onSaved: () => Promise<void> }) {
  const [options, setOptions] = useState<FeaturedSection[]>([]);
  const [slug, setSlug] = useState(typeof section.config.slug === "string" ? section.config.slug : "");
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  useEffect(() => { const timer = window.setTimeout(async () => { try { const response = await fetch("/api/featured-sections", { cache: "no-store" }); const payload = await response.json(); if (response.ok) setOptions(collectionFromApi<FeaturedSection>(payload)); } catch { /* leave options empty, select still accepts a manual slug */ } }, 0); return () => window.clearTimeout(timer); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await saveConfig(section.id, { slug }); onClose(); await onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Section could not be saved."); } finally { setSaving(false); } }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Featured products</DialogTitle><DialogDescription>Which featured section shows in this homepage rail. Manage the rails themselves in Merchandising.</DialogDescription></DialogHeader><form onSubmit={(event) => void submit(event)}>{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}<label className="text-[13px] font-semibold text-ink-secondary">Featured section<select value={slug} onChange={(event) => setSlug(event.target.value)} className={inputClass}><option value="">Select…</option>{options.map((option) => <option key={option.id} value={option.slug}>{option.title}</option>)}</select></label><DialogFooter className="mt-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving || !slug} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter></form></DialogContent></Dialog>;
}

function BannersConfigDialog({ section, onClose, onSaved }: { section: Section; onClose: () => void; onSaved: () => Promise<void> }) {
  const [position, setPosition] = useState(typeof section.config.position === "string" ? section.config.position : "");
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await saveConfig(section.id, { position: position.trim() }); onClose(); await onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Section could not be saved."); } finally { setSaving(false); } }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Promotional banners</DialogTitle><DialogDescription>Which banner position renders here — matches the &ldquo;Position&rdquo; field on banners in Merchandising.</DialogDescription></DialogHeader><form onSubmit={(event) => void submit(event)}>{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}<label className="text-[13px] font-semibold text-ink-secondary">Banner position<input required value={position} onChange={(event) => setPosition(event.target.value)} placeholder="e.g. home-top" className={`${inputClass} font-mono`} /></label><p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted"><Gift className="h-3.5 w-3.5" />Add or edit the banners themselves in Merchandising → Banners.</p><DialogFooter className="mt-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving || !position.trim()} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter></form></DialogContent></Dialog>;
}

function NewsletterConfigDialog({ section, onClose, onSaved }: { section: Section; onClose: () => void; onSaved: () => Promise<void> }) {
  const [heading, setHeading] = useState(typeof section.config.heading === "string" ? section.config.heading : "");
  const [body, setBody] = useState(typeof section.config.body === "string" ? section.config.body : "");
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await saveConfig(section.id, { heading: heading.trim(), body: body.trim() }); onClose(); await onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Section could not be saved."); } finally { setSaving(false); } }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Newsletter signup</DialogTitle><DialogDescription>The heading and body shown above the email field.</DialogDescription></DialogHeader><form onSubmit={(event) => void submit(event)}>{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}<label className="text-[13px] font-semibold text-ink-secondary">Heading<input required value={heading} onChange={(event) => setHeading(event.target.value)} className={inputClass} /></label><label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Body<textarea required value={body} onChange={(event) => setBody(event.target.value)} rows={2} className={`${inputClass} h-auto resize-y py-2`} /></label><DialogFooter className="mt-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving || !heading.trim() || !body.trim()} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter></form></DialogContent></Dialog>;
}
