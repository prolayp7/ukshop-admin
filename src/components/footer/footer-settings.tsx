"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MAX_PAYMENT_METHODS = 12;

type Config = {
  newsletter: { enabled: boolean; eyebrow: string; heading: string; text: string };
  aboutText: string;
  paymentMethods: string[];
};

export const inputClass = "mt-1.5 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong focus:ring-2 focus:ring-accent-tint-border";
export const labelClass = "block text-xs font-semibold text-ink-secondary";
export const iconButton = "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink disabled:pointer-events-none disabled:opacity-30";
export const message = (payload: unknown, fallback: string) => { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; };

export function Section({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3">
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-ink" : "bg-border-strong"}`}>
        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </button>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
    </label>
  );
}

// The parts of the footer managed elsewhere, linked so the whole footer is reachable from here.
const MANAGED_ELSEWHERE = [
  { title: "Link columns", detail: "Shop, Customer service, Company, Resources and any Legal column.", href: "/menus", action: "Edit in Menus → Footer" },
  { title: "Logo, contact details & social links", detail: "Logo, phone numbers, email, address and map, opening hours, social profiles.", href: "/settings", action: "Edit in Settings → General" },
  { title: "Copyright line", detail: "The © line and VAT number in the bottom bar.", href: "/settings", action: "Edit in Settings → General" },
];

export function FooterSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState(""), [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/settings/footer", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(message(payload, "The footer settings could not be loaded."));
        setConfig((payload.data ?? payload) as Config);
      } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "The footer settings could not be loaded."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!config) return <div className="flex min-h-80 items-center justify-center">{error ? <p role="alert" className="flex items-center gap-2 text-sm text-danger-tint-ink"><AlertTriangle className="h-4 w-4" />{error}</p> : <LoaderCircle className="h-6 w-6 animate-spin text-ink-muted" />}</div>;

  const { newsletter, paymentMethods } = config;
  const setNewsletter = (patch: Partial<Config["newsletter"]>) => setConfig({ ...config, newsletter: { ...newsletter, ...patch } });
  const setMethods = (next: string[]) => setConfig({ ...config, paymentMethods: next });
  const moveMethod = (index: number, by: -1 | 1) => { const next = [...paymentMethods]; [next[index], next[index + by]] = [next[index + by], next[index]]; setMethods(next); };

  async function save() {
    if (!config) return;
    const clean: Config = {
      newsletter: { enabled: config.newsletter.enabled, eyebrow: config.newsletter.eyebrow.trim(), heading: config.newsletter.heading.trim(), text: config.newsletter.text.trim() },
      aboutText: config.aboutText.trim(),
      paymentMethods: config.paymentMethods.map((method) => method.trim()).filter(Boolean),
    };
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/settings/footer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(message(payload, "The footer settings could not be saved."));
      setConfig(clean);
      toast.success("Saved. The storefront footer updates within about 20 seconds.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The footer settings could not be saved."); } finally { setSaving(false); }
  }

  return (
    <div className="w-full pb-20">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Footer</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">The bottom of every storefront page. Changes appear on the storefront within about 20 seconds of saving.</p>
      {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}

      <div className="mt-5 max-w-4xl space-y-5">
        <Section title="Newsletter sign-up" description="The “Deals & restock alerts” band above the footer. When off, the band is hidden.">
          <Switch checked={newsletter.enabled} onChange={(enabled) => setNewsletter({ enabled })} label="Show the newsletter sign-up" />
          <div className={`mt-4 space-y-3 ${newsletter.enabled ? "" : "opacity-50"}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Small label<input value={newsletter.eyebrow} onChange={(event) => setNewsletter({ eyebrow: event.target.value })} maxLength={60} className={inputClass} /></label>
              <label className={labelClass}>Heading<input value={newsletter.heading} onChange={(event) => setNewsletter({ heading: event.target.value })} maxLength={120} className={inputClass} /></label>
            </div>
            <label className={labelClass}>Text<textarea value={newsletter.text} onChange={(event) => setNewsletter({ text: event.target.value })} maxLength={300} rows={2} className={`${inputClass} h-auto resize-y py-2 leading-relaxed`} /></label>
          </div>
        </Section>

        <Section title="About the store" description="The short line under the logo.">
          <label className={labelClass}>Text<textarea value={config.aboutText} onChange={(event) => setConfig({ ...config, aboutText: event.target.value })} maxLength={400} rows={2} placeholder="Leave empty to hide it" className={`${inputClass} h-auto resize-y py-2 leading-relaxed`} /></label>
        </Section>

        <Section title="Payment badges" description={<>The payment methods shown in the bottom bar, in this order. Remove them all to hide the badges. They are labels only; payment providers are set up in Settings.</>}>
          <div className="space-y-2">
            {paymentMethods.length === 0 ? <p className="rounded-md border border-dashed border-border-strong bg-canvas p-4 text-center text-xs text-ink-muted">No badges: the bottom bar shows none.</p> : null}
            {paymentMethods.map((method, index) => (
              <div key={index} className="flex items-center gap-2">
                <input value={method} onChange={(event) => setMethods(paymentMethods.map((value, i) => (i === index ? event.target.value : value)))} maxLength={30} aria-label={`Badge ${index + 1}`} placeholder="e.g. VISA" className={`${inputClass} mt-0 max-w-xs`} />
                <button type="button" className={iconButton} disabled={index === 0} onClick={() => moveMethod(index, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" className={iconButton} disabled={index === paymentMethods.length - 1} onClick={() => moveMethod(index, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" className={`${iconButton} hover:bg-danger-tint hover:text-danger`} onClick={() => setMethods(paymentMethods.filter((_, i) => i !== index))} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" disabled={paymentMethods.length >= MAX_PAYMENT_METHODS} onClick={() => setMethods([...paymentMethods, ""])} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Plus className="h-4 w-4" />Add badge</button>
          </div>
        </Section>

        <Section title="Managed elsewhere" description="The rest of the footer comes from these pages, so each detail is edited in one place.">
          <ul className="divide-y divide-border">
            {MANAGED_ELSEWHERE.map((item) => (
              <li key={item.title} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span><span className="block text-[13px] font-semibold text-ink">{item.title}</span><span className="text-xs text-ink-muted">{item.detail}</span></span>
                <Link href={item.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary underline underline-offset-2 hover:text-ink">{item.action}<ExternalLink className="h-3.5 w-3.5" /></Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes</button></div>
      </div>
    </div>
  );
}
