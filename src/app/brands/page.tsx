import { BrandsSuppliersPage } from "@/components/brands/brands-suppliers-page";
import { Suspense } from "react";

export default function BrandsPage() {
  return <Suspense fallback={<div className="min-h-80 animate-pulse rounded-xl bg-neutral-tint" />}><BrandsSuppliersPage /></Suspense>;
}
