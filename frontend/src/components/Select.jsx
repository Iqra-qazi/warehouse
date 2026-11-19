import { useId } from "react";

export default function Select({
  id,
  label,
  hint,
  error,
  className = "",
  wrapperClassName = "",
  children,
  ...selectProps
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const describedBy = [
    hint ? `${selectId}-hint` : "",
    error ? `${selectId}-error` : "",
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label className="mb-1.5 block text-[12.5px] font-medium text-app-text" htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        {...selectProps}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`block h-9 w-full rounded-md border bg-app-surface px-3 text-sm text-app-text outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-app-subtle ${
          error ? "border-danger" : "border-app-border"
        } ${className}`}
        id={selectId}
      >
        {children}
      </select>
      {hint && (
        <p className="mt-1 text-xs text-app-muted" id={`${selectId}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs text-danger" id={`${selectId}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
