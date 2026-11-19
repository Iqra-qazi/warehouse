import { Link, useNavigate } from "react-router-dom";
import { getDashboardPath, useAuth } from "../../context/AuthContext.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";

export default function Unauthorized() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const destination = isAuthenticated ? getDashboardPath(user.role) : "/login";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-app-bg px-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <section className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex size-9 items-center justify-center rounded-md bg-danger-soft text-sm font-semibold text-danger">
          !
        </div>
        <h1 className="text-xl font-semibold text-app-text">Access denied</h1>
        <p className="mt-2 text-sm text-app-muted">Your account does not have access to this page.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            to={destination}
          >
            Go back
          </Link>
          <button
            className="h-9 rounded-md border border-app-border px-4 text-sm font-medium text-app-text transition-colors hover:bg-app-subtle"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </section>
    </main>
  );
}
