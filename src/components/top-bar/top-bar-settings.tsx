"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CURRENCY } from "@/lib/currency";
import { Section, Switch, iconButton, inputClass, labelClass, message } from "@/components/footer/footer-settings";

const MAX_TERMS = 8;

type Config = {
  enabled: boolean;
  trackOrder: { enabled: boolean; label: string };
  popular: { enabled: boolean; label: string; terms: string[] };
  showStockCount: boolean;
  help: { enabled: boolean; label: string; href: string };
  showCurrency: boolean;
};

/** Storefront > Top bar: the thin strip above the storefront header. */
export function TopBarSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState(""), [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/settings/top-bar", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(message(payload, "The top bar settings could not be loaded."));
        setConfig((payload.data ?? payload) as Config);
      } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "The top bar settings could not be loaded."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!config) return <div className="flex min-h-80 items-center justify-center">{error ? <p role="alert" className="flex items-center gap-2 text-sm text-danger-tint-ink"><AlertTriangle className="h-4 w-4" />{error}</p> : <LoaderCircle className="h-6 w-6 animate-spin text-ink-muted" />}</div>;

  const { trackOrder, popular, help } = config;
  const set = (patch: Partial<Config>) => setConfig({ ...config, ...patch });
  const setTerms = (terms: string[]) => set({ popular: { ...popular, terms } });
  const moveTerm = (index: number, by: -1 | 1) => { const terms = [...popular.terms]; [terms[index], terms[index + by]] = [terms[index + by], terms[index]]; setTerms(terms); };
  const dim = (on: boolean) => (on ? "" : "opacity-50");
  const helpMissing = help.enabled && !help.href.trim();

  async function save() {
    if (!config) return;
    const clean: Config = {
      ...config,
      trackOrder: { ...config.trackOrder, label: config.trackOrder.label.trim() },
      popular: { ...config.popular, label: config.popular.label.trim(), terms: config.popular.terms.map((term) => term.trim()).filter(Boolean) },
      help: { ...config.help, label: config.help.label.trim(), href: config.help.href.trim() },
    };
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/settings/top-bar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(message(payload, "The top bar settings could not be saved."));
      setConfig(clean);
      toast.success("Saved. The storefront top bar updates within about 20 seconds.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The top bar settings could not be saved."); } finally { setSaving(false); }
  }

  return (
    <div className="w-full pb-20">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Top bar</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">The thin strip above the storefront header. Changes appear on the storefront within about 20 seconds of saving.</p>
      {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}

      <div className="mt-5 max-w-4xl space-y-5">
        <Section title="Top bar" description="Switch off to hide the whole strip on every page.">
          <Switch checked={config.enabled} onChange={(enabled) => set({ enabled })} label="Show the top bar" />
        </Section>

        <div className={`space-y-5 ${dim(config.enabled)}`}>
          <Section title="Track my order" description="Link on the left to the customer's orders (signed-out shoppers are asked to sign in first).">
            <Switch checked={trackOrder.enabled} onChange={(enabled) => set({ trackOrder: { ...trackOrder, enabled } })} label="Show the link" />
            <label className={`${labelClass} mt-4 max-w-sm ${dim(trackOrder.enabled)}`}>Link text<input value={trackOrder.label} onChange={(event) => set({ trackOrder: { ...trackOrder, label: event.target.value } })} maxLength={40} className={inputClass} /></label>
          </Section>

          <Section title="Popular searches" description="Chips in the middle; each one runs a storefront search for its text. Remove them all to hide the chips.">
            <Switch checked={popular.enabled} onChange={(enabled) => set({ popular: { ...popular, enabled } })} label="Show popular searches" />
            <div className={`mt-4 space-y-3 ${dim(popular.enabled)}`}>
              <label className={`${labelClass} max-w-sm`}>Label<input value={popular.label} onChange={(event) => set({ popular: { ...popular, label: event.target.value } })} maxLength={30} placeholder="Leave empty for no label" className={inputClass} /></label>
              <div className="space-y-2">
                <p className={labelClass}>Search terms</p>
                {popular.terms.length === 0 ? <p className="rounded-md border border-dashed border-border-strong bg-canvas p-4 text-center text-xs text-ink-muted">No terms: the chips are hidden.</p> : null}
                {popular.terms.map((term, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input value={term} onChange={(event) => setTerms(popular.terms.map((value, i) => (i === index ? event.target.value : value)))} maxLength={40} aria-label={`Search term ${index + 1}`} placeholder="e.g. RTX 4070" className={`${inputClass} mt-0 max-w-xs`} />
                    <button type="button" className={iconButton} disabled={index === 0} onClick={() => moveTerm(index, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" className={iconButton} disabled={index === popular.terms.length - 1} onClick={() => moveTerm(index, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" className={`${iconButton} hover:bg-danger-tint hover:text-danger`} onClick={() => setTerms(popular.terms.filter((_, i) => i !== index))} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button type="button" disabled={popular.terms.length >= MAX_TERMS} onClick={() => setTerms([...popular.terms, ""])} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Plus className="h-4 w-4" />Add term</button>
              </div>
            </div>
          </Section>

          <Section title="Right-hand side" description="The live stock count, the help link and the prices note.">
            <div className="space-y-4">
              <Switch checked={config.showStockCount} onChange={(showStockCount) => set({ showStockCount })} label="Show “… products in stock” (counted live from the catalogue)" />
              <div>
                <Switch checked={help.enabled} onChange={(enabled) => set({ help: { ...help, enabled } })} label="Show the help link" />
                <div className={`mt-3 grid gap-3 sm:grid-cols-2 ${dim(help.enabled)}`}>
                  <label className={labelClass}>Link text<input value={help.label} onChange={(event) => set({ help: { ...help, label: event.target.value } })} maxLength={40} className={inputClass} /></label>
                  <label className={labelClass}>Link address<input value={help.href} onChange={(event) => set({ help: { ...help, href: event.target.value } })} maxLength={300} placeholder="/faqs" className={`${inputClass} font-mono`} /><span className="mt-1 block text-xs font-normal text-ink-muted">A storefront path such as /faqs, or a full https:// address.</span></label>
                </div>
                {helpMissing ? <p className="mt-2 text-xs text-danger-tint-ink">Add a link address, or switch the help link off.</p> : null}
              </div>
              <Switch checked={config.showCurrency} onChange={(showCurrency) => set({ showCurrency })} label={`Show the prices note (“${CURRENCY} · Inc. VAT”; the currency is set by the store’s environment)`} />
            </div>
          </Section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-end"><button type="button" onClick={() => void save()} disabled={saving || helpMissing} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes</button></div>
      </div>
    </div>
  );
}
