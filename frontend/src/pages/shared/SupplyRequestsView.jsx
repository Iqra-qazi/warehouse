import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import DataTable from "../../components/DataTable.jsx";
import Modal from "../../components/Modal.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatDate, formatNumber } from "../../utils/format.js";

const statuses = ["All", "Pending", "Approved", "Rejected"];

export default function SupplyRequestsView({ basePath }) {
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [warehouse, setWarehouse] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionRequest, setActionRequest] = useState(null);
  const [rejectRequest, setRejectRequest] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [busyId, setBusyId] = useState("");
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/supply-requests", {
        params: {
          status: status || undefined,
          warehouse: warehouse || undefined,
          search: search || undefined,
          page,
          limit: 10,
        },
      });
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
      setPages(data?.pages ?? 1);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load supply requests.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [status, warehouse, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/warehouses/options")
      .then(({ data }) => setWarehouses(Array.isArray(data?.warehouses) ? data.warehouses : []))
      .catch((requestError) => toast.error(requestError.response?.data?.message || "Unable to load warehouses."));
  }, []);

  async function reviewRequest(request, nextStatus, note) {
    if (!request || busyRef.current) return;
    busyRef.current = true;
    setBusyId(request._id);
    try {
      await api.put(`/supply-requests/${request._id}/status`, {
        status: nextStatus,
        reviewNote: note?.trim() || undefined,
      });
      toast.success(nextStatus === "Approved" ? "Supply request approved and stock added" : "Supply request rejected");
      setActionRequest(null);
      setRejectRequest(null);
      setReviewNote("");
      await load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to review supply request.");
    } finally {
      busyRef.current = false;
      setBusyId("");
    }
  }

  const columns = [
    { key: "createdAt", header: "Date", render: (request) => formatDate(request.createdAt) },
    { key: "supplier", header: "Supplier", render: (request) => request.supplier?.name || "—" },
    { key: "product", header: "Product", render: (request) => <div className="flex items-center gap-3">{request.product?.imageUrl && <img alt="" className="size-10 rounded-md object-cover" src={request.product.imageUrl} />}<div><p className="font-medium">{request.product?.name || "—"}</p><p className="font-mono text-xs text-app-muted">{request.product?.sku || ""}</p></div></div> },
    { key: "warehouse", header: "Warehouse", render: (request) => request.warehouse?.name || "—" },
    { key: "quantity", header: "Quantity", render: (request) => formatNumber(request.quantity ?? 0) },
    { key: "status", header: "Status", render: (request) => <StatusBadge status={request.status} /> },
    { key: "reviewedBy", header: "Reviewed By", render: (request) => request.reviewedBy?.name || "—" },
    { key: "actions", header: "Actions", render: (request) => request.status === "Pending" ? <div className="flex gap-3">
      <button className="font-medium text-accent disabled:opacity-50" disabled={Boolean(busyId)} onClick={() => setActionRequest(request)}>Approve</button>
      <button className="font-semibold text-danger disabled:opacity-50" disabled={Boolean(busyId)} onClick={() => { setRejectRequest(request); setReviewNote(""); }}>Reject</button>
    </div> : "—" },
  ];

  const modalMessage = actionRequest
    ? `Approve request? ${formatNumber(actionRequest.quantity)} units of ${actionRequest.product?.name || "product"} will be added to ${actionRequest.warehouse?.name || "the selected warehouse"}.`
    : "";

  return (
    <div className="mx-auto max-w-7xl" data-base-path={basePath}>
      <PageHeader title="Supply Requests" subtitle="Review supplier requests and update warehouse stock." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Supply request status">
          {statuses.map((item) => {
            const value = item === "All" ? "" : item;
            return <button key={item} role="tab" aria-selected={status === value}
              className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors ${status === value ? "border-accent bg-accent text-accent-contrast" : "border-app-border bg-app-surface text-app-muted hover:bg-app-subtle"}`}
              onClick={() => { setPage(1); setStatus(value); }}>{item}</button>;
          })}
        </div>
        <SearchInput value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search product name or SKU" />
        <select aria-label="Filter by warehouse" className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm" value={warehouse}
          onChange={(event) => { setPage(1); setWarehouse(event.target.value); }}>
          <option value="">All warehouses</option>{warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
      </div>
      {error && <div className="mb-4 flex justify-between rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><button className="font-semibold" disabled={loading} onClick={load}>Retry</button></div>}
      <DataTable columns={columns} data={requests} loading={loading} emptyMessage="No supply requests found." />
      {pages > 1 && <div className="mt-4 flex items-center justify-center gap-3"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm text-app-muted">Page {page} of {pages}</span><Button variant="secondary" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}

      <ConfirmDialog isOpen={Boolean(actionRequest)} title="Approve request?" message={modalMessage}
        confirmText="Approve" loading={Boolean(busyId)} onCancel={() => setActionRequest(null)}
        onConfirm={() => reviewRequest(actionRequest, "Approved")} />
      <Modal isOpen={Boolean(rejectRequest)} onClose={() => { if (!busyId) setRejectRequest(null); }} title="Reject supply request" size="sm">
        {rejectRequest && <div>
          <p className="text-sm text-app-muted">Reject {formatNumber(rejectRequest.quantity)} units of {rejectRequest.product?.name || "this product"}?</p>
          <label className="mt-4 block text-sm font-medium text-app-text" htmlFor="supply-review-note">Review note (optional)</label>
          <textarea id="supply-review-note" className="mt-1 min-h-24 w-full h-9 rounded-md border border-app-border bg-app-surface px-3 text-app-text text-sm" maxLength={500} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
          <div className="mt-5 flex justify-end gap-2"><Button disabled={Boolean(busyId)} variant="secondary" onClick={() => setRejectRequest(null)}>Cancel</Button><Button loading={Boolean(busyId)} variant="danger" onClick={() => reviewRequest(rejectRequest, "Rejected", reviewNote)}>Reject</Button></div>
        </div>}
      </Modal>
    </div>
  );
}
