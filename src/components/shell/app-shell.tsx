"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DesktopSidebar, MobileSidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { SessionExpiryGuard } from "@/components/auth/session-expiry-guard";

const DEFAULT_BRAND_NAME = "UK Computer Shop";
const BRAND_CACHE_KEY = "ukshop-admin:brand-name";
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const AdminBrandNameContext = createContext(DEFAULT_BRAND_NAME);

export function useAdminBrandName() {
  return useContext(AdminBrandNameContext);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  useIsomorphicLayoutEffect(() => {
    let active = true;
    let brandNameUpdated = false;
    let cachedBrandName: string | null = null;
    try {
      cachedBrandName = window.localStorage.getItem(BRAND_CACHE_KEY);
    } catch (error) {
      console.error("Could not read the cached store brand name.", error);
    }

    if (cachedBrandName !== null) {
      setBrandName(cachedBrandName.trim() || DEFAULT_BRAND_NAME);
      brandNameUpdated = true;
    }

    const loadBrandName = async () => {
      try {
        const response = await fetch("/api/storefront/settings/general", { cache: "no-store" });
        if (!response.ok) throw new Error("Store branding could not be loaded.");
        const payload = (await response.json()) as { data?: { brandName?: unknown } };
        if (active && !brandNameUpdated && typeof payload.data?.brandName === "string") {
          const name = payload.data.brandName.trim() || DEFAULT_BRAND_NAME;
          try {
            window.localStorage.setItem(BRAND_CACHE_KEY, name);
          } catch (error) {
            console.error("Could not cache the store brand name.", error);
          }
          setBrandName(name);
        }
      } catch (error) {
        console.error("Could not load the store brand name.", error);
      }
    };

    const onBrandNameUpdated = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (typeof name === "string") {
        brandNameUpdated = true;
        const updatedName = name.trim() || DEFAULT_BRAND_NAME;
        try {
          window.localStorage.setItem(BRAND_CACHE_KEY, updatedName);
        } catch (error) {
          console.error("Could not cache the updated store brand name.", error);
        }
        setBrandName(updatedName);
      }
    };

    const onBrandNameStorage = (event: StorageEvent) => {
      if (event.key !== BRAND_CACHE_KEY) return;
      brandNameUpdated = true;
      setBrandName(event.newValue?.trim() || DEFAULT_BRAND_NAME);
    };

    if (cachedBrandName === null) void loadBrandName();
    window.addEventListener("admin:brand-name-updated", onBrandNameUpdated);
    window.addEventListener("storage", onBrandNameStorage);
    return () => {
      active = false;
      window.removeEventListener("admin:brand-name-updated", onBrandNameUpdated);
      window.removeEventListener("storage", onBrandNameStorage);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    const title = `${brandName} · Admin`;
    const syncTitle = () => {
      if (document.title !== title) document.title = title;
    };

    syncTitle();
    const observer = new MutationObserver(syncTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [brandName]);

  // The Homepage page's live preview panel wants as much width as it can
  // get, so the sidebar collapses to icons-only there rather than a manual
  // toggle nobody would remember to use.
  const sidebarCollapsed = pathname === "/homepage";

  if (isLoginPage) {
    return <AdminBrandNameContext.Provider value={brandName}>{children}</AdminBrandNameContext.Provider>;
  }

  return (
    <AdminBrandNameContext.Provider value={brandName}>
      <div className="flex min-h-screen bg-canvas">
        <SessionExpiryGuard />
        <DesktopSidebar collapsed={sidebarCollapsed} brandName={brandName} />
        <MobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} brandName={brandName} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
        </div>
      </div>
    </AdminBrandNameContext.Provider>
  );
}
