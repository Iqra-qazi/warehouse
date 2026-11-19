import { useEffect, useId } from "react";

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
}) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEscape, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="app-fade-in fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-overlay p-4"
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        aria-labelledby={title ? titleId : undefined}
        aria-modal="true"
        className={`app-pop-in my-auto max-h-[calc(100dvh-2rem)] w-full overflow-y-auto ${sizeClasses[size] || sizeClasses.md} rounded-lg border border-app-border bg-app-surface shadow-[0_16px_40px_rgba(0,0,0,0.18)]`}
        role="dialog"
      >
        {(title || onClose) && (
          <header className="flex items-center justify-between gap-4 border-b border-app-border px-5 py-4 sm:px-6">
            {title && (
              <h2 className="text-base font-semibold text-app-text" id={titleId}>
                {title}
              </h2>
            )}
            {onClose && (
              <button
                aria-label="Close dialog"
                className="ml-auto rounded-md p-1 text-app-muted transition-colors hover:bg-app-subtle hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={onClose}
                type="button"
              >
                <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
              </button>
            )}
          </header>
        )}
        <div className="p-4 sm:p-5">{children}</div>
      </section>
    </div>
  );
}
