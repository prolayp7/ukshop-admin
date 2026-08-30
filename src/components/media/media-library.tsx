"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Grid2X2,
  ImageIcon,
  List,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFileSize, mediaFileUrl, type MediaItem, type MediaMeta } from "@/lib/media";

type ViewMode = "grid" | "list";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "application/pdf", "text/csv", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

function originalName(item: MediaItem) {
  return item.metadata?.originalName || item.url.split("/").pop() || `media-${item.id}`;
}

function isImage(item: MediaItem) {
  return item.metadata?.mimeType?.startsWith("image/") ?? false;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  }
  return fallback;
}

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [meta, setMeta] = useState<MediaMeta>({ page: 1, perPage: 24, total: 0, totalPages: 0, collections: [], ownerTypes: [] });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [collection, setCollection] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), perPage: "24" });
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (collection) params.set("collection", collection);

    try {
      const response = await fetch(`/api/media?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, "Could not load the media library."));
      setItems(payload.data ?? []);
      setMeta(payload.meta ?? { page, perPage: 24, total: 0, totalPages: 0, collections: [], ownerTypes: [] });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the media library.");
    } finally {
      setLoading(false);
    }
  }, [collection, page, search, type]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadMedia(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadMedia]);

  function changeView(nextView: ViewMode) {
    setView(nextView);
    window.localStorage.setItem("ukshop-media-view", nextView);
  }

  const hasFilters = Boolean(searchInput || type || collection);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink sm:text-2xl">Media library</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">Manage images and documents used across products, content and storefront pages.</p>
        </div>
        <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-md bg-accent px-4 text-[13px] font-semibold text-accent-ink transition-colors hover:bg-accent-strong">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Upload files
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Search media</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} type="search" placeholder="Filename or alt text" className="h-10 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-[13px] text-ink shadow-card outline-none placeholder:text-ink-faint focus:border-accent-strong focus:ring-2 focus:ring-accent-tint-border" />
          </label>
          <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} aria-label="Filter by file type" className="h-10 rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink-secondary shadow-card outline-none focus:border-accent-strong">
            <option value="">All file types</option>
            <option value="IMAGE">Images</option>
            <option value="DOCUMENT">Documents</option>
          </select>
          <select value={collection} onChange={(event) => { setCollection(event.target.value); setPage(1); }} aria-label="Filter by collection" className="h-10 rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink-secondary shadow-card outline-none focus:border-accent-strong">
            <option value="">All collections</option>
            {meta.collections.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 xl:justify-end">
          <p className="text-xs text-ink-muted">{meta.total} {meta.total === 1 ? "file" : "files"}</p>
          <div className="flex rounded-md bg-neutral-tint p-0.5" aria-label="Choose media layout">
            <button type="button" onClick={() => changeView("grid")} aria-label="Grid view" aria-pressed={view === "grid"} className={cn("flex h-8 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-semibold transition-colors", view === "grid" ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink")}><Grid2X2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Grid</span></button>
            <button type="button" onClick={() => changeView("list")} aria-label="List view" aria-pressed={view === "list"} className={cn("flex h-8 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-semibold transition-colors", view === "list" ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink")}><List className="h-3.5 w-3.5" /> <span className="hidden sm:inline">List</span></button>
          </div>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={loadMedia} /> : loading ? <LoadingState view={view} /> : items.length === 0 ? <EmptyState filtered={hasFilters} onUpload={() => setUploadOpen(true)} onClear={() => { setSearchInput(""); setType(""); setCollection(""); setPage(1); }} /> : view === "grid" ? <MediaGrid items={items} onSelect={setSelected} /> : <MediaList items={items} onSelect={setSelected} />}

      {!loading && !error && meta.totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-ink-muted">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-ink-secondary shadow-card hover:bg-neutral-tint disabled:cursor-not-allowed disabled:opacity-45"><ChevronLeft className="h-4 w-4" /> Previous</button>
            <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-ink-secondary shadow-card hover:bg-neutral-tint disabled:cursor-not-allowed disabled:opacity-45">Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      ) : null}

      {uploadOpen ? <UploadDialog collections={meta.collections} onClose={() => setUploadOpen(false)} onComplete={() => { setUploadOpen(false); setPage(1); void loadMedia(); }} /> : null}
      {selected ? <MediaDetails item={selected} onClose={() => setSelected(null)} onChanged={(updated) => { setSelected(updated); setItems((current) => current.map((item) => item.id === updated.id ? updated : item)); }} onDeleted={() => { setSelected(null); void loadMedia(); }} /> : null}
    </div>
  );
}

function MediaGrid({ items, onSelect }: { items: MediaItem[]; onSelect: (item: MediaItem) => void }) {
  return <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{items.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item)} className="group overflow-hidden rounded-lg border border-border bg-surface text-left shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-border-strong"><MediaPreview item={item} className="aspect-[4/3]" /><div className="p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{originalName(item)}</p><p className="mt-1 truncate text-xs text-ink-muted">{item.altText || "No alt text"}</p></div><MoreHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint group-hover:text-ink" /></div><div className="mt-3 flex items-center justify-between gap-2"><span className="max-w-[60%] truncate rounded bg-neutral-tint px-2 py-1 text-[10.5px] font-medium text-ink-secondary">{item.collection}</span><span className="text-[10.5px] text-ink-muted">{formatFileSize(item.metadata?.size)}</span></div></div></button>)}</div>;
}

function MediaList({ items, onSelect }: { items: MediaItem[]; onSelect: (item: MediaItem) => void }) {
  return <div className="mt-5 overflow-hidden rounded-lg border border-border bg-surface shadow-card"><div className="hidden grid-cols-[minmax(260px,2fr)_1fr_120px_110px_40px] gap-4 border-b border-border bg-canvas px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted md:grid"><span>File</span><span>Collection</span><span>Type</span><span>Size</span><span /></div>{items.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item)} className="grid w-full grid-cols-[48px_minmax(0,1fr)_32px] items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-canvas md:grid-cols-[minmax(260px,2fr)_1fr_120px_110px_40px] md:gap-4 md:px-4"><div className="contents md:flex md:min-w-0 md:items-center md:gap-3"><MediaPreview item={item} className="h-12 w-12 rounded-md" /><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{originalName(item)}</p><p className="mt-0.5 truncate text-xs text-ink-muted">{item.altText || "No alt text"}</p></div></div><span className="hidden truncate text-xs text-ink-secondary md:block">{item.collection}</span><span className="hidden text-xs text-ink-secondary md:block">{isImage(item) ? "Image" : "Document"}</span><span className="hidden text-xs text-ink-secondary md:block">{formatFileSize(item.metadata?.size)}</span><MoreHorizontal className="h-4 w-4 text-ink-faint" /></button>)}</div>;
}

function MediaPreview({ item, className }: { item: MediaItem; className?: string }) {
  return <div className={cn("relative shrink-0 overflow-hidden bg-neutral-tint", className)}>{isImage(item) ? <Image src={mediaFileUrl(item.url)} alt={item.altText || ""} fill unoptimized sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.025]" /> : <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-muted"><FileText className="h-8 w-8" /><span className="max-w-[80%] truncate text-[10.5px] font-semibold uppercase">{item.metadata?.mimeType?.split("/").pop() || "FILE"}</span></div>}</div>;
}

function LoadingState({ view }: { view: ViewMode }) {
  if (view === "list") return <div className="mt-5 overflow-hidden rounded-lg border border-border bg-surface">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="flex items-center gap-3 border-b border-border p-3 last:border-0"><div className="h-12 w-12 animate-pulse rounded-md bg-neutral-tint" /><div className="flex-1"><div className="h-3 w-40 animate-pulse rounded bg-neutral-tint" /><div className="mt-2 h-2.5 w-64 max-w-full animate-pulse rounded bg-neutral-tint" /></div></div>)}</div>;
  return <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{Array.from({ length: 10 }).map((_, index) => <div key={index} className="overflow-hidden rounded-lg border border-border bg-surface"><div className="aspect-[4/3] animate-pulse bg-neutral-tint" /><div className="p-3"><div className="h-3 w-3/4 animate-pulse rounded bg-neutral-tint" /><div className="mt-2 h-2.5 w-full animate-pulse rounded bg-neutral-tint" /><div className="mt-4 h-5 w-16 animate-pulse rounded bg-neutral-tint" /></div></div>)}</div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-lg border border-danger-tint-border bg-danger-tint p-8 text-center"><RefreshCw className="h-7 w-7 text-danger" /><h2 className="mt-4 text-[13.5px] font-semibold text-ink">Media could not be loaded</h2><p className="mt-1 max-w-md text-[13px] leading-5 text-danger-tint-ink">{message}</p><button type="button" onClick={onRetry} className="mt-5 rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-white">Try again</button></div>;
}

function EmptyState({ filtered, onUpload, onClear }: { filtered: boolean; onUpload: () => void; onClear: () => void }) {
  return <div className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface p-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-tint text-accent-strong"><ImageIcon className="h-6 w-6" /></span><h2 className="mt-4 text-[13.5px] font-semibold text-ink">{filtered ? "No files match these filters" : "Your media library is empty"}</h2><p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-muted">{filtered ? "Try a different filename, type, or collection." : "Upload product images, documents, and content assets to use across the shop."}</p><button type="button" onClick={filtered ? onClear : onUpload} className="mt-5 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-white">{filtered ? <RefreshCw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{filtered ? "Clear filters" : "Upload files"}</button></div>;
}

function DialogFrame({ title, description, onClose, children, wide = false }: { title: string; description: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; document.addEventListener("keydown", handler); return () => document.removeEventListener("keydown", handler); }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-sidebar/60 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="media-dialog-title" className={cn("max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-surface shadow-panel sm:rounded-xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}><header className="sticky top-0 z-10 flex items-start gap-4 border-b border-border bg-surface px-5 py-4"><div className="min-w-0 flex-1"><h2 id="media-dialog-title" className="text-[13.5px] font-semibold text-ink">{title}</h2><p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Close dialog" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><X className="h-4 w-4" /></button></header>{children}</section></div>;
}

function UploadDialog({ collections, onClose, onComplete }: { collections: string[]; onClose: () => void; onComplete: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [collection, setCollection] = useState("general");
  const [altText, setAltText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  function acceptFiles(nextFiles: File[]) {
    setError("");
    const invalid = nextFiles.find((file) => !acceptedTypes.includes(file.type) || file.size > 10 * 1024 * 1024);
    if (invalid) { setError(`${invalid.name} is unsupported or larger than 10 MB.`); return; }
    setFiles(nextFiles);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!files.length) { setError("Choose at least one file to upload."); return; }
    if (!collection.trim()) { setError("Enter a collection name."); return; }
    setUploading(true); setError(""); setProgress(0);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const body = new FormData(); body.set("file", files[index]); body.set("ownerType", "LIBRARY"); body.set("ownerId", "0"); body.set("collection", collection.trim());
        if (files.length === 1 && altText.trim()) body.set("altText", altText.trim());
        const response = await fetch("/api/media", { method: "POST", body });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(getErrorMessage(payload, `Could not upload ${files[index].name}.`));
        setProgress(index + 1);
      }
      onComplete();
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Upload failed."); } finally { setUploading(false); }
  }

  return <DialogFrame title="Upload media" description="Add images or documents to the shared media library." onClose={uploading ? () => undefined : onClose}><form onSubmit={submit} className="p-5"><div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); acceptFiles(Array.from(event.dataTransfer.files)); }} className={cn("flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors", dragging ? "border-accent-strong bg-accent-tint" : "border-border-strong bg-canvas")}><Upload className="h-7 w-7 text-ink-muted" /><p className="mt-3 text-[13.5px] font-semibold text-ink">Drop files here or choose from your device</p><p className="mt-1 text-xs text-ink-muted">JPG, PNG, WebP, GIF, AVIF, PDF, CSV, DOC or DOCX · 10 MB each</p><input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf,text/csv,.doc,.docx" onChange={(event: ChangeEvent<HTMLInputElement>) => acceptFiles(Array.from(event.target.files ?? []))} className="sr-only" /><button type="button" onClick={() => inputRef.current?.click()} className="mt-4 rounded-md border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-ink-secondary shadow-card hover:bg-neutral-tint">Choose files</button></div>{files.length ? <div className="mt-3 max-h-28 overflow-y-auto rounded-md border border-border bg-canvas px-3">{files.map((file) => <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 border-b border-border py-2 text-xs last:border-0"><FileText className="h-4 w-4 shrink-0 text-ink-muted" /><span className="min-w-0 flex-1 truncate font-medium text-ink">{file.name}</span><span className="text-ink-muted">{formatFileSize(file.size)}</span></div>)}</div> : null}<div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-[13px] font-semibold text-ink-secondary">Collection<input value={collection} onChange={(event) => setCollection(event.target.value)} list="media-collections" maxLength={100} className="mt-2 h-10 w-full rounded-md border border-border-strong px-3 text-[13px] font-normal text-ink outline-none focus:border-accent-strong" /><datalist id="media-collections">{collections.map((value) => <option key={value} value={value} />)}</datalist></label><label className="text-[13px] font-semibold text-ink-secondary">Alt text {files.length > 1 ? <span className="font-normal text-ink-faint">(single file only)</span> : null}<input value={altText} onChange={(event) => setAltText(event.target.value)} disabled={files.length > 1} placeholder="Describe the image" className="mt-2 h-10 w-full rounded-md border border-border-strong px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong disabled:bg-neutral-tint" /></label></div>{error ? <p role="alert" className="mt-4 rounded-md bg-danger-tint px-3 py-2.5 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border">{error}</p> : null}<div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onClose} disabled={uploading} className="rounded-md border border-border px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50">Cancel</button><button type="submit" disabled={uploading || !files.length} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1d2939] disabled:cursor-not-allowed disabled:opacity-50">{uploading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Uploading {progress}/{files.length}</> : <>Upload {files.length || ""} {files.length === 1 ? "file" : "files"}</>}</button></div></form></DialogFrame>;
}

function MediaDetails({ item, onClose, onChanged, onDeleted }: { item: MediaItem; onClose: () => void; onChanged: (item: MediaItem) => void; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false); const [altText, setAltText] = useState(item.altText ?? ""); const [sortOrder, setSortOrder] = useState(String(item.sortOrder)); const [saving, setSaving] = useState(false); const [deleting, setDeleting] = useState(false); const [confirmDelete, setConfirmDelete] = useState(false); const [error, setError] = useState(""); const [copied, setCopied] = useState(false);
  async function save() { setSaving(true); setError(""); try { const response = await fetch(`/api/media/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ altText: altText.trim(), sortOrder: Number(sortOrder) || 0 }) }); const payload = await response.json(); if (!response.ok) throw new Error(getErrorMessage(payload, "Could not update this file.")); onChanged(payload.data); setEditing(false); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Update failed."); } finally { setSaving(false); } }
  async function remove() { setDeleting(true); setError(""); try { const response = await fetch(`/api/media/${item.id}`, { method: "DELETE" }); if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(getErrorMessage(payload, "Could not delete this file.")); } onDeleted(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Delete failed."); setDeleting(false); } }
  async function copyUrl() { await navigator.clipboard.writeText(`${window.location.origin}${mediaFileUrl(item.url)}`); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  return <DialogFrame title="File details" description="Review metadata, update accessibility text, or remove this file." onClose={onClose} wide><div className="grid md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]"><div className="flex min-h-72 items-center justify-center bg-canvas p-5 md:min-h-[460px]"><MediaPreview item={item} className="h-full min-h-64 w-full rounded-lg" /></div><div className="border-t border-border p-5 md:border-l md:border-t-0"><p className="break-words text-[13.5px] font-semibold text-ink">{originalName(item)}</p><p className="mt-1 text-xs text-ink-muted">{item.metadata?.mimeType || "Unknown type"} · {formatFileSize(item.metadata?.size)}</p><dl className="mt-5 space-y-3 text-xs"><div className="flex justify-between gap-4"><dt className="text-ink-muted">Collection</dt><dd className="font-medium text-ink">{item.collection}</dd></div><div className="flex justify-between gap-4"><dt className="text-ink-muted">Owner</dt><dd className="font-medium text-ink">{item.ownerType === "LIBRARY" ? "Shared library" : `${item.ownerType.replaceAll("_", " ")} #${item.ownerId}`}</dd></div><div className="flex justify-between gap-4"><dt className="text-ink-muted">Uploaded</dt><dd className="font-medium text-ink">{new Date(item.createdAt).toLocaleDateString("en-GB")}</dd></div></dl><div className="mt-5 border-t border-border pt-5">{editing ? <div className="space-y-4"><label className="block text-[13px] font-semibold text-ink-secondary">Alt text<textarea value={altText} onChange={(event) => setAltText(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-md border border-border-strong px-3 py-2 text-[13px] font-normal text-ink outline-none focus:border-accent-strong" /></label><label className="block text-[13px] font-semibold text-ink-secondary">Sort order<input type="number" min={0} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-border-strong px-3 text-[13px] font-normal text-ink outline-none focus:border-accent-strong" /></label><div className="flex gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}Save changes</button></div></div> : <><p className="text-xs font-semibold text-ink-secondary">Alt text</p><p className="mt-1 min-h-10 text-[13px] leading-5 text-ink-muted">{item.altText || "No alt text has been added."}</p><button type="button" onClick={() => setEditing(true)} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-ink-secondary hover:text-ink"><Pencil className="h-3.5 w-3.5" />Edit metadata</button></>}</div>{error ? <p role="alert" className="mt-4 rounded-md bg-danger-tint p-2.5 text-xs text-danger-tint-ink">{error}</p> : null}<div className="mt-6 space-y-2 border-t border-border pt-5"><button type="button" onClick={copyUrl} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy file URL"}</button><a href={mediaFileUrl(item.url)} download={originalName(item)} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Download className="h-4 w-4" />Download file</a>{confirmDelete ? <div className="rounded-md bg-danger-tint p-3 ring-1 ring-inset ring-danger-tint-border"><p className="text-xs font-medium leading-5 text-danger-tint-ink">Delete this file permanently? Existing pages may show a broken asset.</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => setConfirmDelete(false)} className="rounded-md border border-danger-tint-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={remove} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{deleting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}Delete</button></div></div> : <button type="button" onClick={() => setConfirmDelete(true)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-danger-tint-ink hover:bg-danger-tint"><Trash2 className="h-4 w-4" />Delete file</button>}</div></div></div></DialogFrame>;
}
