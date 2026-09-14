import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { AppShell } from "@/components/shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "UK Computer Shop · Admin",
  description: "Back-office admin panel for UK Computer Shop.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          THESIS: Operational clarity over decoration — a structural dark sidebar and
          flat, data-first cards refuse the vendor-dashboard cliché of scattered
          gradient KPI tiles and sparkline chrome.
          OWN-WORLD: near-black navy sidebar with one amber-gold accent; white,
          hairline-bordered cards on an off-white canvas; system sans (Geist) with
          tabular numerals and monospace technical keys; green/amber/red status only
          as tinted pills, never solid blocks.
          STORY: staff open the dashboard, see what needs attention first (stock,
          payments, moderation), and act via the module the alert points to.
          FIRST VIEWPORT: fixed sidebar, search/bell topbar, H1 + Export, two stacked
          alert banners, 8-card KPI grid below.
          FORM: carried wholesale from the user-pinned reference (FixHelp24 admin
          prototype — a-dashboard.html / a-users.html / a-categories.html); a
          brief-pinned direction, so no concept-seed roll was run.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the
          finish review, the verdict, DESIGN.md, and every shipping raster carrying
          its provenance.
        */}
        <TooltipProvider delay={250}>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
