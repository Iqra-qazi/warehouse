import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "./Avatar.jsx";

const profilePaths = {
  admin: "/admin/profile",
  supplier: "/supplier/profile",
};

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-label="Open user menu"
        className="flex size-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Avatar image={user?.image} name={user?.name} size="sm" />
      </button>
      {open && (
        <div className="app-pop-in absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-app-border bg-app-surface p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <div className="border-b border-app-border px-3 py-2">
            <p className="truncate text-sm font-medium text-app-text">{user?.name || "User"}</p>
            <p className="truncate text-xs text-app-muted">{user?.email || ""}</p>
          </div>
          {profilePaths[user?.role] && (
            <Link
              className="mt-1 flex h-9 items-center rounded-md px-3 text-sm text-app-text hover:bg-app-subtle"
              onClick={() => setOpen(false)}
              to={profilePaths[user.role]}
            >
              Profile
            </Link>
          )}
          <button
            className="flex h-9 w-full items-center rounded-md px-3 text-left text-sm text-app-text hover:bg-app-subtle"
            onClick={handleLogout}
            type="button"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
