const sizes = {
  sm: "size-8 text-xs",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
};

function getInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "?";
}

export default function Avatar({ image, name, size = "md", className = "" }) {
  const shape = sizes[size] || sizes.md;
  if (image) {
    return <img alt={name || ""} className={`${shape} shrink-0 rounded-full border border-palette-slate bg-app-subtle object-cover ${className}`} src={image} />;
  }
  return (
    <span aria-label={name || "User"} className={`${shape} flex shrink-0 items-center justify-center rounded-full bg-app-subtle font-medium text-app-muted ${className}`}>
      {getInitials(name)}
    </span>
  );
}
