import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "./Avatar.jsx";

const roleLabels = {
  admin: "Administrator",
  warehouseManager: "Warehouse Manager",
  supplier: "Supplier",
  salesRepresentative: "Sales Representative",
};

function sectionFor(label = "") {
  const value = label.toLowerCase();
  if (value === "overview") return "Overview";
  if (value.includes("profile")) return "Account";
  if (value.includes("user") || value.includes("supplier")) return "People";
  if (value.includes("order") || value.includes("sales")) return "Sales";
  if (value.includes("request")) return "Requests";
  return "Inventory";
}

function Icon({ label }) {
  const value = label.toLowerCase();
  let shape = <path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h4" />;
  if (value.includes("overview")) shape = <><path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4h6v3h-6zM4 17h6v3H4z" /></>;
  else if (value.includes("user") || value.includes("supplier") || value.includes("profile")) shape = <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 15a5 5 0 0 1 3.5 4.8" /></>;
  else if (value.includes("warehouse")) shape = <><path d="m3 9 9-5 9 5v11H3zM7 12h3v3H7zM14 12h3v3h-3zM10 20v-4h4v4" /></>;
  else if (value.includes("order") || value.includes("request")) shape = <><path d="M7 3h8l4 4v14H7zM15 3v5h5M10 12h6M10 16h6" /><path d="M4 7v14" /></>;
  else if (value.includes("transaction") || value.includes("stock")) shape = <><path d="M5 7h13l-3-3M19 17H6l3 3" /><path d="M18 7a6 6 0 0 1 0 10M6 17A6 6 0 0 1 6 7" /></>;
  else if (value.includes("product") || value.includes("inventory")) shape = <><path d="m12 3 9 5-9 5-9-5zM3 8v9l9 5 9-5V8M12 13v9" /></>;
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
      {shape}
    </svg>
  );
}

export default function Sidebar({
  links = [],
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const safeLinks = Array.isArray(links)
    ? links.filter((link) => link && typeof link.to === "string")
    : [];
  const sections = safeLinks.reduce((result, link) => {
    const section = sectionFor(link.label);
    if (!result[section]) result[section] = [];
    result[section].push(link);
    return result;
  }, {});
  const sectionOrder = ["Overview", "Inventory", "Sales", "Requests", "People", "Account"];
  const orderedSections = Object.entries(sections).sort(
    ([left], [right]) => sectionOrder.indexOf(left) - sectionOrder.indexOf(right)
  );

  function handleLogout() {
    logout();
    onClose?.();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {isOpen && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-app-border bg-app-surface text-app-text lg:translate-x-0 lg:transition-[width] lg:duration-150 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-16" : "lg:w-60"}`}
      >
        <div className={`flex h-14 shrink-0 items-center justify-between border-b border-app-border px-4 ${isCollapsed ? "lg:justify-center lg:px-2" : ""}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-contrast">
              <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24">
                <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9" />
              </svg>
            </span>
            <span className={`truncate text-sm font-semibold ${isCollapsed ? "lg:hidden" : ""}`}>Inventory</span>
          </div>
          <button
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden rounded-md p-1.5 text-app-muted hover:bg-app-subtle hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:inline-flex ${isCollapsed ? "absolute -right-3 top-4 z-10 border border-app-border bg-app-surface" : ""}`}
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" viewBox="0 0 24 24">
              {isCollapsed ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
            </svg>
          </button>
        </div>

        <nav aria-label="Dashboard navigation" className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
          {orderedSections.map(([section, sectionLinks]) => (
            <section key={section}>
              <h2 className={`mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-app-muted ${isCollapsed ? "lg:hidden" : ""}`}>
                  {section}
              </h2>
              <div className="space-y-0.5">
                {sectionLinks.map(({ to, label }) => (
                  <NavLink
                    end={to.split("/").filter(Boolean).length === 1}
                    key={to}
                    onClick={onClose}
                    title={isCollapsed ? label : undefined}
                    to={to}
                    className={({ isActive }) =>
                      `flex h-9 items-center gap-3 border-l-2 px-2 text-sm transition-colors duration-150 ${
                        isCollapsed ? "lg:justify-center" : ""
                      } ${
                        isActive
                          ? "border-accent bg-accent-soft font-medium text-accent"
                          : "border-transparent text-app-muted hover:bg-app-subtle hover:text-app-text"
                      }`
                    }
                  >
                    <Icon label={label} />
                    <span className={`truncate ${isCollapsed ? "lg:hidden" : ""}`}>{label}</span>
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className={`border-t border-app-border p-3 ${isCollapsed ? "lg:flex lg:flex-col lg:items-center lg:gap-2" : ""}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar image={user?.image} name={user?.name} size="sm" />
              <div className={`min-w-0 ${isCollapsed ? "lg:hidden" : ""}`}>
                <p className="truncate text-sm font-medium text-app-text">{user?.name || "User"}</p>
                <p className="truncate text-xs text-app-muted">{roleLabels[user?.role] || user?.role}</p>
              </div>
          </div>
          <button
            className={`mt-2 flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-app-muted transition-colors hover:bg-app-subtle hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isCollapsed ? "lg:justify-center" : ""}`}
            onClick={handleLogout}
            title={isCollapsed ? "Log out" : undefined}
            type="button"
          >
            <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
            <span className={isCollapsed ? "lg:hidden" : ""}>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
