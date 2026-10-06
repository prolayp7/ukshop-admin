import { Suspense } from "react";
import { MerchandisingListing } from "@/components/merchandising/merchandising-listing";

export default function MerchandisingPage() {
  return <Suspense fallback={<div className="min-h-80 animate-pulse rounded-xl bg-neutral-tint" />}><MerchandisingListing /></Suspense>;
}
