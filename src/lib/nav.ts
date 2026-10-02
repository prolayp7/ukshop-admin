import type { LucideIcon } from "lucide-react";
import {
  UserPlus,
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
  Images,
  BarChart3,
  Settings,
  CreditCard,
  RotateCcw,
  PanelBottom,
  PanelTop,
  Banknote,
  Percent,
  Timer,
  Truck,
  Megaphone,
  Menu as MenuIcon,
  HelpCircle,
  ShieldCheck,
  Home,
  Mail,
  ScrollText,
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
    label: "Sales & service",
    items: [
      { label: "Orders", href: "/orders", icon: ShoppingCart, badgeTone: "accent" },
      { label: "Abandoned carts", href: "/abandoned-carts", icon: ShoppingBasket },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Returns", href: "/payments/returns", icon: RotateCcw },
      { label: "Refunds", href: "/payments/refunds", icon: Banknote },
      { label: "Shipping", href: "/shipping", icon: Truck },
      { label: "Reviews", href: "/reviews", icon: Star, badgeTone: "accent" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Stock", href: "/stock", icon: Boxes },
      { label: "Categories", href: "/categories", icon: FolderTree },
      { label: "Brands", href: "/brands", icon: Tag },
      { label: "Attributes", href: "/attributes", icon: ListPlus },
      { label: "Tax rates", href: "/tax-rates", icon: Percent },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Deals", href: "/deals", icon: Timer },
      { label: "Discounts", href: "/promotions", icon: BadgePercent },
      { label: "Merchandising", href: "/merchandising", icon: Megaphone },
      { label: "Subscribers", href: "/subscribers", icon: Mail },
    ],
  },
  {
    label: "Storefront",
    items: [
      { label: "Homepage", href: "/homepage", icon: Home },
      { label: "Pages", href: "/cms/pages", icon: FileText },
      { label: "Menus", href: "/menus", icon: MenuIcon },
      { label: "Top bar", href: "/top-bar", icon: PanelTop },
      { label: "Footer", href: "/footer", icon: PanelBottom },
      { label: "Account creation page", href: "/register-page", icon: UserPlus },
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
      { label: "Audit log", href: "/audit-log", icon: ScrollText },
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
