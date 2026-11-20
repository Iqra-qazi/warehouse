import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatDate, formatNumber } from "../../utils/format.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function SupplierHome() {
  const [stats, setStats] = useState({
    products: 0,
    totalRequests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    recentRequests: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/dashboard/supplier");
      setStats({
        products: data?.products ?? 0,
        totalRequests: data?.totalRequests ?? 0,
        pending: data?.pending ?? 0,
        approved: data?.approved ?? 0,
        rejected: data?.rejected ?? 0,
        recentRequests: Array.isArray(data?.recentRequests) ? data.recentRequests : [],
      });
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load supplier overview.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { user } = useAuth();
  const initials = user?.name?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Supplier Overview" subtitle="Your products and supply request activity." />
      {error && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><button className="font-semibold" disabled={loading} onClick={load}>Retry</button></div>}
      <Link to="/supplier/profile" className="mb-6 flex items-center gap-4 rounded-lg border border-app-border bg-app-surface p-5 shadow-sm hover:border-app-border">
        {user?.image ? <img alt="" className="size-10 rounded-full object-cover" src={user.image} /> : <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">{initials}</span>}
        <div className="min-w-0 flex-1"><p className="font-medium text-app-text">{user?.name || "Supplier"}</p><p className="truncate text-sm text-app-muted">{user?.companyName || user?.email || "Complete your supplier profile"}</p></div>
        <span className="text-sm font-medium text-accent">View Profile</span>
      </Link>
      <section aria-label="Supplier statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="My Products" value={loading ? undefined : stats.products} />
        <StatCard title="Total Requests" value={loading ? undefined : stats.totalRequests} />
        <StatCard title="Pending" value={loading ? undefined : stats.pending} />
        <StatCard title="Approved" value={loading ? undefined : stats.approved} />
        <StatCard title="Rejected" value={loading ? undefined : stats.rejected} />
      </section>
      <section className="mt-7 rounded-lg border border-app-border bg-app-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-app-text">Recent Requests</h2><Link className="text-sm font-medium text-accent hover:underline" to="/supplier/requests">View history</Link></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-app-subtle text-xs uppercase text-app-muted"><tr><th className="px-3 py-3">Product</th><th className="px-3 py-3">Warehouse</th><th className="px-3 py-3">Quantity</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Date</th></tr></thead>
            <tbody className="divide-y divide-app-border">{stats.recentRequests.map((request) => (
              <tr className="text-app-text" key={request._id}><td className="px-3 py-3">{request.product?.name || "—"}</td><td className="px-3 py-3">{request.warehouse?.name || "—"}</td><td className="px-3 py-3 tabular-nums">{formatNumber(request.quantity ?? 0)}</td><td className="px-3 py-3"><StatusBadge status={request.status} /></td><td className="px-3 py-3">{formatDate(request.createdAt)}</td></tr>
            ))}</tbody>
          </table>
          {!loading && (stats.recentRequests?.length ?? 0) === 0 && <EmptyState message="You have not submitted any supply requests yet." />}
        </div>
      </section>
    </div>
  );
}
