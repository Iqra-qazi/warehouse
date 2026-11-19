export default function EmptyState({ message = "No records found.", title, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-8 text-center ${className}`}>
      <span className="mb-2 text-app-muted">
        <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M8 7h8M8 12h8m-8 5h5m-8 4h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      </span>
      {title && <h3 className="mb-1 text-sm font-semibold text-app-text">{title}</h3>}
      <p className="text-sm text-app-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
