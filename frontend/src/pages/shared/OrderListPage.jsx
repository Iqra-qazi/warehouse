import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatCurrency, formatDate } from "../../utils/format.js";

const statuses = ["All", "Pending", "Processing", "Completed", "Cancelled"];

export default function OrderListPage({ basePath, admin = false }) {
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState(null);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/orders", {
        params: {
          status: status || undefined,
          search: search || undefined,
          warehouse: warehouse || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit: 10,
        },
      });
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
      setPages(data?.pages ?? 1);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load orders.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [status, search, warehouse, from, to, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/warehouses/options")
      .then(({ data }) => setWarehouses(Array.isArray(data?.warehouses) ? data.warehouses : []))
      .catch((requestError) => toast.error(requestError.response?.data?.message || "Unable to load warehouses."));
  }, []);

  const executeAction = async () => {
    if (!action) return;
    setBusyId(action.order._id);
    try {
      if (action.type === "cancel") {
        await api.put(`/orders/${action.order._id}/cancel`);
        toast.success(`Order ${action.order.orderNumber} cancelled`);
      } else {
        const statusValue = action.type === "process" ? "Processing" : "Completed";
        await api.put(`/orders/${action.order._id}/status`, { status: statusValue });
        toast.success(action.type === "process" ? "Order processed; stock deducted" : "Order marked completed");
      }
      setAction(null);
      await load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update order.");
    } finally {
      setBusyId("");
    }
  };

  const columns = [
    { key: "orderNumber", header: "Order No", render: (order) => <Link className="font-mono text-sm font-medium text-accent" to={`${basePath}/${order._id}`}>{order.orderNumber || "—"}</Link> },
    { key: "customerName", header: "Customer", render: (order) => <div><p>{order.customerName || "—"}</p><p className="text-xs text-app-muted">{order.customerPhone || ""}</p></div> },
    { key: "createdBy", header: "Created By", render: (order) => order.createdBy?.name || "—" },
    { key: "warehouse", header: "Warehouse", render: (order) => order.warehouse?.name || "—" },
    { key: "items", header: "Items", render: (order) => Array.isArray(order.products) ? order.products.length : 0 },
    { key: "totalAmount", header: "Total", render: (order) => formatCurrency(order.totalAmount) },
    { key: "status", header: "Status", render: (order) => <StatusBadge status={order.status} /> },
    { key: "createdAt", header: "Date", render: (order) => formatDate(order.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (order) => (
        <div className="flex items-center gap-3">
          <Link className="font-semibold text-accent" to={`${basePath}/${order._id}`}>View</Link>
          {order.status === "Pending" && (
            <button disabled={busyId === order._id} className="whitespace-nowrap font-semibold text-accent disabled:opacity-50" onClick={() => setAction({ type: "process", order })}>
              Process Order
            </button>
          )}
          {order.status === "Processing" && (
            <button disabled={busyId === order._id} className="whitespace-nowrap font-medium text-accent disabled:opacity-50" onClick={() => setAction({ type: "complete", order })}>
              Mark Completed
            </button>
          )}
          {admin && order.status === "Pending" && (
            <button disabled={busyId === order._id} className="font-semibold text-danger disabled:opacity-50" onClick={() => setAction({ type: "cancel", order })}>Cancel</button>
          )}
        </div>
      ),
    },
  ];

  const title = admin ? "Orders" : "Orders";
  const message = action?.type === "process"
    ? `Process order ${action.order.orderNumber}? Stock will be deducted from ${action.order.warehouse?.name || "the selected warehouse"}.`
    : action?.type === "complete"
      ? `Mark order ${action.order.orderNumber} as completed?`
      : `Cancel order ${action?.order?.orderNumber || ""}?`;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={title} subtitle={admin ? "Review and process all sales orders." : "Review orders for your assigned warehouses."} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Order status">
        {statuses.map((item) => {
          const value = item === "All" ? "" : item;
          return <button key={item} role="tab" aria-selected={status === value}
            className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors ${status === value ? "border-accent bg-accent text-accent-contrast" : "border-app-border bg-app-surface text-app-muted hover:bg-app-subtle"}`}
            onClick={() => { setPage(1); setStatus(value); }}>{item}</button>;
        })}
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SearchInput value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search order or customer" />
        <select className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm" value={warehouse} onChange={(event) => { setPage(1); setWarehouse(event.target.value); }}>
          <option value="">All warehouses</option>{warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-app-muted">From<input aria-label="From date" className="min-w-0 flex-1 h-9 rounded-md border border-app-border bg-app-surface px-2 text-app-text" type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} /></label>
        <label className="flex items-center gap-2 text-sm text-app-muted">To<input aria-label="To date" className="min-w-0 flex-1 h-9 rounded-md border border-app-border bg-app-surface px-2 text-app-text" type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} /></label>
        <Button variant="secondary" onClick={() => { setStatus(""); setSearch(""); setWarehouse(""); setFrom(""); setTo(""); setPage(1); }}>Clear filters</Button>
      </div>
      {error && <div className="mb-4 flex items-center justify-between rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><button className="font-semibold" disabled={loading} onClick={load}>Retry</button></div>}
      <DataTable columns={columns} data={orders} loading={loading} emptyMessage="No orders found." />
      {pages > 1 && <div className="mt-4 flex items-center justify-center gap-3">
        <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
        <span className="text-sm text-app-muted">Page {page} of {pages}</span>
        <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
      </div>}
      <ConfirmDialog isOpen={Boolean(action)} title={action?.type === "process" ? "Process order?" : action?.type === "complete" ? "Complete order?" : "Cancel order?"}
        message={message} confirmText={action?.type === "process" ? "Process Order" : action?.type === "complete" ? "Mark Completed" : "Cancel order"}
        danger={action?.type === "cancel"} loading={Boolean(busyId)} onCancel={() => setAction(null)} onConfirm={executeAction} />
    </div>
  );
}
