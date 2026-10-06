"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";

// Builds a rounded-corner clip-path polygon whose left edge stays straight and whose
// right edge tapers inward toward the bottom, approximating a true circular corner
// radius (in px) with a short arc of line segments so it reads as smoothly rounded.
function tapedPanelClipPath(radius: number, bottomTaper: string, segments = 10) {
  const arc = (cx: string, cy: string, startDeg: number, endDeg: number) =>
    Array.from({ length: segments + 1 }, (_, i) => {
      const deg = startDeg + ((endDeg - startDeg) * i) / segments;
      const rad = (deg * Math.PI) / 180;
      const dx = (radius * Math.cos(rad)).toFixed(2);
      const dy = (radius * Math.sin(rad)).toFixed(2);
      return `calc(${cx} + ${dx}px) calc(${cy} + ${dy}px)`;
    });

  const points = [
    ...arc(`${radius}px`, `${radius}px`, 180, 270), // top-left
    ...arc(`100% - ${radius}px`, `${radius}px`, 270, 360), // top-right
    ...arc(`100% - ${bottomTaper} - ${radius}px`, `100% - ${radius}px`, 0, 90), // bottom-right (tapered)
    ...arc(`${radius}px`, `100% - ${radius}px`, 90, 180), // bottom-left
  ];

  return `polygon(${points.join(", ")})`;
}

const PANEL_CLIP_PATH = tapedPanelClipPath(40, "7%");

const OPS_FACTS = [
  {
    icon: ShieldCheck,
    title: "Authorised staff access only",
    body: "All sign-ins are logged and monitored",
  },
  {
    icon: PackageCheck,
    title: "Stock synced in real time",
    body: "Every channel reflects the same inventory",
  },
  {
    icon: Truck,
    title: "Orders tracked end to end",
    body: "From checkout to doorstep, always visible",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showResetHint, setShowResetHint] = useState(false);
  const [factIndex, setFactIndex] = useState(0);
  const activeFact = OPS_FACTS[factIndex];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "We couldn't sign you in. Please try again.");
        return;
      }

      const returnPath = safeReturnPath(new URLSearchParams(window.location.search).get("next"));
      router.replace(returnPath);
      router.refresh();
    } catch {
      setError("We couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-stretch bg-canvas p-3 lg:p-4">
      <section
        className="relative hidden w-[46%] shrink-0 overflow-hidden bg-[#050c18] px-10 py-9 text-white lg:flex lg:flex-col lg:justify-between xl:px-14 [filter:drop-shadow(0_18px_40px_rgba(10,37,64,0.35))]"
        style={{ clipPath: PANEL_CLIP_PATH }}
      >
        <Image
          src="/bg.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 46vw, 0px"
          className="pointer-events-none -z-20 object-cover object-[center_46%]"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,12,24,0.70)_0%,rgba(5,12,24,0.58)_44%,rgba(5,12,24,0.94)_100%)]" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-ink">
              <LockKeyhole className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="text-[14.5px] font-semibold tracking-[-0.01em]">UK Computer Shop</span>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-[0.01em] text-sidebar-ink">
            Operations desk
          </span>
        </div>

        <div className="relative max-w-[31rem] pb-28">
          <h1 className="max-w-[11ch] text-balance text-[clamp(2.8rem,4.2vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            Your store, under control.
          </h1>
          <p className="mt-7 max-w-[39ch] text-[14.5px] leading-7 text-sidebar-ink">
            Manage stock, orders, customers and content from one secure operations desk.
          </p>
        </div>

        <div className="relative mr-[calc(7%_+_16px)] flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-white">
            <activeFact.icon className="size-4 text-accent" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{activeFact.title}</p>
            <p className="truncate text-[11.5px] leading-5 text-sidebar-ink">{activeFact.body}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setFactIndex((value) => (value - 1 + OPS_FACTS.length) % OPS_FACTS.length)}
              className="flex size-8 items-center justify-center rounded-full border border-white/15 text-sidebar-ink transition-colors hover:border-white/35 hover:text-white"
              aria-label="Previous"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setFactIndex((value) => (value + 1) % OPS_FACTS.length)}
              className="flex size-8 items-center justify-center rounded-full border border-white/15 text-sidebar-ink transition-colors hover:border-white/35 hover:text-white"
              aria-label="Next"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <a
          href="https://commons.wikimedia.org/wiki/File:Corsair_4000D_Airflow_mid-tower_ATX_case.tif"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-3 left-10 z-10 text-[9px] text-white/60 underline-offset-2 hover:underline"
        >
          Photo by PJ · Wikimedia Commons · CC BY-SA 4.0
        </a>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-md bg-sidebar text-accent">
              <LockKeyhole className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="text-[14.5px] font-semibold text-ink">UK Computer Shop</span>
          </div>

          <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-accent-strong">Welcome back</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.025em] text-ink">Sign in to admin</h2>
          <p className="mt-2 text-[13.5px] leading-6 text-ink-muted">
            Use your staff account to continue to the operations desk.
          </p>

          <form className="mt-8" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="text-[13px] font-semibold text-ink-secondary">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                autoFocus
                placeholder="you@company.co.uk"
                className="mt-2 h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-[14px] text-ink shadow-card outline-none transition-[border-color,box-shadow] placeholder:text-ink-faint focus:border-accent-strong focus:ring-3 focus:ring-accent-tint-border/60"
              />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[13px] font-semibold text-ink-secondary">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetHint((value) => !value)}
                  className="text-[12.5px] font-medium text-accent-strong transition-colors hover:text-accent"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 pr-11 text-[14px] text-ink shadow-card outline-none transition-[border-color,box-shadow] placeholder:text-ink-faint focus:border-accent-strong focus:ring-3 focus:ring-accent-tint-border/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-ink-muted transition-colors hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-[17px]" /> : <Eye className="size-[17px]" />}
                </button>
              </div>
              {showResetHint ? (
                <p className="mt-2 text-[12.5px] leading-5 text-ink-muted">
                  Password resets are handled by your system administrator — reach out to them directly.
                </p>
              ) : null}
            </div>

            {error ? (
              <div role="alert" className="mt-5 rounded-md bg-danger-tint px-3.5 py-3 text-[13px] leading-5 text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-linear-to-r from-accent to-accent-strong px-4 text-[13.5px] font-semibold text-accent-ink shadow-[0_10px_24px_-10px_rgb(11_100_214/0.55)] transition-[filter,transform] hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-ink-faint">
            Having trouble signing in? Contact your system administrator.
          </p>
        </div>
      </section>
    </main>
  );
}
