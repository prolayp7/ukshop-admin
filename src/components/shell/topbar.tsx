"use client";

import { usePathname } from "next/navigation";
import { Menu, Search, Bell } from "lucide-react";
import { pageTitleForPath } from "@/lib/nav";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const title = pageTitleForPath(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-neutral-tint lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-[15px] font-semibold text-ink lg:text-base">{title}</h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <label className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            placeholder="Search products, orders, customers…"
            className="h-9 w-56 rounded-md border border-border bg-canvas pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-accent-strong focus:bg-surface focus:ring-2 focus:ring-accent-tint-border md:w-72"
          />
        </label>

        <button
          type="button"
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-neutral-tint sm:hidden"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-neutral-tint"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
        </button>

        <button
          type="button"
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white"
        >
          AK
        </button>
      </div>
    </header>
  );
}
