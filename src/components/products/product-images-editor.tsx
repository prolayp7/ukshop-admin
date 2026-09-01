"use client";

import Image from "next/image";
import { ChangeEvent, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Check, ImageIcon, LoaderCircle, Star, Trash2, Upload } from "lucide-react";
import { mediaFileUrl, type MediaItem } from "@/lib/media";

type PendingImage = { key: string; file: File; previewUrl: string };

export type ProductImagesHandle = {
  save: (productId: number) => Promise<void>;
};

function responseMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  }
  return fallback;
}

export const ProductImagesEditor = forwardRef<ProductImagesHandle, { productId?: number }>(function ProductImagesEditor({ productId }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<MediaItem[]>([]);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [defaultKey, setDefaultKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [error, setError] = useState("");

  const loadImages = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ ownerType: "PRODUCT", ownerId: String(productId), type: "IMAGE", page: "1", perPage: "100" });
      const response = await fetch(`/api/media?${params}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(responseMessage(payload, "Product images could not be loaded."));
      const loaded = ((payload.data?.items ?? payload.items ?? []) as MediaItem[]).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
      setImages(loaded);
      setDefaultKey((current) => current ?? (loaded[0] ? `media-${loaded[0].id}` : null));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Product images could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { void loadImages(); }, [loadImages]);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setError("");
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const invalid = files.find((file) => !allowedTypes.has(file.type) || file.size > 2 * 1024 * 1024);
    if (invalid) {
      setError(`${invalid.name} must be a JPG, PNG or WebP image no larger than 2 MB.`);
      event.target.value = "";
      return;
    }
    const additions = files.map((file) => ({ key: `pending-${crypto.randomUUID()}`, file, previewUrl: URL.createObjectURL(file) }));
    setPending((current) => [...current, ...additions]);
    if (!defaultKey && additions[0]) setDefaultKey(additions[0].key);
    event.target.value = "";
  }

  function removePending(key: string) {
    setPending((current) => {
      const removed = current.find((item) => item.key === key);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const next = current.filter((item) => item.key !== key);
      if (defaultKey === key) setDefaultKey(images[0] ? `media-${images[0].id}` : next[0]?.key ?? null);
      return next;
    });
  }

  useImperativeHandle(ref, () => ({
    async save(ownerId: number) {
      const orderedExisting = [...images].sort((a, b) => (`media-${a.id}` === defaultKey ? -1 : `media-${b.id}` === defaultKey ? 1 : a.sortOrder - b.sortOrder));
      const orderedPending = [...pending].sort((a, b) => (a.key === defaultKey ? -1 : b.key === defaultKey ? 1 : 0));
      const defaultIsPending = defaultKey?.startsWith("pending-") ?? false;
      let order = defaultIsPending ? orderedExisting.length + 1 : 0;
      for (const image of orderedExisting) {
        const sortOrder = `media-${image.id}` === defaultKey ? 0 : order++;
        if (image.sortOrder !== sortOrder) {
          const response = await fetch(`/api/media/${image.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder }) });
          if (!response.ok) throw new Error(responseMessage(await response.json().catch(() => ({})), "The default image could not be updated."));
        }
      }
      order = defaultIsPending ? 0 : Math.max(order, orderedExisting.length);
      for (const image of orderedPending) {
        const body = new FormData();
        body.set("file", image.file); body.set("ownerType", "PRODUCT"); body.set("ownerId", String(ownerId)); body.set("collection", "products");
        body.set("altText", image.file.name.replace(/\.[^.]+$/, "").replaceAll("-", " ").replaceAll("_", " "));
        body.set("sortOrder", String(image.key === defaultKey ? 0 : order++));
        const response = await fetch("/api/media", { method: "POST", body });
        if (!response.ok) throw new Error(responseMessage(await response.json().catch(() => ({})), `${image.file.name} could not be uploaded.`));
      }
    },
  }), [defaultKey, images, pending]);

  const total = images.length + pending.length;
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-sm font-semibold text-ink">Product images</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-ink-muted">Upload multiple product images. The default image is used on product cards, catalogue grids and the main product display.</p></div><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white hover:bg-sidebar-hover"><Upload className="h-4 w-4" />Choose images</button><input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={chooseFiles} className="sr-only" /></div>
    <div className="rounded-md bg-accent-tint px-4 py-3 text-xs leading-5 text-accent-tint-ink ring-1 ring-inset ring-accent-tint-border">JPG, PNG and WebP are supported, up to 2 MB each.</div>
    {error ? <p role="alert" className="rounded-md bg-danger-tint px-4 py-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border">{error}</p> : null}
    {loading ? <div className="flex min-h-48 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-accent" /></div> : total ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{images.map((image) => { const key = `media-${image.id}`, selected = key === defaultKey; return <article key={key} className={`overflow-hidden rounded-lg border bg-surface ${selected ? "border-accent-strong ring-2 ring-accent-tint-border" : "border-border"}`}><div className="relative aspect-square bg-neutral-tint"><Image src={mediaFileUrl(image.url)} alt={image.altText || ""} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" className="object-contain" />{selected ? <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-1 text-[10.5px] font-semibold text-white"><Star className="h-3 w-3 fill-current" />Default</span> : null}</div><button type="button" onClick={() => setDefaultKey(key)} className="flex w-full items-center justify-center gap-2 border-t border-border px-3 py-2.5 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">{selected ? <Check className="h-4 w-4" /> : <Star className="h-4 w-4" />}{selected ? "Default image" : "Set as default"}</button></article>; })}{pending.map((image) => { const selected = image.key === defaultKey; return <article key={image.key} className={`overflow-hidden rounded-lg border bg-surface ${selected ? "border-accent-strong ring-2 ring-accent-tint-border" : "border-border"}`}><div className="relative aspect-square bg-neutral-tint"><Image src={image.previewUrl} alt={image.file.name} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" className="object-contain" />{selected ? <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-1 text-[10.5px] font-semibold text-white"><Star className="h-3 w-3 fill-current" />Default</span> : null}<button type="button" onClick={() => removePending(image.key)} aria-label={`Remove ${image.file.name}`} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-danger shadow-card hover:bg-danger-tint"><Trash2 className="h-4 w-4" /></button></div><button type="button" onClick={() => setDefaultKey(image.key)} className="flex w-full items-center justify-center gap-2 border-t border-border px-3 py-2.5 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">{selected ? <Check className="h-4 w-4" /> : <Star className="h-4 w-4" />}{selected ? "Default image" : "Set as default"}</button></article>; })}</div> : <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-56 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-canvas p-8 text-center hover:border-accent-strong hover:bg-accent-tint/40"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-tint text-ink-muted"><ImageIcon className="h-6 w-6" /></span><span className="mt-4 text-[13.5px] font-semibold text-ink">Add product images</span><span className="mt-1 text-xs text-ink-muted">Choose one or several JPG, PNG or WebP files.</span></button>}
    {pending.length ? <p className="text-xs text-ink-muted">{pending.length} new {pending.length === 1 ? "image" : "images"} will upload when you save the product.</p> : null}
  </div>;
});
