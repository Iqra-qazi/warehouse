export default function StatCard({ title, value, badge }) {
  return (
    <article className="app-stat-card rounded-lg border border-app-border bg-app-surface p-5 shadow-[0_2px_8px_rgba(23,43,64,0.06)]">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-app-muted">{title}</p>
        {value === undefined ? (
          <div aria-label="Loading value" className="mt-3 h-8 w-24 animate-pulse rounded-md bg-app-subtle" />
        ) : (
          <p className="mt-3 font-display text-[28px] font-semibold tabular-nums tracking-tight text-app-text">
            {value ?? 0}
          </p>
        )}
        {badge && <div className="mt-2">{badge}</div>}
      </div>
    </article>
  );
}
