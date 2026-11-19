import { useAuth } from "../../context/AuthContext.jsx";
import PageHeader from "../../components/PageHeader.jsx";

export default function AdminProfile() {
  const { user } = useAuth();
  const initials = user?.name?.trim()?.charAt(0)?.toUpperCase() || "?";
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" subtitle="Your administrator account details." />
      <section className="rounded-lg border border-app-border bg-app-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-5">
          {user?.image ? <img alt="" className="size-12 rounded-full object-cover" src={user.image} />
            : <span className="flex size-12 items-center justify-center rounded-full bg-app-subtle text-base font-medium text-app-muted">{initials}</span>}
          <div><h2 className="text-xl font-semibold text-app-text">{user?.name || "Administrator"}</h2><p className="text-sm text-app-muted">{user?.email || "—"}</p></div>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-app-border pt-5 sm:grid-cols-2">
          <div><dt className="text-sm font-medium text-app-muted">Phone</dt><dd className="mt-1 text-sm text-app-text">{user?.phone || "Not provided"}</dd></div>
          <div><dt className="text-sm font-medium text-app-muted">Role</dt><dd className="mt-1 text-sm capitalize text-app-text">{user?.role || "admin"}</dd></div>
        </dl>
      </section>
    </div>
  );
}
