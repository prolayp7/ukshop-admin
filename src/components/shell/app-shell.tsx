"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DesktopSidebar, MobileSidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { SessionExpiryGuard } from "@/components/auth/session-expiry-guard";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  // The Homepage page's live preview panel wants as much width as it can
  // get, so the sidebar collapses to icons-only there rather than a manual
  // toggle nobody would remember to use.
  const sidebarCollapsed = pathname === "/homepage";

  return (
    <div className="flex min-h-screen bg-canvas">
      <SessionExpiryGuard />
      <DesktopSidebar collapsed={sidebarCollapsed} />
      <MobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
