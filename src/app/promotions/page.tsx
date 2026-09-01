import { Suspense } from "react"; import { DiscountsPage } from "@/components/discounts/discounts-page";

export default function PromotionsPage() {
  return <Suspense fallback={<div className="min-h-80 animate-pulse rounded-xl bg-neutral-tint"/>}><DiscountsPage/></Suspense>;
}
