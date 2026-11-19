import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import DataTable from "../../components/DataTable.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import Loader from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format.js";

export default function SupplierDetails() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/users/suppliers/${id}`);
      setSupplier(data?.supplier ?? null);
      setProducts(Array.isArray(data?.products) ? data.products : []);
      setRequests(Array.isArray(data?.recentRequests) ? data.recentRequests : []);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load supplier details.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader />;
  if (!supplier) return <EmptyState title="Supplier unavailable" message={error || "Supplier not found."}
    action={<div className="flex items-center gap-3"><Link className="font-semibold text-accent" to="/admin/suppliers">Back to suppliers</Link>{error && <button className="font-semibold text-accent" onClick={load}>Retry</button>}</div>} />;

  const productColumns = [
    { key: "image", header: "Image", render: (product) => product.imageUrl ? <img alt="" className="size-10 rounded-lg object-cover" src={product.imageUrl} /> : "—" },
    { key: "name", header: "Product", render: (product) => product.name || "—" },
    { key: "sku", header: "SKU" },
    { key: "price", header: "Price", render: (product) => formatCurrency(product.price) },
  ];
  const requestColumns = [
    { key: "createdAt", header: "Date", render: (request) => formatDate(request.createdAt) },
    { key: "product", header: "Product", render: (request) => request.product?.name || "—" },
    { key: "warehouse", header: "Warehouse", render: (request) => request.warehouse?.name || "—" },
    { key: "quantity", header: "Quantity", render: (request) => formatNumber(request.quantity ?? 0) },
    { key: "status", header: "Status", render: (request) => <StatusBadge status={request.status} /> },
    { key: "reviewNote", header: "Review Note", render: (request) => request.reviewNote || "—" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={supplier.name || "Supplier"} subtitle="Supplier profile and linked activity."
        action={<Link className="rounded-lg border border-app-border px-4 py-2 text-sm font-semibold text-app-text hover:bg-app-subtle" to="/admin/suppliers">Back to Suppliers</Link>} />
      {error && <div className="mb-4 flex justify-between rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><button className="font-semibold" onClick={load}>Retry</button></div>}
      <section className="mb-6 flex flex-col gap-5 rounded-lg border border-app-border bg-app-surface p-5 shadow-sm sm:flex-row sm:items-center">
        {supplier.image ? <img alt="" className="size-12 rounded-full object-cover" src={supplier.image} /> : <span className="flex size-12 items-center justify-center rounded-full bg-app-subtle text-base font-medium text-app-muted">{supplier.name?.trim()?.charAt(0)?.toUpperCase() || "?"}</span>}
        <dl className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-xs uppercase text-app-muted">Email</dt><dd className="mt-1 break-all text-sm font-medium">{supplier.email || "—"}</dd></div>
          <div><dt className="text-xs uppercase text-app-muted">Phone</dt><dd className="mt-1 text-sm font-medium">{supplier.phone || "—"}</dd></div>
          <div><dt className="text-xs uppercase text-app-muted">Company</dt><dd className="mt-1 text-sm font-medium">{supplier.companyName || "—"}</dd></div>
          <div className="sm:col-span-2 lg:col-span-3"><dt className="text-xs uppercase text-app-muted">Address</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-medium">{supplier.address || "—"}</dd></div>
        </dl>
      </section>
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-app-text">Products</h2>
        <DataTable columns={productColumns} data={products} emptyMessage="No products linked to this supplier." />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-app-text">Recent Supply Requests</h2>
        <DataTable columns={requestColumns} data={requests} emptyMessage="No supply requests from this supplier." />
      </section>
    </div>
  );
}
