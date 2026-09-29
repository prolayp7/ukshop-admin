"use client";

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, LayoutPanelTop, LoaderCircle, Menu as MenuIcon, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DrawerContent } from "@/components/ui/dialog";
import { STOREFRONT_ICONS, StorefrontIconSvg } from "@/components/menus/storefront-icons";
import { collectionFromApi } from "@/lib/api-response";

type Status = "ACTIVE" | "INACTIVE";
type PanelMode = "AUTO" | "CUSTOM";
type CategoryRef = { id: number; title: string };
type MegaMenuLink = { id?: number; label: string; categoryId?: number | null; category?: CategoryRef | null; href?: string | null; sortOrder?: number };
type MegaMenuColumn = { id?: number; title?: string | null; sortOrder?: number; links: MegaMenuLink[] };
type MegaMenuPanel = { mode: PanelMode; eyebrow: string | null; promoEnabled: boolean; promoTitle: string | null; promoText: string | null; promoCta: string | null; promoHref: string | null; promoCategoryId: number | null; promoCategory: CategoryRef | null; columns: MegaMenuColumn[] };
type MenuItem = { id: number; parentId: number | null; label: string; href: string | null; categoryId: number | null; category: CategoryRef | null; sortOrder: number; status: Status; icon: string | null; highlight: boolean; megaMenuPanel: MegaMenuPanel | null };
type Menu = { id: number; name: string; slug: string; location: "HEADER" | "FOOTER"; status: Status; items: MenuItem[] };


const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const smallInput = "h-8 rounded-md border border-border-strong bg-surface px-2 text-xs outline-none focus:border-accent-strong";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
async function send(url: string, method: string, body: unknown, fallback: string) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok && response.status !== 204) throw new Error(apiMessage(await response.json().catch(() => ({})), fallback));
}
const ErrorBox = ({ message }: { message: string }) => message ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{message}</div> : null;

function describeHeaderItem(item: MenuItem) {
  const target = item.category ? item.category.title : item.href || "No link";
  const panel = !item.megaMenuPanel ? "no panel" : item.megaMenuPanel.mode === "AUTO" ? "automatic panel" : `custom panel · ${item.megaMenuPanel.columns.length} column${item.megaMenuPanel.columns.length === 1 ? "" : "s"}`;
  return `${target} · ${panel}${item.megaMenuPanel?.promoEnabled ? " · featured card" : ""}`;
}

export function MenusListing() {
  const [menus, setMenus] = useState<Menu[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [itemEditing, setItemEditing] = useState<MenuItem | "new" | null>(null);
  const [panelEditing, setPanelEditing] = useState<MenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null), [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);

  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await fetch("/api/menus", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(apiMessage(payload, "Menus could not be loaded.")); const list = collectionFromApi<Menu>(payload); setMenus(list); setSelectedId((current) => current && list.some((menu) => menu.id === current) ? current : (list[0]?.id ?? null)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Menus could not be loaded."); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const selected = menus.find((menu) => menu.id === selectedId) ?? null;
  const isHeader = selected?.location === "HEADER";
  const siblingsOf = (item: MenuItem) => (selected?.items ?? []).filter((candidate) => candidate.parentId === item.parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const topLevel = selected ? selected.items.filter((item) => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id) : [];
  const childrenOf = (parent: MenuItem) => (selected?.items ?? []).filter((child) => child.parentId === parent.id).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const orderedItems = topLevel.flatMap((parent) => [parent, ...childrenOf(parent)]);

  async function removeItem() { if (!deleteTarget || !selected) return; setDeleting(true); try { await send(`/api/menus/${selected.id}/items/${deleteTarget.id}`, "DELETE", undefined, "Menu item could not be deleted."); setDeleteTarget(null); await load(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Menu item could not be deleted."); } finally { setDeleting(false); } }

  // Swaps the item with its neighbour, then renumbers the siblings so the order is stable.
  async function move(item: MenuItem, by: -1 | 1) {
    if (!selected) return;
    const siblings = siblingsOf(item); const index = siblings.findIndex((candidate) => candidate.id === item.id);
    if (index + by < 0 || index + by >= siblings.length) return;
    [siblings[index], siblings[index + by]] = [siblings[index + by], siblings[index]];
    setMoving(true); setError("");
    try {
      await Promise.all(siblings.map((sibling, position) => sibling.sortOrder === position + 1 ? null : send(`/api/menus/${selected.id}/items/${sibling.id}`, "PATCH", { sortOrder: position + 1 }, "The order could not be saved.")));
      await load();
    } catch (moveError) { setError(moveError instanceof Error ? moveError.message : "The order could not be saved."); } finally { setMoving(false); }
  }

  return <div className="w-full"><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Menus</h1><p className="mt-1 text-[13.5px] text-ink-muted">The storefront&rsquo;s header navigation (with its mega-menu panels) and footer link columns.</p>
  {error ? <div className="mt-4"><ErrorBox message={error} /></div> : null}
  <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">{loading && !menus.length ? <div className="p-6 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></div> : <ul className="divide-y divide-border">{menus.map((menu) => <li key={menu.id}><button type="button" onClick={() => setSelectedId(menu.id)} className={`flex w-full items-center gap-2.5 p-3.5 text-left ${selectedId === menu.id ? "bg-canvas" : "hover:bg-canvas/60"}`}><MenuIcon className="h-4 w-4 shrink-0 text-ink-muted" /><span className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{menu.name}</p><p className="mt-0.5 text-[10.5px] text-ink-muted">{menu.location} · {menu.items.length} items</p></span></button></li>)}{!menus.length ? <li className="p-6 text-center text-[13px] text-ink-muted">No menus yet.</li> : null}</ul>}</div>
    </div>
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">{!selected ? <p className="p-8 text-center text-[13px] text-ink-muted">Select or create a menu to manage its items.</p> : <>
      <div className="flex items-center justify-between gap-3 border-b border-border p-4"><div><h2 className="text-[14px] font-semibold text-ink">{selected.name}</h2><p className="mt-0.5 text-xs text-ink-muted">{isHeader ? "The storefront's top navigation, left to right. Category tabs can build their panel automatically from the category's sub-categories." : "Footer link columns: top-level items are column titles; add each link as a child item (set its Parent item)."}</p></div><button type="button" onClick={() => setItemEditing("new")} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-ink px-3.5 text-xs font-semibold text-white hover:bg-[#1d2939]"><Plus className="h-4 w-4" />Add item</button></div>
      <div className="divide-y divide-border">{orderedItems.map((item) => {
        const siblings = siblingsOf(item); const position = siblings.findIndex((candidate) => candidate.id === item.id);
        return <div key={item.id} className="flex items-center gap-3 p-3.5" style={{ paddingLeft: item.parentId ? "2.5rem" : "0.875rem" }}>
          <div className="flex flex-col"><button type="button" onClick={() => void move(item, -1)} disabled={moving || position <= 0} aria-label={`Move ${item.label} ${isHeader ? "left" : "up"}`} className="flex h-5 w-6 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint hover:text-ink disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void move(item, 1)} disabled={moving || position >= siblings.length - 1} aria-label={`Move ${item.label} ${isHeader ? "right" : "down"}`} className="flex h-5 w-6 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint hover:text-ink disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button></div>
          <div className="min-w-0 flex-1"><p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">{isHeader && item.icon ? <StorefrontIconSvg id={item.icon} className="h-4 w-5 shrink-0 text-ink-secondary" /> : null}{item.label}{isHeader && item.highlight ? <span className="rounded-full bg-danger-tint px-2 py-0.5 text-[10px] font-semibold text-danger-tint-ink">Highlighted</span> : null}</p><p className="mt-0.5 truncate text-xs text-ink-muted">{isHeader ? describeHeaderItem(item) : item.category ? `Category: ${item.category.title}` : item.href ?? "—"}</p></div>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${item.status === "ACTIVE" ? "bg-positive-tint text-positive-tint-ink" : "bg-neutral-tint text-ink-muted"}`}>{item.status}</span>
          {isHeader && !item.parentId ? <button type="button" onClick={() => setPanelEditing(item)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><LayoutPanelTop className="h-3.5 w-3.5" />Panel</button> : null}
          <button type="button" onClick={() => setItemEditing(item)} aria-label={`Edit ${item.label}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><Pencil className="h-4 w-4" /></button>
          <button type="button" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.label}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink"><Trash2 className="h-4 w-4" /></button>
        </div>;
      })}{!selected.items.length ? <p className="p-8 text-center text-[13px] text-ink-muted">No items in this menu yet.</p> : null}</div>
    </>}</section>
  </div>
  {itemEditing && selected ? <ItemDialog menu={selected} item={itemEditing === "new" ? null : itemEditing} onClose={() => setItemEditing(null)} onSaved={load} /> : null}
  {panelEditing ? <PanelDialog item={panelEditing} onClose={() => setPanelEditing(null)} onSaved={load} /> : null}
  <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><DialogContent><DialogHeader><DialogTitle>Delete menu item?</DialogTitle><DialogDescription>{deleteTarget ? `"${deleteTarget.label}" and any child items or panel will be removed.` : ""}</DialogDescription></DialogHeader><DialogFooter><button type="button" onClick={() => setDeleteTarget(null)} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={() => void removeItem()} disabled={deleting} className="inline-flex h-9 items-center gap-2 rounded-md bg-danger px-4 text-xs font-semibold text-white disabled:opacity-50">{deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete</button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint?: ReactNode }) {
  return <label className="flex items-start gap-3"><button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-ink" : "bg-border-strong"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} /></button><span className="text-[13px]"><span className="font-semibold text-ink">{label}</span>{hint ? <span className="mt-0.5 block text-xs font-normal text-ink-muted">{hint}</span> : null}</span></label>;
}

// Item and panel editors open as a drawer from the right: header, scrolling body, sticky footer.
function DrawerForm({ title, description, error, onClose, onSubmit, footer, className, children }: { title: string; description: string; error: string; onClose: () => void; onSubmit: (event: FormEvent) => Promise<void>; footer: ReactNode; className?: string; children: ReactNode }) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className={className}>
    <form onSubmit={(event) => void onSubmit(event)} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="border-b border-border px-5 py-4 pr-12"><DialogTitle className="text-[15px] font-semibold text-ink">{title}</DialogTitle><DialogDescription className="text-xs text-ink-muted">{description}</DialogDescription></DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5"><ErrorBox message={error} />{children}</div>
      <div className="flex justify-end gap-2 border-t border-border bg-canvas px-5 py-3">{footer}</div>
    </form>
  </DrawerContent></Dialog>;
}
const cancelButton = (onClose: () => void) => <button type="button" onClick={onClose} className="h-9 rounded-md border border-border bg-surface px-4 text-xs font-semibold text-ink-secondary">Cancel</button>;
const saveButton = (saving: boolean, disabled: boolean, label: string) => <button type="submit" disabled={saving || disabled} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{label}</button>;

// Shows the storefront's actual icons, so the admin picks by sight rather than by name.
function IconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const cell = (selected: boolean) => `flex h-11 items-center justify-center rounded-md border transition-colors ${selected ? "border-ink bg-canvas text-ink ring-1 ring-ink" : "border-border text-ink-muted hover:border-border-strong hover:text-ink"}`;
  const selected = STOREFRONT_ICONS.find((icon) => icon.id === value);
  return <div>
    <div role="radiogroup" aria-label="Icon" className="mt-2 grid grid-cols-6 gap-1.5">
      <button type="button" role="radio" aria-checked={!value} aria-label="No icon" title="No icon" onClick={() => onChange("")} className={cell(!value)}><X className="h-4 w-4" /></button>
      {STOREFRONT_ICONS.map((icon) => <button key={icon.id} type="button" role="radio" aria-checked={value === icon.id} aria-label={icon.label} title={icon.label} onClick={() => onChange(icon.id)} className={cell(value === icon.id)}><StorefrontIconSvg id={icon.id} className="h-6 w-7" /></button>)}
    </div>
    <p className="mt-1.5 text-xs font-normal text-ink-muted">{selected ? `Selected: ${selected.label}` : "No icon"}</p>
  </div>;
}

function ItemDialog({ menu, item, onClose, onSaved }: { menu: Menu; item: MenuItem | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const isHeader = menu.location === "HEADER";
  const [label, setLabel] = useState(item?.label ?? ""), [href, setHref] = useState(item?.href ?? "");
  const [category, setCategory] = useState<CategoryRef | null>(item?.category ?? null);
  const [parentId, setParentId] = useState(item?.parentId != null ? String(item.parentId) : "");
  const [icon, setIcon] = useState(item?.icon ?? ""), [highlight, setHighlight] = useState(item?.highlight ?? false);
  const [status, setStatus] = useState<Status>(item?.status ?? "ACTIVE"), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const parentOptions = menu.items.filter((candidate) => candidate.id !== item?.id && !candidate.parentId);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const nextSort = Math.max(0, ...menu.items.filter((candidate) => (candidate.parentId ?? "") === (parentId ? Number(parentId) : "")).map((candidate) => candidate.sortOrder)) + 1;
    // On edit, null clears a link target the admin removed; on create, undefined simply omits it.
    const empty = item ? null : undefined;
    const body = { label: label.trim(), href: (category ? "" : href.trim()) || empty, categoryId: category?.id ?? empty, status, ...(isHeader ? { icon: icon || null, highlight } : { parentId: parentId ? Number(parentId) : undefined }), ...(item ? {} : { sortOrder: nextSort }) };
    try { await send(item ? `/api/menus/${menu.id}/items/${item.id}` : `/api/menus/${menu.id}/items`, item ? "PATCH" : "POST", body, "Menu item could not be saved."); onClose(); await onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Menu item could not be saved."); } finally { setSaving(false); }
  }
  return <DrawerForm title={item ? "Edit menu item" : "Add menu item"} description={isHeader ? "A tab in the storefront's top navigation. Set its panel afterwards with the Panel button." : menu.name} error={error} onClose={onClose} onSubmit={submit} footer={<>{cancelButton(onClose)}{saveButton(saving, !label.trim() || (!category && !href.trim() && isHeader), "Save")}</>}>
    <label className="block text-[13px] font-semibold text-ink-secondary">Label<input required value={label} onChange={(event) => setLabel(event.target.value)} maxLength={255} className={inputClass} /></label>
    <div className="mt-4 text-[13px] font-semibold text-ink-secondary">Category<CategoryPicker value={category} onChange={setCategory} /></div>
    <label className="mt-4 block text-[13px] font-semibold text-ink-secondary">or Link URL<input value={href} onChange={(event) => setHref(event.target.value)} placeholder="e.g. /brands" disabled={Boolean(category)} className={`${inputClass} disabled:bg-canvas disabled:text-ink-faint`} />{category ? <span className="mt-1 block text-xs font-normal text-ink-muted">Clear the category to link to a URL instead.</span> : null}</label>
    {isHeader ? <>
      <div className="mt-4 text-[13px] font-semibold text-ink-secondary">Icon<IconPicker value={icon} onChange={setIcon} /></div>
      <div className="mt-4"><Switch checked={highlight} onChange={setHighlight} label="Highlight this tab" hint="Shows the label in the accent colour, e.g. for Gaming or Deals." /></div>
    </> : <label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Parent item (optional)<select value={parentId} onChange={(event) => setParentId(event.target.value)} className={inputClass}><option value="">Top level</option>{parentOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}
    <label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Status<select value={status} onChange={(event) => setStatus(event.target.value as Status)} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive (hidden)</option></select></label>
  </DrawerForm>;
}

function CategoryPicker({ value, onChange, compact = false }: { value: CategoryRef | null; onChange: (value: CategoryRef | null) => void; compact?: boolean }) {
  const [search, setSearch] = useState(""), [results, setResults] = useState<CategoryRef[]>([]), [loading, setLoading] = useState(false);
  useEffect(() => {
    const query = search.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (query.length < 2) { setResults([]); return; }
      setLoading(true);
      try {
        const response = await fetch(`/api/catalog/categories?q=${encodeURIComponent(query)}&perPage=8`, { signal: controller.signal });
        const payload = await response.json();
        if (response.ok) setResults(collectionFromApi<CategoryRef>(payload));
      } catch (searchError) {
        if (!(searchError instanceof DOMException && searchError.name === "AbortError")) setResults([]);
      } finally { setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search]);
  const height = compact ? "h-8 text-xs" : "mt-2 h-10 text-[13px]";
  if (value) return <div className={`flex items-center justify-between rounded-md border border-border-strong bg-canvas px-3 ${height}`}><span className="truncate font-semibold text-ink">{value.title}</span><button type="button" onClick={() => onChange(null)} aria-label="Clear category" className="text-ink-muted hover:text-ink"><X className="h-3.5 w-3.5" /></button></div>;
  return <div className={`relative ${compact ? "" : "mt-2"}`}>
    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories…" className={`w-full rounded-md border border-border-strong bg-surface pl-8 pr-3 font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong ${compact ? "h-8 text-xs" : "h-10 text-[13px]"}`} />
    {loading ? <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-muted" /> : null}
    {results.length ? <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-card">{results.map((category) => <button key={category.id} type="button" onClick={() => { onChange({ id: category.id, title: category.title }); setSearch(""); setResults([]); }} className="flex w-full items-center px-3 py-2 text-left text-[13px] font-normal text-ink hover:bg-neutral-tint">{category.title}</button>)}</div> : search.trim().length >= 2 && !loading ? <p className="absolute mt-1 text-xs font-normal text-ink-muted">No matching categories.</p> : null}
  </div>;
}

type PanelChoice = PanelMode | "NONE";
type LinkDraft = { label: string; category: CategoryRef | null; href: string };
type ColumnDraft = { title: string; links: LinkDraft[] };
const blankLink = (): LinkDraft => ({ label: "", category: null, href: "" });

function PanelDialog({ item, onClose, onSaved }: { item: MenuItem; onClose: () => void; onSaved: () => Promise<void> }) {
  const panel = item.megaMenuPanel;
  const [choice, setChoice] = useState<PanelChoice>(panel ? panel.mode : item.category ? "AUTO" : "NONE");
  const [eyebrow, setEyebrow] = useState(panel?.eyebrow ?? (item.category ? "Shop department" : ""));
  const [columns, setColumns] = useState<ColumnDraft[]>(panel?.columns.length ? panel.columns.map((column) => ({ title: column.title ?? "", links: column.links.map((link) => ({ label: link.label, category: link.category ?? null, href: link.href ?? "" })) })) : [{ title: "", links: [blankLink()] }]);
  const [promoEnabled, setPromoEnabled] = useState(panel?.promoEnabled ?? false);
  const [promoTitle, setPromoTitle] = useState(panel?.promoTitle ?? ""), [promoText, setPromoText] = useState(panel?.promoText ?? ""), [promoCta, setPromoCta] = useState(panel?.promoCta ?? "");
  const [promoCategory, setPromoCategory] = useState<CategoryRef | null>(panel?.promoCategory ?? null), [promoHref, setPromoHref] = useState(panel?.promoHref ?? "");
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const updateColumn = (index: number, patch: Partial<ColumnDraft>) => setColumns((current) => current.map((column, i) => (i === index ? { ...column, ...patch } : column)));
  const updateLink = (columnIndex: number, linkIndex: number, patch: Partial<LinkDraft>) => setColumns((current) => current.map((column, i) => (i === columnIndex ? { ...column, links: column.links.map((link, li) => (li === linkIndex ? { ...link, ...patch } : link)) } : column)));

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (choice === "NONE") {
        if (panel) await send(`/api/menus/items/${item.id}/mega-menu-panel`, "DELETE", undefined, "The panel could not be removed.");
      } else {
        const cleanColumns = choice === "CUSTOM" ? columns.map((column) => ({ title: column.title.trim() || undefined, links: column.links.filter((link) => link.label.trim() && (link.category || link.href.trim())).map((link) => ({ label: link.label.trim(), categoryId: link.category?.id, href: link.category ? undefined : link.href.trim() })) })).filter((column) => column.links.length) : [];
        if (choice === "CUSTOM" && !cleanColumns.length) throw new Error("Add at least one link with a label and a category or URL.");
        await send(`/api/menus/items/${item.id}/mega-menu-panel`, "POST", {
          mode: choice, eyebrow: eyebrow.trim() || undefined, columns: cleanColumns,
          promoEnabled, promoTitle: promoTitle.trim() || undefined, promoText: promoText.trim() || undefined, promoCta: promoCta.trim() || undefined,
          promoCategoryId: promoCategory?.id, promoHref: promoCategory ? undefined : promoHref.trim() || undefined,
        }, "The panel could not be saved.");
      }
      onClose(); await onSaved();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The panel could not be saved."); } finally { setSaving(false); }
  }

  const choices: { value: PanelChoice; label: string; hint: string; disabled?: boolean }[] = [
    { value: "AUTO", label: "Automatic", hint: item.category ? `Columns list the sub-categories of ${item.category.title}, and stay in step with the catalogue.` : "Link this item to a category first.", disabled: !item.category },
    { value: "CUSTOM", label: "Custom columns", hint: "Hand-picked columns of links, e.g. a Gaming panel spanning several categories." },
    { value: "NONE", label: "No panel", hint: "A plain link, e.g. Brands or Deals." },
  ];
  return <DrawerForm title={`Panel — ${item.label}`} description="What opens when a shopper hovers this tab." error={error} onClose={onClose} onSubmit={submit} className="max-w-xl" footer={<>{cancelButton(onClose)}{saveButton(saving, false, "Save panel")}</>}>
    <div className="space-y-5">
      <div className="space-y-2">{choices.map((option) => <label key={option.value} className={`flex cursor-pointer flex-col rounded-lg border p-3 ${choice === option.value ? "border-ink bg-canvas" : "border-border"} ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}><span className="flex items-center gap-2 text-[13px] font-semibold text-ink"><input type="radio" name="panel-choice" checked={choice === option.value} disabled={option.disabled} onChange={() => setChoice(option.value)} />{option.label}</span><span className="mt-1 pl-5 text-xs text-ink-muted">{option.hint}</span></label>)}</div>

      {choice !== "NONE" ? <>
        <label className="block text-[13px] font-semibold text-ink-secondary">Small label above the title<input value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} maxLength={60} placeholder="e.g. Shop department" className={inputClass} /><span className="mt-1 block text-xs font-normal text-ink-muted">The panel title is the tab label; &ldquo;View all&rdquo; goes where the tab links.</span></label>

        {choice === "CUSTOM" ? <div><p className="text-[13px] font-semibold text-ink-secondary">Columns</p><div className="mt-2 space-y-3">{columns.map((column, columnIndex) => <div key={columnIndex} className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-2"><input value={column.title} onChange={(event) => updateColumn(columnIndex, { title: event.target.value })} placeholder="Column heading (e.g. Systems)" maxLength={255} className={`${smallInput} flex-1`} />{columns.length > 1 ? <button type="button" onClick={() => setColumns((current) => current.filter((_, i) => i !== columnIndex))} aria-label="Remove column" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink"><Trash2 className="h-4 w-4" /></button> : null}</div>
          <div className="mt-2 space-y-2">{column.links.map((link, linkIndex) => <div key={linkIndex} className="space-y-1.5 rounded-md bg-canvas p-2">
            <div className="flex items-center gap-1.5"><input value={link.label} onChange={(event) => updateLink(columnIndex, linkIndex, { label: event.target.value })} placeholder="Link label" maxLength={255} className={`${smallInput} flex-1`} /><button type="button" onClick={() => updateColumn(columnIndex, { links: column.links.filter((_, li) => li !== linkIndex) })} aria-label="Remove link" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink"><Trash2 className="h-3.5 w-3.5" /></button></div>
            <CategoryPicker compact value={link.category} onChange={(category) => updateLink(columnIndex, linkIndex, { category, label: link.label || category?.title || "" })} />
            <input value={link.href} onChange={(event) => updateLink(columnIndex, linkIndex, { href: event.target.value })} placeholder="or URL" disabled={Boolean(link.category)} className={`${smallInput} w-full disabled:bg-surface disabled:text-ink-faint`} />
          </div>)}</div>
          <button type="button" onClick={() => updateColumn(columnIndex, { links: [...column.links, blankLink()] })} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink"><Plus className="h-3.5 w-3.5" />Add link</button>
        </div>)}</div><button type="button" onClick={() => setColumns((current) => [...current, { title: "", links: [blankLink()] }])} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink"><Plus className="h-3.5 w-3.5" />Add column</button></div> : null}

        <div className="rounded-lg border border-border bg-canvas p-3">
          <Switch checked={promoEnabled} onChange={setPromoEnabled} label="Show a featured card" hint="The dark card on the right of the panel." />
          <div className={`mt-3 space-y-3 ${promoEnabled ? "" : "opacity-50"}`}>
            <label className="block text-xs font-semibold text-ink-secondary">Title<input value={promoTitle} onChange={(event) => setPromoTitle(event.target.value)} maxLength={80} placeholder="e.g. Build your own" className={inputClass} /></label>
            <label className="block text-xs font-semibold text-ink-secondary">Text<input value={promoText} onChange={(event) => setPromoText(event.target.value)} maxLength={200} placeholder="e.g. Every part, compatibility checked before it ships." className={inputClass} /></label>
            <label className="block text-xs font-semibold text-ink-secondary">Button label<input value={promoCta} onChange={(event) => setPromoCta(event.target.value)} maxLength={40} placeholder="Shop now" className={inputClass} /></label>
            <div className="text-xs font-semibold text-ink-secondary">Links to a category<CategoryPicker value={promoCategory} onChange={setPromoCategory} /></div>
            <label className="block text-xs font-semibold text-ink-secondary">or URL<input value={promoHref} onChange={(event) => setPromoHref(event.target.value)} placeholder="e.g. /deals" disabled={Boolean(promoCategory)} className={`${inputClass} disabled:bg-surface disabled:text-ink-faint`} /></label>
          </div>
        </div>
      </> : null}
    </div>
  </DrawerForm>;
}
