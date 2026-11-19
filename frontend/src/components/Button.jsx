const variantClasses = {
  primary: "bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover focus-visible:ring-accent",
  secondary: "border border-app-border bg-app-surface text-app-text hover:border-accent/50 hover:bg-app-subtle focus-visible:ring-accent",
  danger: "bg-danger-solid text-danger-contrast hover:brightness-95 focus-visible:ring-danger",
  ghost: "bg-transparent text-app-text hover:bg-app-subtle focus-visible:ring-accent",
};

const sizeClasses = {
  sm: "px-3 text-xs",
  md: "px-3.5 text-sm",
  lg: "px-4 text-sm",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  type = "button",
  className = "",
  ...buttonProps
}) {
  return (
    <button
      {...buttonProps}
      className={`app-button inline-flex h-10 items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${
        variantClasses[variant] ?? variantClasses.primary
      } ${sizeClasses[size] ?? sizeClasses.md} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      type={type}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
        />
      )}
      {children}
    </button>
  );
}
