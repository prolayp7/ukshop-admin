import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  Users,
  Star,
  BadgePercent,
  Newspaper,
  Images,
  BarChart3,
  Palette,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  badgeTone?: "accent" | "danger";
};

export type NavGroup = {
  label: string | null;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Categories", href: "/categories", icon: FolderTree },
      { label: "Brands", href: "/brands", icon: Tag },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/orders", icon: ShoppingCart, badge: 12, badgeTone: "accent" },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Reviews", href: "/reviews", icon: Star, badge: 6, badgeTone: "accent" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Discounts", href: "/promotions", icon: BadgePercent },
      { label: "Content", href: "/content", icon: Newspaper },
      { label: "Media library", href: "/media", icon: Images },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3 }],
  },
  {
    label: "System",
    items: [
      { label: "Design", href: "/design", icon: Palette },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const flatNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

export function pageTitleForPath(pathname: string): string {
  if (pathname.startsWith("/account-settings")) return "Account settings";
  const match = flatNavItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
  return match?.label ?? "Dashboard";
}
