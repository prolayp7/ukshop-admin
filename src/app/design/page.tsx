import { BrandingSettings } from "@/components/settings/branding-settings";

export default function DesignPage() {
  return <div className="w-full"><div><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Design</h1><p className="mt-1 text-[13.5px] text-ink-muted">Manage the visual identity used across the storefront, emails and customer documents.</p></div><div className="mt-6 border-b border-border"><span className="relative inline-flex px-3 py-3 text-[13px] font-semibold text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-accent">Logos &amp; branding</span></div><BrandingSettings /></div>;
}
