import { Package } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function ProductsPage() {
  return (
    <ComingSoon
      icon={Package}
      title="Products"
      description="Catalog management, specifications, pricing, stock and bulk import — built next on this same system."
    />
  );
}
