import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format.js";

export default function AdminOverview() {
  const [stats, setStats] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsResponse, transactionResponse, ordersResponse] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/transactions", { params: { limit: 5 } }),
        api.get("/orders", { params: { limit: 5 } }),
      ]);

      const receivedStats = statsResponse.data?.data ?? statsResponse.data ?? {};
      if (!receivedStats || typeof receivedStats !== "object" || Array.isArray(receivedStats)) {
        throw new Error("The dashboard stats response was invalid");
      }

      const receivedTransactions =
        transactionResponse.data?.transactions ??
        transactionResponse.data?.data ??
        transactionResponse.data ??
        [];
      if (!Array.isArray(receivedTransactions)) {
        throw new Error("The transactions response was invalid");
      }

      setStats(receivedStats);
      setTransactions(receivedTransactions.filter(Boolean).slice(0, 5));
      setRecentOrders(Array.isArray(ordersResponse.data?.orders) ? ordersResponse.data.orders : []);
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        "Unable to load the admin overview";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const cards = [
    { title: "Users", value: stats?.users ?? (loading ? undefined : 0) },
    { title: "Products", value: stats?.products ?? (loading ? undefined : 0) },
    { title: "Warehouses", value: stats?.warehouses ?? (loading ? undefined : 0) },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Overview"
        subtitle="A snapshot of your inventory and warehouse operations."
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

      <section aria-label="Inventory statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => <StatCard key={card.title} {...card} />)}
        <Link aria-label="View suppliers" className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2" to="/admin/suppliers">
          <StatCard title="Suppliers" value={stats?.suppliers ?? (loading ? undefined : 0)} />
        </Link>
        <Link aria-label="View orders" className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2" to="/admin/orders">
          <StatCard title="Orders" value={stats?.orders ?? (loading ? undefined : 0)} />
        </Link>
        <Link
          aria-label="View low stock products"
          className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2"
          to="/admin/low-stock"
        >
          <StatCard
            title="Low Stock Products"
            value={stats?.lowStockCount ?? (loading ? undefined : 0)}
          />
        </Link>
        <Link
          aria-label="View pending supply requests"
          className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          to="/admin/supply-requests?status=Pending"
        >
          <StatCard
            title="Pending Requests"
            value={stats?.pendingRequests ?? (loading ? undefined : 0)}
          />
        </Link>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-app-border px-5 py-4 sm:px-6">
          <div><h2 className="text-base font-semibold text-app-text">Recent Orders</h2><p className="mt-1 text-sm text-app-muted">The latest sales orders.</p></div>
          <Link className="text-sm font-semibold text-accent" to="/admin/orders">All Orders</Link>
        </div>
        <div className="overflow-x-auto">
          {recentOrders.length ? <table className="min-w-[680px] w-full text-left text-sm">
            <thead className="bg-app-subtle text-xs uppercase tracking-wide text-app-muted"><tr><th className="px-5 py-3">Order No</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th></tr></thead>
            <tbody className="divide-y divide-app-border">{recentOrders.map((order) => <tr key={order._id}>
              <td className="px-5 py-3"><Link className="font-mono text-sm font-medium text-accent" to={`/admin/orders/${order._id}`}>{order.orderNumber || "—"}</Link></td>
              <td className="px-5 py-3">{order.customerName || "—"}</td><td className="px-5 py-3">{formatCurrency(order.totalAmount)}</td>
              <td className="px-5 py-3"><StatusBadge status={order.status} /></td><td className="px-5 py-3">{formatDate(order.createdAt)}</td>
            </tr>)}</tbody>
          </table> : loading ? <p className="px-6 py-10 text-center text-sm text-app-muted">Loading orders...</p> : <EmptyState message="No recent orders yet." />}
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-app-text">Recent Stock Transactions</h2>
          <p className="mt-1 text-sm text-app-muted">The latest inventory movements.</p>
        </div>
        <div className="overflow-x-auto">
          {transactions.length > 0 ? (
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-app-subtle text-xs uppercase tracking-wide text-app-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold sm:px-6">Date</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Warehouse</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Quantity</th>
                  <th className="px-5 py-3 font-semibold sm:px-6">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {transactions.map((transaction) => (
                  <tr className="text-app-text" key={transaction._id}>
                    <td className="whitespace-nowrap px-5 py-4 sm:px-6">{formatDate(transaction.date)}</td>
                    <td className="px-5 py-4 font-medium text-app-text">
                      {transaction.product?.name || "—"}
                    </td>
                    <td className="px-5 py-4">{transaction.warehouse?.name || "—"}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={transaction.transactionType} />
                    </td>
                    <td className="px-5 py-4 tabular-nums">{formatNumber(transaction.quantity)}</td>
                    <td className="px-5 py-4 sm:px-6">{transaction.performedBy?.name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : loading ? (
            <p className="px-6 py-10 text-center text-sm text-app-muted">Loading transactions...</p>
          ) : (
            <EmptyState message="No stock transactions yet." />
          )}
        </div>
      </section>
    </div>
  );
}
