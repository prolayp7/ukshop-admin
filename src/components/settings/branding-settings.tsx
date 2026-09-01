"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { FileText, Globe2, Image as ImageIcon, LoaderCircle, Mail, Monitor, Save, Smartphone, Upload } from "lucide-react";
import { mediaFileUrl, type MediaItem } from "@/lib/media";

type AssetKey = "desktopLogo" | "mobileLogo" | "mailLogo" | "invoiceLogo" | "favicon";
type BrandingAsset = Pick<MediaItem, "id" | "url"> & { originalName?: string };
type BrandingAssets = Partial<Record<AssetKey, BrandingAsset>>;

const definitions: Array<{ key: AssetKey; title: string; description: string; recommendation: string; icon: typeof Monitor }> = [
  { key: "desktopLogo", title: "Desktop logo", description: "Used in the desktop storefront header.", recommendation: "Recommended: a wide transparent image, approximately 200 × 40 px.", icon: Monitor },
  { key: "mobileLogo", title: "Mobile logo", description: "Used in compact mobile headers and navigation.", recommendation: "Recommended: a compact mark, approximately 120 × 40 px.", icon: Smartphone },
  { key: "mailLogo", title: "Email logo", description: "Displayed at the top of transactional emails.", recommendation: "If omitted, the desktop logo can be used by email templates.", icon: Mail },
  { key: "invoiceLogo", title: "Invoice logo", description: "Displayed on customer invoices and printable documents.", recommendation: "Use a high-contrast logo that remains clear when printed.", icon: FileText },
  { key: "favicon", title: "Favicon", description: "The small brand icon shown in browser tabs.", recommendation: "Recommended: a square PNG or WebP image, at least 64 × 64 px.", icon: Globe2 },
];

function apiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const value = (payload as { message?: unknown }).message;
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return fallback;
}

export function BrandingSettings() {
  const [assets, setAssets] = useState<BrandingAssets>({});
  const [files, setFiles] = useState<Partial<Record<AssetKey, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<AssetKey, string>>>({});
  const previewsRef = useRef<Partial<Record<AssetKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/settings/branding", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(payload, "Brand assets could not be loaded."));
        setAssets((payload.data ?? {}) as BrandingAssets);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Brand assets could not be loaded.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => () => { Object.values(previewsRef.current).forEach((url) => URL.revokeObjectURL(url)); }, []);

  function choose(key: AssetKey, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage("Logos and favicons must be JPG, PNG or WebP files."); return; }
    if (file.size > 2 * 1024 * 1024) { setMessage("Each branding image must be 2 MB or smaller."); return; }
    setFiles((current) => ({ ...current, [key]: file }));
    setPreviews((current) => {
      if (current[key]) URL.revokeObjectURL(current[key]!);
      const next = { ...current, [key]: URL.createObjectURL(file) };
      previewsRef.current = next;
      return next;
    });
    setMessage("");
  }

  async function save() {
    const pending = Object.entries(files) as Array<[AssetKey, File]>;
    if (!pending.length) return;
    setSaving(true); setMessage("");
    const uploaded: BrandingAsset[] = [];
    try {
      const next = { ...assets };
      for (const [key, file] of pending) {
        const formData = new FormData();
        formData.set("file", file); formData.set("ownerType", "LIBRARY"); formData.set("ownerId", "0");
        formData.set("collection", `branding-${key}`); formData.set("altText", definitions.find((item) => item.key === key)?.title ?? "Brand asset");
        const response = await fetch("/api/media", { method: "POST", body: formData });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(payload, `${file.name} could not be uploaded.`));
        const media = (payload.data ?? payload) as MediaItem;
        const asset = { id: media.id, url: media.url, originalName: file.name };
        uploaded.push(asset); next[key] = asset;
      }
      const response = await fetch("/api/settings/branding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "Brand assets could not be saved."));
      const replacedIds = pending.map(([key]) => assets[key]?.id).filter((id): id is number => typeof id === "number");
      await Promise.allSettled(replacedIds.map((id) => fetch(`/api/media/${id}`, { method: "DELETE" })));
      Object.values(previewsRef.current).forEach((url) => URL.revokeObjectURL(url));
      previewsRef.current = {};
      setAssets(next); setFiles({}); setPreviews({}); setMessage("Brand assets saved successfully.");
    } catch (error) {
      await Promise.allSettled(uploaded.map((asset) => fetch(`/api/media/${asset.id}`, { method: "DELETE" })));
      setMessage(error instanceof Error ? error.message : "Brand assets could not be saved.");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-accent" /></div>;

  return <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><header className="border-b border-border px-5 py-4"><h2 className="text-[14px] font-semibold text-ink">Store logos</h2><p className="mt-1 text-xs text-ink-muted">Upload separate brand assets for each storefront and document context.</p></header><div className="grid md:grid-cols-2 xl:grid-cols-3">{definitions.map((definition) => <AssetCard key={definition.key} definition={definition} asset={assets[definition.key]} preview={previews[definition.key]} file={files[definition.key]} onChoose={(event) => choose(definition.key, event)} />)}</div><footer className="flex flex-col gap-3 border-t border-border bg-canvas px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><p aria-live="polite" className="text-xs text-ink-muted">{message || "JPG, PNG and WebP are supported, up to 2 MB each."}</p><button type="button" onClick={() => void save()} disabled={saving || !Object.keys(files).length} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white hover:bg-sidebar-hover disabled:cursor-not-allowed disabled:opacity-45">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save logos</button></footer></section>;
}

function AssetCard({ definition, asset, preview, file, onChoose }: { definition: (typeof definitions)[number]; asset?: BrandingAsset; preview?: string; file?: File; onChoose: (event: ChangeEvent<HTMLInputElement>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = definition.icon;
  const source = preview ?? (asset?.url ? mediaFileUrl(asset.url) : "");
  return <article className="flex min-h-80 flex-col border-b border-border p-5 md:border-r xl:[&:nth-child(3n)]:border-r-0"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><Icon className="h-[18px] w-[18px]" /></span><div><h3 className="text-[13px] font-semibold text-ink">{definition.title}</h3><p className="mt-1 text-xs leading-5 text-ink-muted">{definition.description}</p></div></div><div className="my-5 flex min-h-28 flex-1 items-center justify-center rounded-lg border border-dashed border-border-strong bg-canvas p-5">{source ? <NextImage unoptimized src={source} width={definition.key === "favicon" ? 64 : 240} height={definition.key === "favicon" ? 64 : 80} alt={`${definition.title} preview`} className={definition.key === "favicon" ? "h-16 w-16 rounded-lg object-contain" : "h-20 w-full max-w-[240px] object-contain"} /> : <div className="text-center"><ImageIcon className="mx-auto h-6 w-6 text-ink-faint" /><p className="mt-2 text-xs font-semibold text-ink-secondary">No image uploaded</p></div>}</div><p className="min-h-8 text-[10.5px] leading-4 text-ink-muted">{definition.recommendation}</p><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={onChoose} className="hidden" /><button type="button" onClick={() => inputRef.current?.click()} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-surface text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Upload className="h-4 w-4" />{file ? `Selected: ${file.name}` : asset ? "Replace image" : "Choose image"}</button></article>;
}
