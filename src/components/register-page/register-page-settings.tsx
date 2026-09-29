"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

// Must match REGISTER_PAGE_ICONS in the API; the storefront maps each to an icon.
const ICONS = [
  { value: "package", label: "Package" },
  { value: "heart", label: "Heart" },
  { value: "search", label: "Search" },
  { value: "truck", label: "Delivery truck" },
  { value: "shield", label: "Shield" },
  { value: "cpu", label: "Processor" },
  { value: "star", label: "Star" },
  { value: "undo", label: "Returns arrow" },
] as const;
const MAX_BENEFITS = 6;

type Benefit = { icon: string; title: string; text: string };
type Config = {
  incentive: { enabled: boolean; heading: string; highlight: string; intro: string; noticeTitle: string; noticeText: string; offerEnabled: boolean; offerCode: string; offerText: string; offerAmount: string };
  showcase: { enabled: boolean; title: string; description: string };
  benefits: { enabled: boolean; items: Benefit[] };
};

const inputClass = "mt-1.5 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong focus:ring-2 focus:ring-accent-tint-border";
const labelClass = "block text-xs font-semibold text-ink-secondary";
const message = (payload: unknown, fallback: string) => { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; };

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint?: ReactNode }) {
  return (
    <label className="flex items-start gap-3">
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-ink" : "bg-border-strong"}`}>
        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </button>
      <span className="text-[13px]"><span className="font-semibold text-ink">{label}</span>{hint ? <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span> : null}</span>
    </label>
  );
}

export function RegisterPageSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState(""), [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/settings/register-page", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(message(payload, "The settings could not be loaded."));
        setConfig((payload.data ?? payload) as Config);
      } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "The settings could not be loaded."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!config) return <div className="flex min-h-80 items-center justify-center">{error ? <p role="alert" className="flex items-center gap-2 text-sm text-danger-tint-ink"><AlertTriangle className="h-4 w-4" />{error}</p> : <LoaderCircle className="h-6 w-6 animate-spin text-ink-muted" />}</div>;

  const setIncentive = (patch: Partial<Config["incentive"]>) => setConfig({ ...config, incentive: { ...config.incentive, ...patch } });
  const setShowcase = (patch: Partial<Config["showcase"]>) => setConfig({ ...config, showcase: { ...config.showcase, ...patch } });
  const setBenefits = (patch: Partial<Config["benefits"]>) => setConfig({ ...config, benefits: { ...config.benefits, ...patch } });
  const updateBenefit = (index: number, patch: Partial<Benefit>) => setBenefits({ items: config.benefits.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const moveBenefit = (index: number, by: -1 | 1) => { const items = [...config.benefits.items]; [items[index], items[index + by]] = [items[index + by], items[index]]; setBenefits({ items }); };
  const { incentive, showcase, benefits } = config;
  const dim = (on: boolean) => (on ? "" : "opacity-50");
  const offerMissingCode = incentive.offerEnabled && !incentive.offerCode.trim();

  async function save() {
    if (!config) return;
    const trimmed = <T extends object>(section: T) => Object.fromEntries(Object.entries(section).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])) as T;
    const clean: Config = {
      incentive: trimmed(config.incentive),
      showcase: trimmed(config.showcase),
      benefits: { enabled: config.benefits.enabled, items: config.benefits.items.map(trimmed).filter((item) => item.title) },
    };
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/settings/register-page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(message(payload, "The settings could not be saved."));
      setConfig(clean);
      toast.success("Saved. The account creation page updates within about 20 seconds.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The settings could not be saved."); } finally { setSaving(false); }
  }

  return (
    <div className="w-full pb-20">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Account creation page</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">The content around the storefront&rsquo;s sign-up form. Switch a section off to hide it; changes appear on the storefront within about 20 seconds of saving. The sign-in page is not affected.</p>
      {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}

      <div className="mt-5 max-w-4xl space-y-5">
        <Section title="Heading & introduction" description="The headline, introduction and notice above the form. When off, the page shows a plain “Create your account.” heading.">
          <Switch checked={incentive.enabled} onChange={(enabled) => setIncentive({ enabled })} label="Show this section" />
          <div className={`mt-4 space-y-3 ${dim(incentive.enabled)}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Headline, first line<input value={incentive.heading} onChange={(event) => setIncentive({ heading: event.target.value })} maxLength={100} className={inputClass} /></label>
              <label className={labelClass}>Headline, highlighted second line<input value={incentive.highlight} onChange={(event) => setIncentive({ highlight: event.target.value })} maxLength={100} className={inputClass} /></label>
            </div>
            <p className="rounded-md bg-canvas px-3 py-2 text-xs text-ink-secondary">Preview: <strong className="text-ink">{incentive.heading}</strong> <strong className="text-accent-strong">{incentive.highlight}</strong></p>
            <label className={labelClass}>Introduction<textarea value={incentive.intro} onChange={(event) => setIncentive({ intro: event.target.value })} maxLength={400} rows={3} className={`${inputClass} h-auto resize-y py-2`} /><span className="mt-1 block font-normal text-ink-muted">Write <code className="rounded bg-canvas px-1">{"{store}"}</code> to insert the shop&rsquo;s name.</span></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Notice title<input value={incentive.noticeTitle} onChange={(event) => setIncentive({ noticeTitle: event.target.value })} maxLength={80} className={inputClass} /></label>
              <label className={labelClass}>Notice text<input value={incentive.noticeText} onChange={(event) => setIncentive({ noticeText: event.target.value })} maxLength={200} className={inputClass} /></label>
            </div>
            <div className="rounded-lg border border-border bg-canvas p-3">
              <Switch checked={incentive.offerEnabled} onChange={(offerEnabled) => setIncentive({ offerEnabled })} label="Show a welcome offer box above the sign-up button" hint={<>Only promise what you offer: create a matching coupon under <Link href="/promotions" className="font-semibold underline underline-offset-2">Discounts<ExternalLink className="ml-0.5 inline h-3 w-3" /></Link> first. The box stays hidden until a coupon code is entered.</>} />
              <div className={`mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_120px] ${dim(incentive.offerEnabled)}`}>
                <label className={labelClass}>Coupon code<input value={incentive.offerCode} onChange={(event) => setIncentive({ offerCode: event.target.value.toUpperCase() })} maxLength={40} placeholder="e.g. WELCOME10" className={inputClass} /></label>
                <label className={labelClass}>Description<input value={incentive.offerText} onChange={(event) => setIncentive({ offerText: event.target.value })} maxLength={160} placeholder="e.g. 10% off your first order" className={inputClass} /></label>
                <label className={labelClass}>Amount label<input value={incentive.offerAmount} onChange={(event) => setIncentive({ offerAmount: event.target.value })} maxLength={20} placeholder="−10%" className={inputClass} /></label>
              </div>
              {offerMissingCode ? <p className="mt-2 text-xs text-danger-tint-ink">Enter a coupon code, or the offer box will not be shown.</p> : null}
            </div>
          </div>
        </Section>

        <Section title="Showcase column" description="The column beside the form: its heading, category links and recommended products. When off, the whole column is hidden.">
          <Switch checked={showcase.enabled} onChange={(enabled) => setShowcase({ enabled })} label="Show this section" hint="The products come from your recommended products automatically." />
          <div className={`mt-4 space-y-3 ${dim(showcase.enabled)}`}>
            <label className={labelClass}>Title<input value={showcase.title} onChange={(event) => setShowcase({ title: event.target.value })} maxLength={80} className={inputClass} /></label>
            <label className={labelClass}>Description<input value={showcase.description} onChange={(event) => setShowcase({ description: event.target.value })} maxLength={200} className={inputClass} /></label>
          </div>
        </Section>

        <Section title="Benefits row" description="The short list of account benefits under the form (e.g. orders, wishlist).">
          <Switch checked={benefits.enabled} onChange={(enabled) => setBenefits({ enabled })} label="Show this section" />
          <div className={`mt-4 ${dim(benefits.enabled)}`}>
            {benefits.items.length ? (
              <ul className="space-y-2">
                {benefits.items.map((item, index) => (
                  <li key={index} className="grid items-end gap-3 rounded-lg border border-border p-3 sm:grid-cols-[160px_1fr_1fr_auto]">
                    <label className={labelClass}>Icon<select value={item.icon} onChange={(event) => updateBenefit(index, { icon: event.target.value })} className={inputClass}>{ICONS.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select></label>
                    <label className={labelClass}>Title<input value={item.title} onChange={(event) => updateBenefit(index, { title: event.target.value })} maxLength={60} placeholder="e.g. Your orders" className={inputClass} /></label>
                    <label className={labelClass}>Text<input value={item.text} onChange={(event) => updateBenefit(index, { text: event.target.value })} maxLength={80} placeholder="e.g. All in one place" className={inputClass} /></label>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveBenefit(index, -1)} disabled={index === 0} aria-label={`Move ${item.title || "item"} up`} className="flex h-10 w-9 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => moveBenefit(index, 1)} disabled={index === benefits.items.length - 1} aria-label={`Move ${item.title || "item"} down`} className="flex h-10 w-9 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setBenefits({ items: benefits.items.filter((_, i) => i !== index) })} aria-label={`Remove ${item.title || "item"}`} className="flex h-10 w-9 items-center justify-center rounded-md border border-border text-danger-tint-ink hover:bg-danger-tint"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="rounded-md bg-canvas px-3 py-2 text-xs text-ink-muted">No items. The row is hidden.</p>}
            {benefits.items.length < MAX_BENEFITS ? <button type="button" onClick={() => setBenefits({ items: [...benefits.items, { icon: "package", title: "", text: "" }] })} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Plus className="h-4 w-4" />Add item</button> : null}
          </div>
        </Section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes</button></div>
      </div>
    </div>
  );
}
