import { useEffect } from "react";

export default function PageHeader({ title, subtitle, action }) {
  const description = subtitle || `Manage ${String(title || "records").toLowerCase()}.`;

  useEffect(() => {
    document.title = `${title || "Dashboard"} | Inventory`;
  }, [title]);

  return (
    <div className="app-section-enter mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-app-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-app-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
