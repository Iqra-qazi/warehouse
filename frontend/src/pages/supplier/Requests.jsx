import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import DataTable from "../../components/DataTable.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatDate, formatNumber } from "../../utils/format.js";

const statuses = ["All", "Pending", "Approved", "Rejected"];

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [status, setStatus] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/supply-requests", {
        params: { status: status || undefined, warehouse: warehouse || undefined, page, limit: 10 },
      });
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
      setTotal(data?.total ?? 0);
      setPages(data?.pages ?? 1);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load request history.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [status, warehouse, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/warehouses/options")
      .then(({ data }) => setWarehouses(Array.isArray(data?.warehouses) ? data.warehouses : []))
      .catch((requestError) => toast.error(requestError.response?.data?.message || "Unable to load warehouses."));
  }, []);

  const columns = [
    { key: "createdAt", header: "Date", render: (request) => formatDate(request.createdAt) },
    { key: "product", header: "Product", render: (request) => <div className="flex items-center gap-3">{request.product?.imageUrl && <img alt="" className="size-10 rounded-md object-cover" src={request.product.imageUrl} />}<div><p className="font-medium">{request.product?.name || "—"}</p><p className="font-mono text-xs text-app-muted">{request.product?.sku || ""}</p></div></div> },
    { key: "warehouse", header: "Warehouse", render: (request) => request.warehouse?.name || "—" },
    { key: "quantity", header: "Quantity", render: (request) => formatNumber(request.quantity ?? 0) },
    { key: "status", header: "Status", render: (request) => <StatusBadge status={request.status} /> },
    { key: "reviewedBy", header: "Reviewed By", render: (request) => request.reviewedBy?.name || "—" },
    { key: "reviewNote", header: "Review Note", render: (request) => request.reviewNote || "—" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Request History" subtitle={`${total} supply request${total === 1 ? "" : "s"}`} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Request status">
          {statuses.map((item) => {
            const value = item === "All" ? "" : item;
            return <button key={item} role="tab" aria-selected={status === value}
              className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors ${status === value ? "border-accent bg-accent text-accent-contrast" : "border-app-border bg-app-surface text-app-muted hover:bg-app-subtle"}`}
              onClick={() => { setPage(1); setStatus(value); }}>{item}</button>;
          })}
        </div>
        <select aria-label="Filter by warehouse" className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm" value={warehouse}
          onChange={(event) => { setPage(1); setWarehouse(event.target.value); }}>
          <option value="">All warehouses</option>{warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
      </div>
      {error && <div className="mb-4 flex justify-between rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><button className="font-semibold" disabled={loading} onClick={load}>Retry</button></div>}
      <DataTable columns={columns} data={requests} loading={loading} emptyMessage="No supply requests found." />
      {pages > 1 && <div className="mt-4 flex items-center justify-center gap-3"><button className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="text-sm text-app-muted">Page {page} of {pages}</span><button className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </div>
  );
}
