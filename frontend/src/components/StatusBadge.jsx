const statusStyles = {
  Pending: "bg-warning-soft text-warning",
  Processing: "bg-info-soft text-info",
  Completed: "bg-success-soft text-success",
  Cancelled: "bg-danger-soft text-danger",
  "In Stock": "bg-success-soft text-success",
  "Low Stock": "bg-warning-soft text-warning",
  "Out of Stock": "bg-danger-soft text-danger",
  Approved: "bg-success-soft text-success",
  Rejected: "bg-danger-soft text-danger",
  "stock-in": "bg-success-soft text-success",
  "stock-out": "bg-danger-soft text-danger",
};

export default function StatusBadge({ status }) {
  const label = status || "Unknown";

  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[label] || "bg-app-subtle text-app-muted"}`}>
      {label}
    </span>
  );
}
