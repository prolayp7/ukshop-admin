import { Newspaper } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function ContentPage() {
  return (
    <ComingSoon
      icon={Newspaper}
      title="Content"
      description="Blog posts, CMS pages and media library — built next on this same system."
    />
  );
}
