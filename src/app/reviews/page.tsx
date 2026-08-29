import { Star } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function ReviewsPage() {
  return (
    <ComingSoon
      icon={Star}
      title="Reviews"
      description="Moderation and approval for customer reviews and ratings — built next on this same system."
    />
  );
}
