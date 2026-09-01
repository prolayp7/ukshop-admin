"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LoaderCircle, LogOut, Menu, Search, Settings } from "lucide-react";
import { pageTitleForPath } from "@/lib/nav";

type AdminUser = {
  id: number;
  email: string;
  name: string;
  roleId: number;
  permissionKeys: string[];
};

function initialsFor(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "AD";
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const title = pageTitleForPath(pathname);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as { data?: AdminUser };
        return payload.data ?? null;
      })
      .then((user) => {
        if (active) setAdminUser(user);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    firstMenuItemRef.current?.focus();

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function signOut() {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const displayName = adminUser?.name ?? "Admin user";
  const displayEmail = adminUser?.email ?? "Signed in";
  const initials = initialsFor(displayName);

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

      <h1 className="text-[14.5px] font-semibold text-ink lg:text-base">{title}</h1>

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

        <div ref={menuRef} className="relative ml-1">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-1 rounded-md p-0.5 pr-1 text-ink-secondary transition-colors hover:bg-neutral-tint"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
              {initials}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-panel"
            >
              <div className="border-b border-border px-4 py-3.5">
                <p className="truncate text-[13.5px] font-semibold text-ink">{displayName}</p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">{displayEmail}</p>
              </div>

              <div className="p-1.5">
                <Link
                  ref={firstMenuItemRef}
                  href="/account-settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-neutral-tint hover:text-ink"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Account settings
                </Link>
              </div>

              <div className="border-t border-border p-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  disabled={isSigningOut}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-danger-tint-ink transition-colors hover:bg-danger-tint disabled:cursor-wait disabled:opacity-60"
                >
                  {isSigningOut ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isSigningOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
