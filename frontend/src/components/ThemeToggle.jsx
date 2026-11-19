import { useTheme } from "../context/ThemeContext.jsx";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const label = theme === "system" ? "system theme" : `${theme} theme`;

  return (
    <button
      aria-label={`Current ${label}; switch to ${nextTheme} theme`}
      className="flex size-9 items-center justify-center rounded-md text-app-muted transition-colors hover:bg-app-subtle hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onClick={() => setTheme(nextTheme)}
      title={`Theme: ${label}`}
      type="button"
    >
      {theme === "dark" ? (
        <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      ) : theme === "light" ? (
        <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />
        </svg>
      ) : (
        <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="13" rx="1.5" /><path d="M8 21h8m-4-4v4" />
        </svg>
      )}
    </button>
  );
}
