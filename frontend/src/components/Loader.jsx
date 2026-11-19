const sizes = {
  sm: "size-5 border-2",
  md: "size-8 border-4",
  lg: "size-10 border-4",
};

export default function Loader({ label = "Loading", size = "lg", fullScreen = true, className = "" }) {
  return (
    <div
      className={`flex items-center justify-center ${fullScreen ? "min-h-screen" : "min-h-24"} ${className}`}
      role="status"
      aria-label={label}
    >
      <span aria-hidden="true" className={`${sizes[size] || sizes.lg} animate-spin rounded-full border-2 border-app-border border-t-accent`} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
