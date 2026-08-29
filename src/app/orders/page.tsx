import { ShoppingCart } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function OrdersPage() {
  return (
    <ComingSoon
      icon={ShoppingCart}
      title="Orders"
      description="Order status, payments, refunds, returns and shipping — built next on this same system."
    />
  );
}
