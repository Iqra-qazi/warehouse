import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatCurrency, formatDate } from "../../utils/format.js";
import { Link } from "react-router-dom";

const statuses = [
  "Pending",
  "Processing",
  "Completed",
  "Cancelled",
];

export default function SalesOverview() {
  const [overview, setOverview] = useState({ total: 0, pending: 0, processing: 0, completed: 0, cancelled: 0, totalSpent: 0, recentOrders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/dashboard/sales");
      setOverview({
        total: data?.total ?? 0,
        pending: data?.pending ?? 0,
        processing: data?.processing ?? 0,
        completed: data?.completed ?? 0,
        cancelled: data?.cancelled ?? 0,
        totalSpent: data?.totalSpent ?? 0,
        recentOrders: Array.isArray(data?.recentOrders) ? data.recentOrders : [],
      });
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        "Unable to load the sales overview.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Overview"
        subtitle="Track the status of your sales orders."
      />

      {error && (
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-danger-soft bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-danger">{error}</p>
          <button
            className="shrink-0 rounded-lg bg-danger-solid px-4 py-2 text-sm font-semibold text-accent-contrast hover:brightness-95 disabled:opacity-60"
            disabled={loading}
            onClick={loadOverview}
            type="button"
          >
            {loading ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}

      <section
        aria-label="Your orders by status"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard title="Total Orders" value={loading ? undefined : overview.total} />
        {statuses.map((status) => (
          <StatCard key={status} badge={<StatusBadge status={status} />}
            title={`${status}`}
            value={loading ? undefined : (overview[status.toLowerCase()] ?? 0)} />
        ))}
        <StatCard title="Total Completed Value" value={loading ? undefined : formatCurrency(overview.totalSpent)} />
      </section>
      <section className="mt-6 rounded-lg border border-app-border bg-app-surface p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-app-text">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-app-muted"><tr><th className="px-3 py-2">Order No</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Date</th></tr></thead>
            <tbody className="divide-y divide-app-border">
              {overview.recentOrders.map((order) => (
                <tr key={order._id} className="text-app-text">
                  <td className="px-3 py-3"><Link className="font-mono text-sm font-medium text-accent" to={`/sales/orders/${order._id}`}>{order.orderNumber}</Link></td>
                  <td className="px-3 py-3">{order.customerName}</td><td className="px-3 py-3">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-3 py-3"><StatusBadge status={order.status} /></td><td className="px-3 py-3">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
              {!loading && (overview.recentOrders?.length ?? 0) === 0 && <tr><td colSpan="5" className="px-3 py-8 text-center text-app-muted">No recent orders</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
