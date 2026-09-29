export type ActivityItem = {
  key: string;
  title: string;
  actor: string;
  detail: string;
  time: string;
  sortAt: string;
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export function ActivityFeed({ items, loading }: { items: ActivityItem[]; loading: boolean }) {
  if (loading) return <p className="p-5 text-[13px] text-ink-muted">Loading…</p>;
  if (!items.length) return <p className="p-5 text-[13px] text-ink-muted">No recent activity.</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((a) => (
        <li key={a.key} className="flex items-start gap-3.5 px-5 py-3.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-[11px] font-semibold text-ink-secondary">
            {initials(a.actor)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-ink">{a.title}</p>
            <p className="mt-1 truncate text-[12.5px] text-ink-muted">
              {a.actor} <span className="text-ink-faint">·</span> {a.detail}
            </p>
          </div>
          <span className="shrink-0 pt-0.5 text-[12px] tabular-nums text-ink-faint">{a.time}</span>
        </li>
      ))}
    </ul>
  );
}
