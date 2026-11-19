import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import Loader from "../../components/Loader.jsx";
import OrderItemsTable from "../../components/OrderItemsTable.jsx";
import OrderStatusTimeline from "../../components/OrderStatusTimeline.jsx";
import Button from "../../components/Button.jsx";
import { formatCurrency, formatDate } from "../../utils/format.js";

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setAccessDenied(false);
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data?.order ?? null);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load order.";
      setError(message);
      setAccessDenied([403, 404].includes(requestError.response?.status));
      if (![403, 404].includes(requestError.response?.status)) toast.error(message);
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const cancelOrder = async () => {
    setCancelling(true);
    try {
      const { data } = await api.put(`/orders/${id}/cancel`);
      setOrder(data?.order ?? order);
      setCancelOpen(false);
      toast.success("Order cancelled");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to cancel order.");
    } finally { setCancelling(false); }
  };

  if (loading) return <Loader />;
  if (accessDenied) {
    return <EmptyState title="Order unavailable" message="This order was not found or you do not have access." action={<Link className="font-semibold text-accent" to="/sales/orders">Back to orders</Link>} />;
  }
  if (!order) return <EmptyState title="Order unavailable" message={error || "Order not found"} action={<><Link className="font-semibold text-accent" to="/sales/orders">Back to orders</Link>{error && <Button className="ml-3" onClick={load}>Retry</Button>}</>} />;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={order.orderNumber || "Order"} subtitle={`Created ${formatDate(order.createdAt)}`} />
      <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-app-border bg-app-surface p-4"><p className="text-xs uppercase text-app-muted">Status</p><div className="mt-2"><StatusBadge status={order.status} /></div></div>
        <div className="rounded-lg border border-app-border bg-app-surface p-4"><p className="text-xs uppercase text-app-muted">Customer</p><p className="mt-2 font-semibold">{order.customerName}</p><p className="text-sm text-app-muted">{order.customerPhone}</p></div>
        <div className="rounded-lg border border-app-border bg-app-surface p-4"><p className="text-xs uppercase text-app-muted">Warehouse</p><p className="mt-2 font-semibold">{order.warehouse?.name || "—"}</p></div>
      </section>
      <section className="mb-5 rounded-lg border border-app-border bg-app-surface p-4"><OrderStatusTimeline status={order.status} /></section>
      <section className="rounded-lg border border-app-border bg-app-surface p-4">
        <OrderItemsTable items={Array.isArray(order.products) ? order.products : []} />
        <div className="mt-5 flex items-center justify-between border-t border-app-border pt-4"><span className="font-bold">Grand Total: {formatCurrency(order.totalAmount)}</span>{order.status === "Pending" && <Button variant="danger" onClick={() => setCancelOpen(true)}>Cancel Order</Button>}</div>
      </section>
      <ConfirmDialog isOpen={cancelOpen} title="Cancel order?" message={`Cancel order ${order.orderNumber}?`} confirmText="Cancel order" danger loading={cancelling} onCancel={() => setCancelOpen(false)} onConfirm={cancelOrder} />
    </div>
  );
}
