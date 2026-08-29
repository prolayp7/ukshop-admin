import { BadgePercent } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function PromotionsPage() {
  return (
    <ComingSoon
      icon={BadgePercent}
      title="Promotions"
      description="Coupons, deals, discounts and featured product placement — built next on this same system."
    />
  );
}
