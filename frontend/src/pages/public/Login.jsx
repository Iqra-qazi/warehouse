import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getDashboardPath, useAuth } from "../../context/AuthContext.jsx";
import Loader from "../../components/Loader.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";

export default function Login() {
  const { login, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    document.title = "Sign in | Inventory";
  }, []);

  if (loading) return <Loader />;
  if (isAuthenticated) return <Navigate to={getDashboardPath(user.role)} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      toast.success("Login successful");
      navigate(getDashboardPath(loggedInUser.role), { replace: true });
    } catch (error) {
      const message = error?.response?.data?.message
        || (error?.request
          ? "Unable to reach the server. Check your connection and API URL, then try again."
          : error?.message)
        || "Unable to log in. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-app-bg px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <section className="app-auth-card w-full max-w-[420px] rounded-lg border border-t-2 border-app-border border-t-accent bg-app-surface p-7 shadow-[0_12px_34px_rgba(27,54,76,0.08)] sm:p-9">
        <header className="mb-7">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-contrast">
              <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24">
                <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9" />
              </svg>
            </span>
            <span>
              <span className="block font-display text-sm font-bold text-app-text">Inventory</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Warehouse operations</span>
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-app-text">Sign in</h1>
          <p className="mt-1.5 text-sm text-app-muted">Use your work account to continue.</p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-app-text" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="h-10 w-full rounded-md border border-app-border bg-app-surface px-3 text-app-text outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-app-text" htmlFor="password">
              Password
            </label>
            <input
              autoComplete="current-password"
              className="h-10 w-full rounded-md border border-app-border bg-app-surface px-3 text-app-text outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          <button
            className="app-button flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-contrast shadow-sm transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-app-surface disabled:cursor-not-allowed disabled:opacity-70"
            disabled={submitting}
            type="submit"
          >
            {submitting && (
              <span className="size-4 animate-spin rounded-full border-2 border-accent-contrast/30 border-t-accent-contrast" />
            )}
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 border-t border-app-border pt-5 text-center text-sm text-app-muted">
          Don&apos;t have an account?{" "}
          <Link className="font-medium text-accent hover:underline" to="/register">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
