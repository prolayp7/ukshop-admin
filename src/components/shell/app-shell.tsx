"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DesktopSidebar, MobileSidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { SessionExpiryGuard } from "@/components/auth/session-expiry-guard";

const DEFAULT_BRAND_NAME = "UK Computer Shop";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage) return;

    let active = true;
    let brandNameUpdated = false;
    const loadBrandName = async () => {
      try {
        const response = await fetch("/api/settings/general", { cache: "no-store" });
        if (!response.ok) throw new Error("General settings could not be loaded.");
        const payload = (await response.json()) as { data?: { brandName?: unknown } };
        if (active && !brandNameUpdated && typeof payload.data?.brandName === "string") {
          setBrandName(payload.data.brandName.trim() || DEFAULT_BRAND_NAME);
        }
      } catch (error) {
        console.error("Could not load the admin brand name.", error);
      }
    };

    const onBrandNameUpdated = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (typeof name === "string") {
        brandNameUpdated = true;
        setBrandName(name.trim() || DEFAULT_BRAND_NAME);
      }
    };

    void loadBrandName();
    window.addEventListener("ukshop:brand-name-updated", onBrandNameUpdated);
    return () => {
      active = false;
      window.removeEventListener("ukshop:brand-name-updated", onBrandNameUpdated);
    };
  }, [isLoginPage]);

  useEffect(() => {
    document.title = `${brandName} · Admin`;
  }, [brandName]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // The Homepage page's live preview panel wants as much width as it can
  // get, so the sidebar collapses to icons-only there rather than a manual
  // toggle nobody would remember to use.
  const sidebarCollapsed = pathname === "/homepage";

  return (
    <div className="flex min-h-screen bg-canvas">
      <SessionExpiryGuard />
      <DesktopSidebar collapsed={sidebarCollapsed} brandName={brandName} />
      <MobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} brandName={brandName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
