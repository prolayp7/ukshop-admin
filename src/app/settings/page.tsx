import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings"
      description="General, payment, shipping, tax, email, SEO, roles and API configuration — built next on this same system."
    />
  );
}
