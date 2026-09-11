"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Wrench } from "lucide-react";
import { flatNavItems, navGroups } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Only the most specific href wins (not every href a pathname happens to
// start with) - otherwise nested sections like Payments (/payments) and
// Returns (/payments/returns) would both light up while on Returns.
function activeHref(pathname: string): string | undefined {
  const candidates = flatNavItems.filter((item) => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
  return candidates.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function SidebarContent({ pathname, onNavigate, collapsed = false }: { pathname: string; onNavigate?: () => void; collapsed?: boolean }) {
  const currentHref = activeHref(pathname);
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-5")}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink">
          <Wrench className="h-4.5 w-4.5" strokeWidth={2.25} />
        </span>
        {!collapsed && (
          <span className="leading-tight">
            <span className="block text-[13.5px] font-semibold tracking-tight text-white">
              UK Computer Shop
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-label">
              Administration
            </span>
          </span>
        )}
      </div>

      <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {navGroups.map((group, i) => (
          <div key={group.label ?? `top-${i}`} className={cn(i > 0 && "mt-5")}>
            {group.label && !collapsed && (
              <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sidebar-label">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === currentHref;
                const Icon = item.icon;
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-label={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md py-[7px] text-[13.5px] font-medium transition-colors",
                      collapsed ? "justify-center px-2" : "px-2.5",
                      active
                        ? "bg-sidebar-active text-sidebar-ink-active"
                        : "text-sidebar-ink hover:bg-sidebar-hover hover:text-sidebar-ink-hover"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[17px] w-[17px] shrink-0",
                        active ? "text-white" : "text-sidebar-ink group-hover:text-sidebar-ink-hover"
                      )}
                      strokeWidth={2}
                    />
                    {collapsed ? (
                      typeof item.badge === "number" && (
                        <span className={cn("absolute right-1 top-1 h-2 w-2 rounded-full", item.badgeTone === "danger" ? "bg-danger" : "bg-highlight")} />
                      )
                    ) : (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {typeof item.badge === "number" && (
                          <span
                            className={cn(
                              "min-w-[19px] rounded-full px-1.5 py-0.5 text-center text-[10.5px] font-semibold leading-none",
                              item.badgeTone === "danger"
                                ? "bg-danger text-white"
                                : "bg-highlight text-highlight-ink"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger render={link} />
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-active text-[11.5px] font-semibold text-white transition-colors hover:bg-sidebar-hover"
                />
              }
            >
              AK
            </TooltipTrigger>
            <TooltipContent side="right">Amara Khan · Store Manager</TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-hover"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-[11.5px] font-semibold text-white">
              AK
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-medium text-sidebar-ink-active">
                Amara Khan
              </span>
              <span className="block truncate text-[11.5px] text-sidebar-ink">Store Manager</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export function DesktopSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className={cn("hidden shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-150 lg:block", collapsed ? "w-[72px]" : "w-64")}>
      <div className={cn("fixed h-screen transition-[width] duration-150", collapsed ? "w-[72px]" : "w-64")}>
        <SidebarContent pathname={pathname} collapsed={collapsed} />
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-slate-950/50 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar shadow-panel transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-md text-sidebar-ink hover:bg-sidebar-hover hover:text-white"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
        <SidebarContent pathname={pathname} onNavigate={onClose} />
      </div>
    </div>
  );
}
