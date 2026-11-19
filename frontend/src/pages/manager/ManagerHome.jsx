import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ManagerHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-subtle px-4">
      <section className="w-full max-w-lg rounded-lg bg-app-surface p-8 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <h1 className="text-2xl font-bold text-app-text">Warehouse Manager Dashboard</h1>
        <p className="mt-5 text-app-text">{user?.name}</p>
        <p className="text-app-muted">{user?.email}</p>
        <button
          className="mt-7 rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover"
          onClick={handleLogout}
          type="button"
        >
          Logout
        </button>
      </section>
    </main>
  );
}
