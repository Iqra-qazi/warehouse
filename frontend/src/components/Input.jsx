import { useId } from "react";

export default function Input({
  id,
  label,
  hint,
  error,
  className = "",
  wrapperClassName = "",
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const describedBy = [
    hint ? `${inputId}-hint` : "",
    error ? `${inputId}-error` : "",
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label className="mb-1.5 block text-[12.5px] font-medium text-app-text" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        {...inputProps}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`block h-9 w-full rounded-md border bg-app-surface px-3 text-sm text-app-text outline-none transition-colors duration-150 placeholder:text-app-muted focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-app-subtle ${
          error ? "border-danger" : "border-app-border"
        } ${className}`}
        id={inputId}
      />
      {hint && (
        <p className="mt-1 text-xs text-app-muted" id={`${inputId}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs text-danger" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
