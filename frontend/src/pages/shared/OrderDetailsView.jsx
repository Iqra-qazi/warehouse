import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import Loader from "../../components/Loader.jsx";
import OrderItemsTable from "../../components/OrderItemsTable.jsx";
import OrderStatusTimeline from "../../components/OrderStatusTimeline.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format.js";

export default function OrderDetailsView({ basePath, admin = false }) {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [action, setAction] = useState("");
  const [saving, setSaving] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    setAccessDenied(false);
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data?.order ?? null);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load order.";
      setError(message);
      setAccessDenied([403, 404].includes(requestError.response?.status));
      if (![403, 404].includes(requestError.response?.status)) toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTransactions = useCallback(async () => {
    if (!order || !["Processing", "Completed"].includes(order.status)) {
      setTransactions([]);
      return;
    }
    setTransactionLoading(true);
    try {
      const { data } = await api.get("/transactions", {
        params: {
          note: `Order ${order.orderNumber}`,
          warehouse: order.warehouse?._id,
          type: "stock-out",
          limit: 50,
        },
      });
      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to load order stock transactions.");
    } finally {
      setTransactionLoading(false);
    }
  }, [order]);

  useEffect(() => { loadOrder(); }, [loadOrder]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const performAction = async () => {
    if (!action || !order) return;
    setSaving(true);
    try {
      if (action === "cancel") {
        await api.put(`/orders/${id}/cancel`);
        toast.success("Order cancelled");
      } else {
        const status = action === "process" ? "Processing" : "Completed";
        await api.put(`/orders/${id}/status`, { status });
        toast.success(action === "process" ? "Order processed; stock deducted" : "Order marked completed");
      }
      setAction("");
      await loadOrder();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update order.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (accessDenied) {
    return <EmptyState title="Order unavailable" message="This order was not found or you do not have access."
      action={<Link className="font-semibold text-accent" to={basePath}>Back to orders</Link>} />;
  }
  if (!order) {
    return <EmptyState title="Unable to load order" message={error || "Order not found"}
      action={<div className="flex items-center gap-4"><Link className="font-semibold text-accent" to={basePath}>Back to orders</Link><Button onClick={loadOrder}>Retry</Button></div>} />;
  }

  const confirmTitle = action === "process" ? "Process order?" : action === "complete" ? "Complete order?" : "Cancel order?";
  const confirmMessage = action === "process"
    ? `Process order ${order.orderNumber}? Stock will be deducted from ${order.warehouse?.name || "the selected warehouse"}.`
    : action === "complete" ? `Mark order ${order.orderNumber} as completed?` : `Cancel order ${order.orderNumber}?`;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={order.orderNumber || "Order"} subtitle={`Created ${formatDate(order.createdAt)}`} />
      <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-app-border bg-app-surface p-4"><p className="text-xs uppercase text-app-muted">Status</p><div className="mt-2"><StatusBadge status={order.status} /></div></div>
        <div className="rounded-lg border border-app-border bg-app-surface p-4"><p className="text-xs uppercase text-app-muted">Customer</p><p className="mt-2 font-semibold">{order.customerName || "—"}</p><p className="text-sm text-app-muted">{order.customerPhone || "—"}</p></div>
        <div className="rounded-lg border border-app-border bg-app-surface p-4"><p className="text-xs uppercase text-app-muted">Created By</p><p className="mt-2 font-semibold">{order.createdBy?.name || "—"}</p><p className="text-sm text-app-muted">{order.createdBy?.email || ""}</p></div>
        <div className="rounded-lg border border-app-border bg-app-surface p-4"><p className="text-xs uppercase text-app-muted">Warehouse</p><p className="mt-2 font-semibold">{order.warehouse?.name || "—"}</p></div>
      </section>
      <section className="mb-5 rounded-lg border border-app-border bg-app-surface p-4">
        <p className="mb-3 text-xs uppercase text-app-muted">Order status</p>
        <OrderStatusTimeline status={order.status} />
      </section>
      <section className="rounded-lg border border-app-border bg-app-surface p-4">
        <h2 className="mb-3 font-semibold">Order items</h2>
        <OrderItemsTable items={Array.isArray(order.products) ? order.products : []} />
        <div className="mt-5 flex flex-col gap-3 border-t border-app-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <strong>Grand Total: {formatCurrency(order.totalAmount)}</strong>
          <div className="flex flex-wrap gap-2">
            {order.status === "Pending" && <Button onClick={() => setAction("process")}>Process Order</Button>}
            {order.status === "Processing" && <Button onClick={() => setAction("complete")}>Mark Completed</Button>}
            {admin && order.status === "Pending" && <Button variant="danger" onClick={() => setAction("cancel")}>Cancel Order</Button>}
          </div>
        </div>
      </section>
      {["Processing", "Completed"].includes(order.status) && (
        <section className="mt-5 rounded-lg border border-app-border bg-app-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h2 className="font-semibold">Stock transactions</h2><p className="text-sm text-app-muted">Stock-out records created while processing this order.</p></div>
            <Button size="sm" variant="secondary" disabled={transactionLoading} onClick={loadTransactions}>Refresh</Button>
          </div>
          {transactionLoading ? <p className="py-6 text-center text-sm text-app-muted">Loading transactions...</p> : transactions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-app-subtle text-xs uppercase text-app-muted"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Product</th><th className="px-3 py-2">Warehouse</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Note</th></tr></thead>
                <tbody className="divide-y divide-app-border">{transactions.map((transaction) => <tr key={transaction._id}>
                  <td className="px-3 py-3">{formatDate(transaction.date)}</td><td className="px-3 py-3">{transaction.product?.name || "—"}</td>
                  <td className="px-3 py-3">{transaction.warehouse?.name || "—"}</td><td className="px-3 py-3 tabular-nums">{formatNumber(transaction.quantity ?? 0)}</td><td className="px-3 py-3">{transaction.note || "—"}</td>
                </tr>)}</tbody>
              </table>
            </div>
          ) : <p className="py-5 text-center text-sm text-app-muted">No related stock transactions found.</p>}
        </section>
      )}
      <ConfirmDialog isOpen={Boolean(action)} title={confirmTitle} message={confirmMessage}
        confirmText={action === "process" ? "Process Order" : action === "complete" ? "Mark Completed" : "Cancel order"}
        danger={action === "cancel"} loading={saving} onCancel={() => setAction("")} onConfirm={performAction} />
    </div>
  );
}
