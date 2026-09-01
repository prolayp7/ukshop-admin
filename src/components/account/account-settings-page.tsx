"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";

type Account = { id: number; name: string; email: string; roleId: number };

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent-strong focus:ring-2 focus:ring-accent-tint-border";

function messageFrom(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(" ");
  }
  return fallback;
}

export function AccountSettingsPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(messageFrom(payload, "Unable to load your account."));
        const value = (payload.data ?? payload) as Account;
        setAccount(value); setName(value.name); setEmail(value.email);
      })
      .catch((error: Error) => setProfileMessage({ tone: "error", text: error.message }))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setSavingProfile(true); setProfileMessage(null);
    try {
      const response = await fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(messageFrom(payload, "Unable to update your profile."));
      const value = (payload.data ?? payload) as Account; setAccount(value); setName(value.name); setEmail(value.email);
      setProfileMessage({ tone: "success", text: "Profile details updated." });
    } catch (error) { setProfileMessage({ tone: "error", text: error instanceof Error ? error.message : "Unable to update your profile." }); }
    finally { setSavingProfile(false); }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault(); setPasswordMessage(null);
    if (newPassword !== confirmPassword) return setPasswordMessage({ tone: "error", text: "New passwords do not match." });
    setSavingPassword(true);
    try {
      const response = await fetch("/api/auth/me/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(messageFrom(payload, "Unable to change your password."));
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordMessage({ tone: "success", text: "Password updated successfully." });
    } catch (error) { setPasswordMessage({ tone: "error", text: error instanceof Error ? error.message : "Unable to change your password." }); }
    finally { setSavingPassword(false); }
  }

  return <div className="mx-auto w-full max-w-5xl">
    <div className="mb-6"><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Account settings</h1><p className="mt-1 text-[13.5px] text-ink-muted">Manage your personal admin profile and sign-in security.</p></div>
    {loading ? <div className="flex h-52 items-center justify-center rounded-xl border border-border bg-surface"><LoaderCircle className="h-5 w-5 animate-spin text-accent" /></div> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <form onSubmit={saveProfile} className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <div className="flex items-start gap-3 border-b border-border p-5"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-tint text-accent-strong"><UserRound className="h-[18px] w-[18px]" /></span><div><h2 className="text-[14px] font-semibold text-ink">Profile details</h2><p className="mt-0.5 text-xs text-ink-muted">Shown across the administration workspace.</p></div></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-[13px] font-semibold text-ink-secondary">Full name<input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></label><label className="text-[13px] font-semibold text-ink-secondary">Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></label></div>
          <FormFooter message={profileMessage}><button disabled={savingProfile || !name.trim() || !email.trim()} className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-[13px] font-semibold text-white hover:bg-accent-strong disabled:opacity-50">{savingProfile ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save profile</button></FormFooter>
        </form>
        <form onSubmit={savePassword} className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <div className="flex items-start gap-3 border-b border-border p-5"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-tint text-accent-strong"><KeyRound className="h-[18px] w-[18px]" /></span><div><h2 className="text-[14px] font-semibold text-ink">Change password</h2><p className="mt-0.5 text-xs text-ink-muted">Use at least 10 characters and avoid reused passwords.</p></div></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-[13px] font-semibold text-ink-secondary sm:col-span-2">Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} /></label><label className="text-[13px] font-semibold text-ink-secondary">New password<input required minLength={10} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} /></label><label className="text-[13px] font-semibold text-ink-secondary">Confirm new password<input required minLength={10} type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} /></label></div>
          <FormFooter message={passwordMessage}><button disabled={savingPassword || !currentPassword || newPassword.length < 10 || !confirmPassword} className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-[13px] font-semibold text-white hover:bg-accent-strong disabled:opacity-50">{savingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Update password</button></FormFooter>
        </form>
      </div>
      <aside className="h-fit rounded-xl border border-border bg-surface p-5 shadow-card"><ShieldCheck className="h-5 w-5 text-positive" /><h2 className="mt-3 text-[13.5px] font-semibold text-ink">Your admin account</h2><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-ink-muted">Account ID</dt><dd className="mt-0.5 font-mono font-medium text-ink">{account?.id ?? "—"}</dd></div><div><dt className="text-ink-muted">Access status</dt><dd className="mt-1 inline-flex rounded-full bg-positive-tint px-2 py-0.5 font-semibold text-positive-tint-ink ring-1 ring-inset ring-positive-tint-border">Active</dd></div></dl></aside>
    </div>}
  </div>;
}

function FormFooter({ message, children }: { message: { tone: "success" | "error"; text: string } | null; children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 border-t border-border bg-canvas px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div aria-live="polite">{message ? <p className={`inline-flex items-center gap-1.5 text-xs font-medium ${message.tone === "success" ? "text-positive-tint-ink" : "text-danger-tint-ink"}`}>{message.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : null}{message.text}</p> : null}</div>{children}</div>;
}
