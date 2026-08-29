"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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

      router.replace("/");
      router.refresh();
    } catch {
      setError("We couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen bg-canvas">
      <section className="relative hidden w-[44%] overflow-hidden bg-sidebar px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_18%_12%,rgba(245,165,36,0.16),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(71,84,103,0.24),transparent_38%)]" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-ink">
            <LockKeyhole className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="text-[14.5px] font-semibold tracking-[-0.01em]">UK Computer Shop</span>
        </div>

        <div className="relative max-w-[31rem] pb-8">
          <h1 className="max-w-[11ch] text-balance text-[clamp(2.8rem,4.2vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            Your store, under control.
          </h1>
          <p className="mt-7 max-w-[39ch] text-[14.5px] leading-7 text-sidebar-ink">
            Manage stock, orders, customers and content from one secure operations desk.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-sidebar-ink">
          <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
          Authorised staff access only
        </div>
      </section>

      <section className="flex min-h-screen flex-1 items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-md bg-sidebar text-accent">
              <LockKeyhole className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="text-[14.5px] font-semibold text-ink">UK Computer Shop</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.025em] text-ink">Sign in to admin</h2>
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
              <label htmlFor="password" className="text-[13px] font-semibold text-ink-secondary">
                Password
              </label>
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
            </div>

            {error ? (
              <div role="alert" className="mt-5 rounded-md bg-danger-tint px-3.5 py-3 text-[13px] leading-5 text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-[13.5px] font-semibold text-white transition-[background-color,transform] hover:bg-[#1d2939] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-65"
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
