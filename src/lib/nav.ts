import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ListPlus,
  Tag,
  Boxes,
  ShoppingCart,
  ShoppingBasket,
  Users,
  Star,
  BadgePercent,
  FileText,
  Newspaper,
  Images,
  BarChart3,
  Settings,
  CreditCard,
  RotateCcw,
  Percent,
  Gift,
  Truck,
  Megaphone,
  Menu as MenuIcon,
  HelpCircle,
  ShieldCheck,
  Home,
  Mail,
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
      { label: "Attributes", href: "/attributes", icon: ListPlus },
      { label: "Stock", href: "/stock", icon: Boxes },
      { label: "Brands", href: "/brands", icon: Tag },
      { label: "Tax rates", href: "/tax-rates", icon: Percent },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/orders", icon: ShoppingCart, badge: 12, badgeTone: "accent" },
      { label: "Abandoned carts", href: "/abandoned-carts", icon: ShoppingBasket },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Reviews", href: "/reviews", icon: Star, badge: 6, badgeTone: "accent" },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Returns", href: "/payments/returns", icon: RotateCcw },
      { label: "Gift cards", href: "/gift-cards", icon: Gift },
      { label: "Shipping", href: "/shipping", icon: Truck },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Homepage", href: "/homepage", icon: Home },
      { label: "Discounts", href: "/promotions", icon: BadgePercent },
      { label: "Pages", href: "/cms/pages", icon: FileText },
      { label: "Blog", href: "/blog", icon: Newspaper },
      { label: "Merchandising", href: "/merchandising", icon: Megaphone },
      { label: "Menus", href: "/menus", icon: MenuIcon },
      { label: "Subscribers", href: "/subscribers", icon: Mail },
      { label: "FAQs & support", href: "/support-content", icon: HelpCircle },
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
      { label: "Admin users", href: "/admin-users", icon: ShieldCheck },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const flatNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

export function pageTitleForPath(pathname: string): string {
  if (pathname.startsWith("/account-settings")) return "Account settings";
  // Longest-href-wins, not first-match: some sections nest (e.g. Payments
  // at /payments and Returns at /payments/returns), so the most specific
  // href has to take priority over whichever one happens to sort first.
  const candidates = flatNavItems.filter((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
  const match = candidates.sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Dashboard";
}
