import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import UserFormModal from "../../components/UserFormModal.jsx";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/users/suppliers", {
        params: { search: search || undefined, page, limit: 10 },
      });
      setSuppliers(Array.isArray(data?.suppliers) ? data.suppliers : []);
      setTotal(data?.total ?? 0);
      setPages(data?.pages ?? 1);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load suppliers.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingSupplier(null);
    setFormOpen(true);
  }

  function openEdit(supplier) {
    setEditingSupplier(supplier);
    setFormOpen(true);
  }

  async function deleteSupplier() {
    if (!deleteTarget?._id || deleting) return;
    setDeleting(true);
    try {
      const { data } = await api.delete(`/users/${deleteTarget._id}`);
      toast.success(data?.message || "Supplier deleted successfully.");
      setDeleteTarget(null);
      await load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to delete supplier.");
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: "image", header: "Logo", render: (supplier) => supplier.image
      ? <img alt="" className="size-10 rounded-full object-cover" src={supplier.image} />
      : <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">{supplier.name?.trim()?.charAt(0)?.toUpperCase() || "?"}</span> },
    { key: "name", header: "Name", render: (supplier) => <div><p className="font-semibold text-app-text">{supplier.name || "—"}</p><p className="text-xs text-app-muted">{supplier.companyName || "—"}</p></div> },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone", render: (supplier) => supplier.phone || "—" },
    { key: "productCount", header: "Products", render: (supplier) => supplier.productCount ?? 0 },
    { key: "pendingRequests", header: "Pending Requests", render: (supplier) => supplier.pendingRequests > 0
      ? <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">{supplier.pendingRequests}</span>
      : supplier.pendingRequests ?? 0 },
    { key: "approvedRequests", header: "Approved", render: (supplier) => supplier.approvedRequests ?? 0 },
    { key: "actions", header: "Actions", render: (supplier) => <div className="flex items-center gap-2">
      <Link className="font-semibold text-accent" to={`/admin/suppliers/${supplier._id}`}>View</Link>
      <Button size="sm" variant="secondary" onClick={() => openEdit(supplier)}>Edit</Button>
      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(supplier)}>Delete</Button>
    </div> },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Suppliers" subtitle={`${total} supplier${total === 1 ? "" : "s"}`}
        action={<Button onClick={openCreate}>Add Supplier</Button>} />
      <div className="mb-5 max-w-xl"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search name, email or company" /></div>
      {error && <div className="mb-4 flex items-center justify-between rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><Button disabled={loading} onClick={load} size="sm" variant="danger">Retry</Button></div>}
      <DataTable columns={columns} data={suppliers} loading={loading} emptyMessage="No suppliers found." />
      {pages > 1 && <div className="mt-4 flex items-center justify-center gap-3"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm text-app-muted">Page {page} of {pages}</span><Button variant="secondary" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
      <UserFormModal isOpen={formOpen} lockedRole="supplier" onClose={() => setFormOpen(false)}
        onSaved={load} user={editingSupplier} />
      <ConfirmDialog isOpen={Boolean(deleteTarget)} title="Delete supplier?"
        message={`Delete ${deleteTarget?.name || "this supplier"}? This action cannot be undone.`}
        confirmText="Delete Supplier" danger loading={deleting} onCancel={() => { if (!deleting) setDeleteTarget(null); }} onConfirm={deleteSupplier} />
    </div>
  );
}
