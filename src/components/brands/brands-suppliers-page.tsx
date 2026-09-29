"use client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Building2, ChevronLeft, ChevronRight, LoaderCircle, MoreHorizontal, PackageCheck, Pencil, Plus, Search, Tag } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { mediaFileUrl } from "@/lib/media";

type Meta = { page: number; perPage: number; total: number; totalPages: number; summary?: { total: number; enabled: number; productsAssigned: number } };
const PER_PAGE_OPTIONS = [20, 50, 100] as const;
const fieldClass = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-ink outline-none focus:border-accent-strong";
type Item = { id: number; title: string; slug: string; status: "ACTIVE" | "INACTIVE"; _count: { products: number }; city?: string | null; countryCode?: string; logo?: string | null; logoAlt?: string | null };

export function BrandsSuppliersPage() {
	const params = useSearchParams();
	const tab = params.get("tab") === "suppliers" ? "suppliers" : "brands";
	const [items, setItems] = useState<Item[]>([]);
	const [meta, setMeta] = useState<Meta | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [q, setQ] = useState("");
	const [search, setSearch] = useState(""); // debounced copy of q
	const [status, setStatus] = useState("");
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState<number>(20);

	// Switching tab starts that list from scratch.
	useEffect(() => { const timer = window.setTimeout(() => { setQ(""); setSearch(""); setStatus(""); setPage(1); }, 0); return () => clearTimeout(timer); }, [tab]);
	useEffect(() => { const timer = window.setTimeout(() => { setSearch(q.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [q]);

	const load = useCallback(async () => {
		setLoading(true); setError("");
		const query = new URLSearchParams({ page: String(page), perPage: String(perPage) });
		if (search) query.set("q", search);
		if (status) query.set("status", status);
		try {
			const response = await fetch(`/api/catalog/${tab}?${query}`, { cache: "no-store" });
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(typeof payload.message === "string" ? payload.message : `The ${tab} could not be loaded.`);
			setItems(payload.data ?? []); setMeta(payload.meta ?? null);
		} catch (loadError) { setError(loadError instanceof Error ? loadError.message : `The ${tab} could not be loaded.`); } finally { setLoading(false); }
	}, [tab, page, perPage, search, status]);
	useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

	const summary = meta?.summary;
	const from = meta && meta.total ? (meta.page - 1) * meta.perPage + 1 : 0;
	const to = meta ? Math.min(meta.page * meta.perPage, meta.total) : 0;
	const pageButton = "flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint disabled:opacity-40";

	async function toggle(item: Item) {
		const next = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
		const endpoint = tab === "brands" ? "brands" : "suppliers";
		await fetch(`/api/catalog/${endpoint}/${item.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: next }),
		});
		await load();
	}

	return (
		<div>
			<div className="flex items-start justify-between">
				<div>
					<p className="text-xs text-ink-muted">Catalog</p>
					<h1 className="mt-2 text-[22px] font-semibold text-ink">Brands &amp; suppliers</h1>
					<p className="mt-1 text-[13.5px] text-ink-muted">Manage manufacturers and the companies that supply your catalogue.</p>
				</div>
				<Link href={tab === "brands" ? "/brands/new" : "/suppliers/new"} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white">
					<Plus className="h-4 w-4" />Add {tab === "brands" ? "brand" : "supplier"}
				</Link>
			</div>
			<div className="mt-5 flex border-b border-border">
				<Link href="/brands" className={`px-4 py-3 text-xs font-semibold ${tab === "brands" ? "border-b-2 border-ink text-ink" : "text-ink-muted"}`}>Brands</Link>
				<Link href="/brands?tab=suppliers" className={`px-4 py-3 text-xs font-semibold ${tab === "suppliers" ? "border-b-2 border-ink text-ink" : "text-ink-muted"}`}>Suppliers</Link>
			</div>
			<div className="mt-4 grid gap-3 sm:grid-cols-3">
				<Metric icon={tab === "brands" ? Tag : Building2} label={`Total ${tab}`} value={summary?.total ?? 0} />
				<Metric icon={PackageCheck} label="Products assigned" value={summary?.productsAssigned ?? 0} />
				<Metric icon={Building2} label="Enabled" value={summary?.enabled ?? 0} />
			</div>
			{error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
			<section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
				<div className="flex items-center justify-between border-b border-border p-4">
					<h2 className="text-[13.5px] font-semibold text-ink">{tab === "brands" ? "Brands" : "Suppliers"} ({meta?.total ?? 0})</h2>
					<div className="flex flex-wrap items-center gap-2">
					<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Status" className={fieldClass}><option value="">All statuses</option><option value="ACTIVE">Enabled</option><option value="INACTIVE">Disabled</option></select>
					<label className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
						<input value={q} onChange={(event) => setQ(event.target.value)} placeholder={tab === "brands" ? "Search by name" : "Search by name or city"} className="h-9 w-64 rounded-md border border-border-strong pl-9 pr-3 text-xs outline-none" />
					</label>
					</div>
				</div>
				<table className="w-full min-w-[650px] text-left">
					<thead className="bg-canvas text-[10.5px] uppercase tracking-wide text-ink-muted">
						<tr>
							<th className="px-4 py-3">ID</th>
							<th className="px-4 py-3">Name</th>
							{tab === "suppliers" ? <th className="px-4 py-3">Location</th> : null}
							<th className="px-4 py-3 text-center">Products</th>
							<th className="px-4 py-3 text-center">Enabled</th>
							<th className="px-4 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr><td colSpan={6} className="h-36"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" /></td></tr>
						) : items.map((item) => (
							<tr key={item.id} className="hover:bg-canvas">
								<td className="px-4 py-3 font-mono text-xs text-ink-muted">{item.id}</td>
								<td className="px-4 py-3">
									<div className="flex items-center gap-3">
										{tab === "brands" ? (
											<span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-canvas">
												{item.logo ? <Image src={mediaFileUrl(item.logo)} alt={item.logoAlt || ""} width={32} height={32} unoptimized className="h-full w-full object-contain" /> : <Tag aria-hidden="true" className="h-4 w-4 text-ink-muted" />}
											</span>
										) : null}
										<p className="text-[13px] font-semibold text-ink">{item.title}</p>
									</div>
								</td>
								{tab === "suppliers" ? <td className="px-4 py-3 text-xs text-ink-muted">{[item.city, item.countryCode].filter(Boolean).join(", ") || "—"}</td> : null}
								<td className="px-4 py-3 text-center text-xs font-semibold">{item._count.products}</td>
								<td className="px-4 py-3 text-center">
									<button role="switch" aria-checked={item.status === "ACTIVE"} onClick={() => void toggle(item)} className={`relative h-5 w-9 rounded-full ${item.status === "ACTIVE" ? "bg-ink" : "bg-border-strong"}`}>
										<span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${item.status === "ACTIVE" ? "translate-x-4" : "translate-x-0.5"}`} />
									</button>
								</td>
								<td className="px-4 py-3 text-right">
									<DropdownMenu>
										<DropdownMenuTrigger render={<button className="inline-flex h-8 w-8 items-center justify-center rounded-md"><MoreHorizontal className="h-4 w-4" /></button>}>
											<span className="sr-only">Actions</span>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem render={<Link href={`/${tab}/${item.id}/edit`} />}><Pencil />Edit {tab === "brands" ? "brand" : "supplier"}</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</td>
							</tr>
						))}
						{!loading && !items.length ? <tr><td colSpan={6} className="h-36 text-center text-[13px] text-ink-muted">{search || status ? `No ${tab} match these filters.` : `No ${tab} yet.`}</td></tr> : null}
					</tbody>
				</table>
				{meta && meta.total ? (
					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-ink-muted">
						<span>Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{meta.total}</strong></span>
						<div className="flex items-center gap-3">
							<label className="flex items-center gap-2">Rows per page<select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className={fieldClass}>{PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
							<span>Page {meta.page} of {Math.max(meta.totalPages, 1)}</span>
							<button type="button" disabled={meta.page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page" className={pageButton}><ChevronLeft className="h-4 w-4" /></button>
							<button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Next page" className={pageButton}><ChevronRight className="h-4 w-4" /></button>
						</div>
					</div>
				) : null}
			</section>
		</div>
	);
}
function Metric({icon:Icon,label,value}:{icon:typeof Tag;label:string;value:number}){return <div className="rounded-xl border border-border bg-surface p-4 shadow-card"><Icon className="h-4 w-4 text-ink-muted"/><p className="mt-3 text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p><p className="mt-1 text-xl font-semibold text-ink">{value}</p></div>}
