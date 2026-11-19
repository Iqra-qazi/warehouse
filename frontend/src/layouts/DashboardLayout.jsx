import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import UserMenu from "../components/UserMenu.jsx";

function readCollapsedPreference() {
  try {
    return window.localStorage.getItem("inventory-sidebar-collapsed") === "true";
  } catch {
    return false;
  }
}

export default function DashboardLayout({ links = [], title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsedPreference);
  const location = useLocation();

  useEffect(() => {
    try {
      window.localStorage.setItem("inventory-sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      // Collapse preference remains available for this session when storage is unavailable.
    }
  }, [sidebarCollapsed]);

  const currentPage = Array.isArray(links)
    ? links
      .filter((link) => location.pathname === link.to || location.pathname.startsWith(`${link.to}/`))
      .sort((left, right) => right.to.length - left.to.length)[0]?.label || title
    : title;

  return (
    <div className={`min-h-screen bg-app-bg ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-60"}`}>
      <Sidebar
        isOpen={sidebarOpen}
        links={Array.isArray(links) ? links : []}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-app-border bg-app-surface px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-expanded={sidebarOpen}
              aria-label="Open navigation menu"
              className="flex size-9 items-center justify-center rounded-md text-app-muted hover:bg-app-subtle hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden truncate text-app-muted sm:inline">{title}</span>
              <span aria-hidden="true" className="hidden text-app-muted sm:inline">/</span>
              <h1 className="truncate font-display font-semibold text-app-text">{currentPage}</h1>
            </div>
          </div>

          <div className="ml-3 flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="min-h-0 flex-1 p-4 sm:p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
