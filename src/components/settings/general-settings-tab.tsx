"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import { ExternalLink, Image as ImageIcon, LoaderCircle, Save, Upload } from "lucide-react";
import { mediaFileUrl, type MediaItem } from "@/lib/media";

type GeneralSettings = {
  brandName: string;
  aboutText: string;
  logo: string;
  favicon: string;
  companyAddress: string;
  supportPhone1: string;
  supportPhone2: string;
  supportEmail: string;
  socialFacebook: string;
  socialInstagram: string;
  socialTwitter: string;
  socialYoutube: string;
  latitude: string;
  longitude: string;
  copyright: string;
  vatNumber: string;
  openingHours: string;
  newsletterFromEmail: string;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  googleBusinessProfile: string;
  ga4MeasurementId: string;
  gtmContainerId: string;
  metaPixelId: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterSite: string;
  twitterCreator: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  schemaJsonLd: string;
};

const emptySettings: GeneralSettings = {
  brandName: "", aboutText: "", logo: "", favicon: "", companyAddress: "", supportPhone1: "", supportPhone2: "", supportEmail: "",
  socialFacebook: "", socialInstagram: "", socialTwitter: "", socialYoutube: "",
  latitude: "", longitude: "", copyright: "", vatNumber: "", openingHours: "", newsletterFromEmail: "",
  metaTitle: "", metaKeywords: "", metaDescription: "", googleSiteVerification: "", bingSiteVerification: "",
  googleBusinessProfile: "", ga4MeasurementId: "", gtmContainerId: "", metaPixelId: "",
  ogTitle: "", ogDescription: "", ogImage: "", twitterCard: "", twitterSite: "", twitterCreator: "",
  twitterTitle: "", twitterDescription: "", twitterImage: "", schemaJsonLd: "",
};

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "text-[13px] font-semibold text-ink-secondary";

function apiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const value = (payload as { message?: unknown }).message;
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return fallback;
}

async function uploadToLibrary(file: File, collection: string, altText: string): Promise<string> {
  const body = new FormData();
  body.set("file", file); body.set("ownerType", "LIBRARY"); body.set("ownerId", "0");
  body.set("collection", collection); body.set("altText", altText || collection);
  const response = await fetch("/api/media", { method: "POST", body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiMessage(payload, `${file.name} could not be uploaded.`));
  return ((payload.data ?? payload) as MediaItem).url;
}

export function GeneralSettingsTab() {
  const [settings, setSettings] = useState<GeneralSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/settings/general", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(payload, "General settings could not be loaded."));
        setSettings({ ...emptySettings, ...(payload.data ?? {}) });
      } catch (loadError) {
        setMessage(loadError instanceof Error ? loadError.message : "General settings could not be loaded.");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function set<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/settings/general", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "General settings could not be saved."));
      setMessage("General settings saved.");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "General settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-5 pb-8">
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <header className="border-b border-border px-5 py-4"><h2 className="text-[14px] font-semibold text-ink">Branding</h2><p className="mt-1 text-xs text-ink-muted">The brand name, logo and favicon used across the storefront.</p></header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className={`${labelClass} md:col-span-2`}>Brand name<input value={settings.brandName} onChange={(event) => set("brandName", event.target.value)} placeholder="e.g. BYTEVEX" maxLength={80} className={inputClass} /></label>
          <label className={`${labelClass} md:col-span-2`}>About text<textarea value={settings.aboutText} onChange={(event) => set("aboutText", event.target.value)} rows={3} maxLength={300} placeholder="A short description shown in the storefront footer &quot;About&quot; section." className={`${inputClass} h-auto py-2`} /></label>
          <ImageField label="Logo" hint="Recommended: wide transparent PNG or WebP, around 200×40px. JPG, PNG or WebP, up to 1MB." value={settings.logo} onChange={(url) => set("logo", url)} collection="general-logo" altText="Logo" />
          <ImageField label="Favicon" hint="Recommended: square PNG or WebP, at least 64×64px. Up to 1MB." value={settings.favicon} onChange={(url) => set("favicon", url)} collection="general-favicon" altText="Favicon" square />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <header className="border-b border-border px-5 py-4"><h2 className="text-[14px] font-semibold text-ink">Company &amp; support</h2></header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className={`${labelClass} md:col-span-2`}>Company address<textarea value={settings.companyAddress} onChange={(event) => set("companyAddress", event.target.value)} rows={2} className={`${inputClass} h-auto resize-y py-2`} /></label>
          <label className={labelClass}>Contact number 1<input value={settings.supportPhone1} onChange={(event) => set("supportPhone1", event.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Contact number 2<input value={settings.supportPhone2} onChange={(event) => set("supportPhone2", event.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Support email<input type="email" value={settings.supportEmail} onChange={(event) => set("supportEmail", event.target.value)} className={inputClass} /></label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <header className="border-b border-border px-5 py-4"><h2 className="text-[14px] font-semibold text-ink">Social media links</h2></header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className={labelClass}>Facebook<input value={settings.socialFacebook} onChange={(event) => set("socialFacebook", event.target.value)} placeholder="https://facebook.com/..." className={inputClass} /></label>
          <label className={labelClass}>Instagram<input value={settings.socialInstagram} onChange={(event) => set("socialInstagram", event.target.value)} placeholder="https://instagram.com/..." className={inputClass} /></label>
          <label className={labelClass}>X (Twitter)<input value={settings.socialTwitter} onChange={(event) => set("socialTwitter", event.target.value)} placeholder="https://x.com/..." className={inputClass} /></label>
          <label className={labelClass}>YouTube<input value={settings.socialYoutube} onChange={(event) => set("socialYoutube", event.target.value)} placeholder="https://youtube.com/..." className={inputClass} /></label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <header className="border-b border-border px-5 py-4"><h2 className="text-[14px] font-semibold text-ink">Default location</h2><p className="mt-1 text-xs text-ink-muted">Used for the storefront&rsquo;s &ldquo;find us&rdquo; link and location schema.</p></header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className={labelClass}>Latitude<input value={settings.latitude} onChange={(event) => set("latitude", event.target.value)} placeholder="e.g. 53.4668" className={`${inputClass} font-mono`} /></label>
          <label className={labelClass}>Longitude<input value={settings.longitude} onChange={(event) => set("longitude", event.target.value)} placeholder="e.g. -2.3236" className={`${inputClass} font-mono`} /></label>
          {settings.latitude && settings.longitude ? (
            <a href={`https://www.google.com/maps?q=${encodeURIComponent(settings.latitude)},${encodeURIComponent(settings.longitude)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint md:col-span-2">View on map<ExternalLink className="h-3.5 w-3.5" /></a>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <header className="border-b border-border px-5 py-4"><h2 className="text-[14px] font-semibold text-ink">Legal &amp; display</h2></header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className={labelClass}>Copyright text<input value={settings.copyright} onChange={(event) => set("copyright", event.target.value)} placeholder="e.g. © 2026 RigForge Ltd" className={inputClass} /></label>
          <label className={labelClass}>VAT number<input value={settings.vatNumber} onChange={(event) => set("vatNumber", event.target.value)} className={inputClass} /></label>
          <label className={`${labelClass} md:col-span-2`}>Opening hours<input value={settings.openingHours} onChange={(event) => set("openingHours", event.target.value)} placeholder="e.g. Mon–Fri 9:00–17:30 · Sat 10:00–16:00" className={inputClass} /></label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <header className="border-b border-border px-5 py-4"><h2 className="text-[14px] font-semibold text-ink">Newsletter</h2></header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className={labelClass}>Subscription &ldquo;from&rdquo; email address<input type="email" value={settings.newsletterFromEmail} onChange={(event) => set("newsletterFromEmail", event.target.value)} placeholder="deals@example.co.uk" className={inputClass} /></label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <header className="border-b border-border px-5 py-4"><h2 className="text-[14px] font-semibold text-ink">SEO settings</h2><p className="mt-1 text-xs text-ink-muted">Common across the site, and used for the homepage&rsquo;s meta tags and structured data.</p></header>
        <div className="space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className={`${labelClass} md:col-span-2`}>Meta title (homepage)<input value={settings.metaTitle} onChange={(event) => set("metaTitle", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Meta keywords<input value={settings.metaKeywords} onChange={(event) => set("metaKeywords", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Meta description<input value={settings.metaDescription} onChange={(event) => set("metaDescription", event.target.value)} className={inputClass} /></label>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-[13px] font-semibold text-ink">Verification &amp; tracking</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className={labelClass}>Google site verification<input value={settings.googleSiteVerification} onChange={(event) => set("googleSiteVerification", event.target.value)} className={`${inputClass} font-mono`} /></label>
              <label className={labelClass}>Bing site verification<input value={settings.bingSiteVerification} onChange={(event) => set("bingSiteVerification", event.target.value)} className={`${inputClass} font-mono`} /></label>
              <label className={labelClass}>Google Business Profile<input value={settings.googleBusinessProfile} onChange={(event) => set("googleBusinessProfile", event.target.value)} placeholder="https://g.page/..." className={inputClass} /></label>
              <label className={labelClass}>GA4 Measurement ID<input value={settings.ga4MeasurementId} onChange={(event) => set("ga4MeasurementId", event.target.value)} placeholder="G-XXXXXXXXXX" className={`${inputClass} font-mono`} /></label>
              <label className={labelClass}>GTM Container ID<input value={settings.gtmContainerId} onChange={(event) => set("gtmContainerId", event.target.value)} placeholder="GTM-XXXXXXX" className={`${inputClass} font-mono`} /></label>
              <label className={labelClass}>Meta / Facebook Pixel ID<input value={settings.metaPixelId} onChange={(event) => set("metaPixelId", event.target.value)} className={`${inputClass} font-mono`} /></label>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-[13px] font-semibold text-ink">Open Graph (homepage)</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className={labelClass}>OG title<input value={settings.ogTitle} onChange={(event) => set("ogTitle", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}>OG description<input value={settings.ogDescription} onChange={(event) => set("ogDescription", event.target.value)} className={inputClass} /></label>
              <ImageField label="OG image" hint="Recommended: 1200×630px." value={settings.ogImage} onChange={(url) => set("ogImage", url)} collection="general-og-image" altText={settings.ogTitle || "OG image"} />
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-[13px] font-semibold text-ink">X / Twitter card (homepage)</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className={labelClass}>X card type<select value={settings.twitterCard} onChange={(event) => set("twitterCard", event.target.value)} className={inputClass}><option value="">Select…</option><option value="summary">Summary</option><option value="summary_large_image">Summary with large image</option></select></label>
              <label className={labelClass}>X site handle<input value={settings.twitterSite} onChange={(event) => set("twitterSite", event.target.value)} placeholder="@rigforge" className={inputClass} /></label>
              <label className={labelClass}>X creator handle<input value={settings.twitterCreator} onChange={(event) => set("twitterCreator", event.target.value)} placeholder="@rigforge" className={inputClass} /></label>
              <label className={labelClass}>X title<input value={settings.twitterTitle} onChange={(event) => set("twitterTitle", event.target.value)} className={inputClass} /></label>
              <label className={`${labelClass} md:col-span-2`}>X description<input value={settings.twitterDescription} onChange={(event) => set("twitterDescription", event.target.value)} className={inputClass} /></label>
              <ImageField label="X image" hint="Recommended: 1200×675px." value={settings.twitterImage} onChange={(url) => set("twitterImage", url)} collection="general-twitter-image" altText={settings.twitterTitle || "X image"} />
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-[13px] font-semibold text-ink">Schema (homepage)</h3>
            <label className="mt-3 block text-[13px] font-semibold text-ink-secondary">Schema JSON-LD<textarea value={settings.schemaJsonLd} onChange={(event) => set("schemaJsonLd", event.target.value)} rows={6} placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Organization"\n}'} className={`${inputClass} h-auto resize-y py-3 font-mono text-xs`} /></label>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <p aria-live="polite" className="text-xs text-ink-muted">{message}</p>
        <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white hover:bg-sidebar-hover disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save general settings</button>
      </div>
    </form>
  );
}

function ImageField({ label, hint, value, onChange, collection, altText, square }: { label: string; hint: string; value: string; onChange: (url: string) => void; collection: string; altText: string; square?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    event.target.value = "";
    if (!nextFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) { setError("Images must be JPG, PNG or WebP files."); return; }
    if (nextFile.size > 1024 * 1024) { setError("Images must be 1MB or smaller."); return; }
    setError(""); setFile(nextFile); setUploading(true);
    try {
      const url = await uploadToLibrary(nextFile, collection, altText);
      onChange(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  const src = previewUrl ?? (value ? mediaFileUrl(value) : null);
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <p className="mt-1 text-[10.5px] leading-4 text-ink-muted">{hint}</p>
      <div className={`mt-2 flex items-center justify-center rounded-lg border border-dashed border-border-strong bg-canvas p-4 ${square ? "h-24 w-24" : "h-24 w-full"}`}>
        {src ? <NextImage unoptimized src={src} width={square ? 96 : 240} height={96} alt="" className={square ? "h-full w-full object-contain" : "h-full max-w-full object-contain"} /> : <ImageIcon className="h-6 w-6 text-ink-faint" />}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} className="hidden" />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="mt-2 inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50">{uploading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}{value ? "Replace image" : "Choose image"}</button>
      {error ? <p className="mt-1.5 text-[10.5px] text-danger-tint-ink">{error}</p> : null}
    </div>
  );
}
