"use client";

import { useState } from "react";
import { Boxes, CheckCircle2, ChevronRight, FileDown, Layers3, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export type ProductCreationType = "standard" | "variants";

const options = [
  { type: "standard" as const, title: "Standard product", description: "A single physical item with one stock and price setup.", icon: Package, available: true },
  { type: "variants" as const, title: "Product with variants", description: "One product offered in configurations such as RAM, storage or colour.", icon: Layers3, available: true },
  { type: null, title: "Bundle or kit", description: "A sellable pack made from multiple catalogue products.", icon: Boxes, available: false },
  { type: null, title: "Digital product", description: "Software licences, downloads or other non-shipped items.", icon: FileDown, available: false },
];

export function ProductTypeChooser({ onClose, onContinue }: { onClose: () => void; onContinue: (type: ProductCreationType) => void }) {
  const [selected, setSelected] = useState<ProductCreationType>("standard");

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="gap-0 overflow-hidden bg-surface p-0 text-ink sm:max-w-2xl" showCloseButton={false}><DialogHeader className="gap-1 border-b border-border px-5 py-4 sm:px-6"><DialogTitle className="text-[13.5px] font-semibold text-ink">Choose a product type</DialogTitle><DialogDescription className="text-[13px] leading-5 text-ink-muted">Select the catalogue structure that matches what you are adding.</DialogDescription></DialogHeader><div role="radiogroup" aria-label="Product type" className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">{options.map((option) => { const Icon = option.icon; const active = option.type === selected; return <button key={option.title} type="button" role="radio" aria-checked={active} disabled={!option.available} onClick={() => { if (option.type) setSelected(option.type); }} className={cn("relative flex min-h-28 items-start gap-3 rounded-lg border p-4 text-left transition-colors", active ? "border-ink bg-neutral-tint" : "border-border bg-surface hover:border-border-strong hover:bg-canvas", !option.available && "cursor-not-allowed bg-canvas opacity-60")}><span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", active ? "bg-ink text-white" : "bg-neutral-tint text-ink-secondary")}><Icon className="h-[18px] w-[18px]" /></span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">{option.title}{!option.available ? <span className="rounded-full bg-neutral-tint px-2 py-0.5 text-[10px] font-semibold text-ink-muted ring-1 ring-inset ring-border-strong">Coming soon</span> : null}</span><span className="mt-1 block text-xs leading-5 text-ink-muted">{option.description}</span></span>{active ? <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-positive" /> : null}</button>; })}</div><DialogFooter className="mx-0 mb-0 rounded-none border-border bg-canvas px-5 py-4 sm:px-6"><DialogClose render={<Button variant="outline" className="h-10 rounded-md border-border bg-surface px-4 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint" />}>Cancel</DialogClose><Button type="button" onClick={() => onContinue(selected)} className="h-10 rounded-md bg-ink px-4 text-[13px] font-semibold text-white hover:bg-[#1d2939]">Add product<ChevronRight className="h-4 w-4" /></Button></DialogFooter></DialogContent></Dialog>;
}
