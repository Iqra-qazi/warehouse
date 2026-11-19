import StatusBadge from "./StatusBadge.jsx";

export default function OrderStatusTimeline({ status = "Pending" }) {
  const cancelled = status === "Cancelled";
  const steps = ["Pending", "Processing", "Completed"];
  const activeIndex = cancelled ? -1 : steps.indexOf(status);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => (
        <div className="flex items-center gap-2" key={step}>
          <span className={`rounded px-2 py-1 text-xs font-medium ${
            cancelled ? "bg-app-subtle text-app-muted" :
            index < activeIndex ? "bg-accent-soft text-accent" :
              index === activeIndex ? "bg-accent-soft text-accent" : "bg-app-subtle text-app-muted"
          }`}>{step}</span>
          {index < steps.length - 1 && <span className="text-app-muted">›</span>}
        </div>
      ))}
      {cancelled && <><span className="text-app-muted">›</span><StatusBadge status="Cancelled" /></>}
    </div>
  );
}
