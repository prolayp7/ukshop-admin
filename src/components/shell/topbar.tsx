"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCheck, ChevronDown, ExternalLink, LoaderCircle, LogOut, Mail, Menu, Package, RefreshCw, RotateCcw, Search, Settings, ShoppingCart, Star, Users, X } from "lucide-react";
import { pageTitleForPath } from "@/lib/nav";

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3002";

type AdminUser = {
  id: number;
  email: string;
  name: string;
  roleId: number;
  permissionKeys: string[];
};

type SearchHit = { id: number; kind: "Product" | "Order" | "Customer"; title: string; detail: string; href: string };
type AdminNotice = { key: string; title: string; detail: string; count: number; href: string };

function objectFrom(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  return record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : record;
}

function totalFrom(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0;
  const record = payload as Record<string, unknown>;
  const meta = record.meta && typeof record.meta === "object" ? record.meta as Record<string, unknown> : {};
  return typeof meta.total === "number" ? meta.total : 0;
}

async function fetchNoticeData(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function listFrom<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const data = "data" in payload ? (payload as { data: unknown }).data : payload;
  if (Array.isArray(data)) return data as T[];
  return data && typeof data === "object" && "items" in data && Array.isArray((data as { items: unknown }).items)
    ? (data as { items: T[] }).items
    : [];
}

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
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const mobileSearchPanelRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeHit, setActiveHit] = useState(-1);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notices, setNotices] = useState<AdminNotice[]>([]);

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

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    const urls = [
      "/api/reviews?status=PENDING&perPage=1",
      "/api/payments/returns?status=RETURN_REQUESTED&perPage=1",
      "/api/orders/summary",
      "/api/reports/inventory",
      "/api/enquiries?status=NEW&perPage=1",
    ];
    const payloads = await Promise.all(urls.map(fetchNoticeData));
    const availableCount = payloads.filter((payload) => payload !== null).length;
    const orderSummary = objectFrom(payloads[2]);
    const inventoryPayload = payloads[3];
    const inventoryData = Array.isArray(inventoryPayload)
      ? inventoryPayload
      : inventoryPayload && typeof inventoryPayload === "object" && Array.isArray((inventoryPayload as Record<string, unknown>).data)
        ? (inventoryPayload as { data: unknown[] }).data
        : [];
    const candidates: AdminNotice[] = [
      { key: "low-stock", title: "Low stock items", detail: "At or below their reorder threshold", count: inventoryData.length, href: "/stock" },
      { key: "failed-payments", title: "Failed payments", detail: "Orders may need follow-up", count: typeof orderSummary.failedPayments === "number" ? orderSummary.failedPayments : 0, href: "/orders?paymentStatus=FAILED" },
      { key: "returns", title: "Returns to review", detail: "Customer return requests", count: totalFrom(payloads[1]), href: "/payments/returns?status=RETURN_REQUESTED" },
      { key: "reviews", title: "Reviews to moderate", detail: "Awaiting approval", count: totalFrom(payloads[0]), href: "/reviews" },
      { key: "enquiries", title: "New customer enquiries", detail: "Awaiting a response", count: totalFrom(payloads[4]), href: "/support-content" },
    ];
    setNotices(candidates.filter((notice) => notice.count > 0));
    setNotificationError(availableCount ? "" : "Could not load admin notifications.");
    setNotificationsLoaded(true);
    setNotificationsLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    const timer = window.setInterval(() => void loadNotifications(), 60_000);
    return () => { window.clearTimeout(initialLoad); window.clearInterval(timer); };
  }, [loadNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return;
    function closeNotifications(event: PointerEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }
    document.addEventListener("pointerdown", closeNotifications);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeNotifications);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationsOpen]);

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

  useEffect(() => {
    const term = searchInput.trim();
    if (term.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      const params = new URLSearchParams({ q: term, page: "1", perPage: "5" });
      const results = await Promise.allSettled([
        fetch(`/api/products?${params}`, { cache: "no-store", signal: controller.signal }),
        fetch(`/api/orders?${params}`, { cache: "no-store", signal: controller.signal }),
        fetch(`/api/customers?${params}`, { cache: "no-store", signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;

      let successful = 0;
      const hits: SearchHit[] = [];
      const payloads = await Promise.all(results.map(async (result) => {
        if (result.status !== "fulfilled" || !result.value.ok) return null;
        successful++;
        return result.value.json().catch(() => null);
      }));
      if (successful === 0) {
        setSearchError("Search is temporarily unavailable.");
      } else {
        const products = listFrom<{ id: number; title: string; sku?: string | null; slug?: string }>(payloads[0]);
        const orders = listFrom<{ id: number; orderNumber: string; email: string; status: string }>(payloads[1]);
        const customers = listFrom<{ id: number; firstName: string; lastName: string; email: string; phone?: string | null }>(payloads[2]);
        hits.push(
          ...products.map((item) => ({ id: item.id, kind: "Product" as const, title: item.title, detail: item.sku ? `SKU ${item.sku}` : item.slug ?? "Product", href: `/products/${item.id}` })),
          ...orders.map((item) => ({ id: item.id, kind: "Order" as const, title: item.orderNumber, detail: `${item.email} · ${item.status.toLowerCase().replaceAll("_", " ")}`, href: `/orders?globalSearch=${encodeURIComponent(term)}&open=${item.id}` })),
          ...customers.map((item) => ({ id: item.id, kind: "Customer" as const, title: `${item.firstName} ${item.lastName}`.trim() || item.email, detail: item.email || item.phone || "Customer", href: `/customers?globalSearch=${encodeURIComponent(term)}&open=${item.id}` })),
        );
        setSearchHits(hits);
        setActiveHit(hits.length ? 0 : -1);
      }
      setSearching(false);
    }, 250);

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [searchInput]);

  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!searchOpen && !mobileSearchOpen) return;
    function closeOnOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (!searchAreaRef.current?.contains(target) && !mobileSearchPanelRef.current?.contains(target)) {
        setSearchOpen(false);
        setMobileSearchOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setSearchOpen(false); setMobileSearchOpen(false); }
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [searchOpen, mobileSearchOpen]);

  function openHit(index = activeHit) {
    const hit = searchHits[index];
    if (!hit) return;
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setSearchInput("");
    setSearchHits([]);
    setSearchError("");
    setSearching(false);
    setActiveHit(-1);
    router.push(hit.href);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && searchHits.length) {
      event.preventDefault();
      setActiveHit((index) => (index + 1) % searchHits.length);
    } else if (event.key === "ArrowUp" && searchHits.length) {
      event.preventDefault();
      setActiveHit((index) => (index <= 0 ? searchHits.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeHit >= 0) {
      event.preventDefault();
      openHit();
    }
  }

  function searchResults(mobile = false) {
    const Icon = { Product: Package, Order: ShoppingCart, Customer: Users };
    return <div id="global-search-results" className={`${mobile ? "static mt-2 w-full" : "absolute right-0 top-[calc(100%+8px)] w-[min(420px,calc(100vw-32px))]"} z-50 overflow-hidden rounded-lg border border-border bg-surface shadow-panel`} role="listbox" aria-label="Global search results">
      {searching ? <div className="flex items-center gap-2 px-4 py-3 text-xs text-ink-muted"><LoaderCircle className="h-4 w-4 animate-spin" />Searching products, orders and customers…</div> : searchError ? <p className="px-4 py-3 text-xs text-danger-tint-ink">{searchError}</p> : searchHits.length ? <>
        {searchHits.map((hit, index) => {
          const ItemIcon = Icon[hit.kind];
          return <Link key={`${hit.kind}-${hit.id}`} id={`global-search-result-${index}`} role="option" aria-selected={activeHit === index} href={hit.href} onMouseEnter={() => setActiveHit(index)} onClick={() => { setSearchOpen(false); setMobileSearchOpen(false); setSearchInput(""); setSearchHits([]); setSearchError(""); setSearching(false); setActiveHit(-1); }} className={`flex min-w-0 items-center gap-3 px-3 py-2.5 ${activeHit === index ? "bg-neutral-tint" : "hover:bg-canvas"}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-canvas text-ink-muted"><ItemIcon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1 text-left"><span className="block truncate text-xs font-semibold text-ink">{hit.title}</span><span className="mt-0.5 block truncate text-[10.5px] text-ink-muted">{hit.detail}</span></span>
            <span className="shrink-0 text-[10px] font-semibold text-ink-faint">{hit.kind}</span>
          </Link>;
        })}
      </> : searchInput.trim().length >= 2 ? <p className="px-4 py-3 text-xs text-ink-muted">No matching products, orders or customers.</p> : <p className="px-4 py-3 text-xs text-ink-muted">Type at least 2 characters to search.</p>}
      <div className="border-t border-border px-3 py-2 text-[10px] text-ink-faint">Use ↑ ↓ to navigate · Enter to open · Esc to close</div>
    </div>;
  }

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
  const notificationCount = notices.reduce((sum, notice) => sum + notice.count, 0);
  const notificationIcons = { "low-stock": Package, "failed-payments": AlertTriangle, returns: RotateCcw, reviews: Star, enquiries: Mail };

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

      <div ref={searchAreaRef} className="ml-auto flex items-center gap-2 sm:gap-3">
        <label className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            aria-label="Search products, orders and customers"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={searchOpen && searchInput.trim().length >= 2}
            aria-controls="global-search-results"
            aria-activedescendant={activeHit >= 0 ? `global-search-result-${activeHit}` : undefined}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => { setSearchInput(event.target.value); setSearchHits([]); setSearchError(""); setSearching(event.target.value.trim().length >= 2); setActiveHit(-1); setSearchOpen(true); }}
            onKeyDown={onSearchKeyDown}
            value={searchInput}
            placeholder="Search products, orders, customers…"
            className="h-9 w-56 rounded-md border border-border bg-canvas pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-accent-strong focus:bg-surface focus:ring-2 focus:ring-accent-tint-border md:w-72"
          />
          {searchOpen && !mobileSearchOpen && searchInput.trim().length >= 2 ? searchResults() : null}
        </label>

        <button
          type="button"
          aria-label="Search"
          onClick={() => { setMobileSearchOpen(true); setSearchOpen(true); }}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-neutral-tint sm:hidden"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        <a
          href={STOREFRONT_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open storefront in a new tab"
          title="Open storefront in a new tab"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-neutral-tint"
        >
          <ExternalLink className="h-[18px] w-[18px]" />
        </a>

        <div ref={notificationRef} className="relative">
          <button type="button" onClick={() => { setNotificationsOpen((open) => !open); setMenuOpen(false); }} aria-label={notificationCount ? `Notifications, ${notificationCount} items need attention` : "Notifications"} aria-haspopup="dialog" aria-expanded={notificationsOpen} className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-neutral-tint">
            <Bell className="h-[18px] w-[18px]" />
            {notificationCount > 0 ? <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white ring-2 ring-surface">{notificationCount > 99 ? "99+" : notificationCount}</span> : null}
          </button>
          {notificationsOpen ? <section role="dialog" aria-label="Admin notifications" className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
            <header className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="text-[13px] font-semibold text-ink">Needs attention</h2><p className="mt-0.5 text-[10.5px] text-ink-muted">{notificationCount ? `${notificationCount} open items` : "Live admin work queues"}</p></div><button type="button" onClick={() => void loadNotifications()} disabled={notificationsLoading} aria-label="Refresh notifications" title="Refresh notifications" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${notificationsLoading ? "animate-spin" : ""}`} /></button></header>
            {notificationError ? <p role="alert" className="border-b border-danger-tint-border bg-danger-tint px-4 py-2.5 text-xs text-danger-tint-ink">{notificationError}</p> : null}
            {notificationsLoading && !notificationsLoaded ? <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-ink-muted"><LoaderCircle className="h-4 w-4 animate-spin" />Loading notifications…</div> : notices.length ? <ul className="max-h-[min(420px,65vh)] divide-y divide-border overflow-y-auto">{notices.map((notice) => { const NoticeIcon = notificationIcons[notice.key as keyof typeof notificationIcons]; return <li key={notice.key}><Link href={notice.href} onClick={() => setNotificationsOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-tint text-accent-tint-ink"><NoticeIcon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">{notice.title}</span><span className="mt-0.5 block truncate text-[10.5px] text-ink-muted">{notice.detail}</span></span><span className="min-w-7 rounded-full bg-danger-tint px-2 py-1 text-center text-[11px] font-bold tabular-nums text-danger-tint-ink">{notice.count > 999 ? "999+" : notice.count}</span></Link></li>; })}</ul> : <div className="flex flex-col items-center px-5 py-9 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-positive-tint text-positive-tint-ink"><CheckCheck className="h-5 w-5" /></span><p className="mt-3 text-xs font-semibold text-ink">You’re all caught up</p><p className="mt-1 text-[11px] text-ink-muted">No open admin items right now.</p></div>}
            <footer className="border-t border-border px-4 py-2 text-[10px] text-ink-faint">Queue counts refresh automatically every minute.</footer>
          </section> : null}
        </div>

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
      {mobileSearchOpen ? <div ref={mobileSearchPanelRef} className="fixed inset-x-0 top-16 z-40 border-b border-border bg-surface p-3 shadow-panel sm:hidden"><div className="flex items-center gap-2"><label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input ref={mobileSearchRef} type="search" aria-label="Search products, orders and customers" role="combobox" aria-autocomplete="list" aria-expanded={searchInput.trim().length >= 2} aria-controls="global-search-results" aria-activedescendant={activeHit >= 0 ? `global-search-result-${activeHit}` : undefined} onChange={(event) => { setSearchInput(event.target.value); setSearchHits([]); setSearchError(""); setSearching(event.target.value.trim().length >= 2); setActiveHit(-1); setSearchOpen(true); }} onKeyDown={onSearchKeyDown} value={searchInput} placeholder="Search products, orders, customers…" className="h-10 w-full rounded-md border border-border bg-canvas pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong" /></label><button type="button" aria-label="Close search" onClick={() => setMobileSearchOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-neutral-tint"><X className="h-4 w-4" /></button></div>{searchInput.trim().length >= 2 ? searchResults(true) : <p className="px-1 pt-2 text-xs text-ink-muted">Type at least 2 characters to search.</p>}</div> : null}
    </header>
  );
}
