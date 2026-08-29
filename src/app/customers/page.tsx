import { Users } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function CustomersPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Customers"
      description="Customer accounts, order history and account status — built next on this same system."
    />
  );
}
