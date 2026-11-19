import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import DataTable from "../../components/DataTable.jsx";
import { formatCurrency, formatDate } from "../../utils/format.js";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/orders", { params: { status: status || undefined, search: search || undefined, page, limit: 10 } });
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
      setPages(data?.pages || 1);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load orders.";
      setError(message); toast.error(message);
    } finally { setLoading(false); }
  }, [status, search, page]);
  useEffect(() => { load(); }, [load]);

  const cancelOrder = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.put(`/orders/${cancelTarget._id}/cancel`);
      toast.success("Order cancelled");
      setCancelTarget(null); load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to cancel order.");
    } finally { setCancelling(false); }
  };

  const columns = [
    { key: "orderNumber", header: "Order No", render: (order) => <Link className="font-mono text-sm font-medium text-accent" to={`/sales/orders/${order._id}`}>{order.orderNumber}</Link> },
    { key: "customerName", header: "Customer" },
    { key: "items", header: "Items", render: (order) => Array.isArray(order.products) ? order.products.length : 0 },
    { key: "totalAmount", header: "Total", render: (order) => formatCurrency(order.totalAmount) },
    { key: "status", header: "Status", render: (order) => <StatusBadge status={order.status} /> },
    { key: "createdAt", header: "Date", render: (order) => formatDate(order.createdAt) },
    { key: "actions", header: "Actions", render: (order) => <div className="flex gap-3"><Link className="font-semibold text-accent" to={`/sales/orders/${order._id}`}>View</Link>{order.status === "Pending" && <button className="font-semibold text-danger" onClick={() => setCancelTarget(order)}>Cancel</button>}</div> },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="My Orders" />
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
        <SearchInput value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search order or customer" />
        <select className="h-9 rounded-md border border-app-border bg-app-surface px-3 text-app-text" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
          <option value="">All statuses</option>{["Pending", "Processing", "Completed", "Cancelled"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {error && <div className="mb-4 flex justify-between rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><button className="font-semibold" onClick={load}>Retry</button></div>}
      <DataTable columns={columns} data={orders} loading={loading} emptyMessage="No orders found." />
      {pages > 1 && <div className="mt-4 flex justify-center gap-2"><button disabled={page <= 1} className="rounded-lg border px-3 py-2" onClick={() => setPage((value) => value - 1)}>Previous</button><span className="px-3 py-2">Page {page} of {pages}</span><button disabled={page >= pages} className="rounded-lg border px-3 py-2" onClick={() => setPage((value) => value + 1)}>Next</button></div>}
      <ConfirmDialog isOpen={Boolean(cancelTarget)} title="Cancel order?" message={`Cancel order ${cancelTarget?.orderNumber || ""}?`} confirmText="Cancel order" danger loading={cancelling}
        onCancel={() => setCancelTarget(null)} onConfirm={cancelOrder} />
    </div>
  );
}
