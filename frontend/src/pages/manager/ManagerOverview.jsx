import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatDate, formatNumber } from "../../utils/format.js";

export default function ManagerOverview() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/dashboard/manager");
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("The manager dashboard response was invalid.");
      }
      const recentTransactions = data?.recentTransactions ?? data?.transactions ?? [];
      if (!Array.isArray(recentTransactions)) {
        throw new Error("The manager transactions response was invalid.");
      }
      setStats({ ...data, recentTransactions: recentTransactions.filter(Boolean) });
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        "Unable to load the manager overview.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const transactions = Array.isArray(stats?.recentTransactions) ? stats.recentTransactions : [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Overview"
        subtitle="A summary of your assigned warehouses and inventory."
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
        aria-label="Warehouse statistics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard
          title="Assigned Warehouses"
          value={stats?.assignedWarehouses ?? (loading ? undefined : 0)}
        />
        <StatCard
          title="Stock Items"
          value={stats?.stockItems ?? (loading ? undefined : 0)}
        />
        <Link
          aria-label="View low stock items"
          className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2"
          to="/manager/low-stock"
        >
          <StatCard
            title="Low Stock"
            value={stats?.lowStockCount ?? (loading ? undefined : 0)}
          />
        </Link>
        <Link
          aria-label="View pending orders"
          className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          to="/manager/orders"
        >
          <StatCard
            title="Pending Orders"
            value={stats?.pendingOrders ?? (loading ? undefined : 0)}
          />
        </Link>
        <Link
          aria-label="View pending supply requests"
          className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          to="/manager/supply-requests?status=Pending"
        >
          <StatCard
            title="Pending Requests"
            value={stats?.pendingRequests ?? (loading ? undefined : 0)}
          />
        </Link>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-app-text">Recent Transactions</h2>
          <p className="mt-1 text-sm text-app-muted">Latest stock movements in your warehouses.</p>
        </div>
        <div className="overflow-x-auto">
          {loading && transactions.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-app-muted">Loading transactions...</p>
          ) : transactions.length ? (
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead className="bg-app-subtle text-xs uppercase tracking-wide text-app-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold sm:px-6">Date</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Warehouse</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold sm:px-6">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {transactions.map((transaction) => (
                  <tr className="text-app-text" key={transaction?._id}>
                    <td className="whitespace-nowrap px-5 py-4 sm:px-6">{formatDate(transaction?.date)}</td>
                    <td className="px-5 py-4 font-medium text-app-text">
                      {transaction?.product?.name || "—"}
                    </td>
                    <td className="px-5 py-4">{transaction?.warehouse?.name || "—"}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={transaction?.transactionType} />
                    </td>
                    <td className="px-5 py-4 tabular-nums">{formatNumber(transaction?.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState message="No stock transactions for your assigned warehouses yet." />
          )}
        </div>
      </section>
    </div>
  );
}
