import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import EmptyState from "../../components/EmptyState.jsx";
import Loader from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import { formatCurrency } from "../../utils/format.js";

export default function SupplierProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/products", { params: { search: search || undefined, page, limit: 12 } });
      setProducts(Array.isArray(data?.products) ? data.products : []);
      setPages(data?.pages ?? 1);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load your products.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="My Products" subtitle="Products linked to your supplier account." />
      <div className="mb-5 max-w-lg"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search product name or SKU" /></div>
      {error && <div className="mb-4 flex items-center justify-between rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><button className="font-semibold" disabled={loading} onClick={load}>Retry</button></div>}
      {loading ? <Loader /> : products.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <article key={product._id} className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
              <div className="flex h-44 items-center justify-center bg-app-subtle">{product.imageUrl ? <img alt={product.name || "Product"} className="h-full w-full object-cover" src={product.imageUrl} /> : <span className="text-sm text-app-muted">No image</span>}</div>
              <div className="p-4">
                <h2 className="font-semibold text-app-text">{product.name || "—"}</h2>
                <p className="mt-1 text-xs text-app-muted">{product.sku || "—"} · {product.category || "—"}</p>
                <p className="mt-3 font-bold text-app-text">{formatCurrency(product.price)}</p>
                <p className="mt-1 text-sm text-app-muted">Low stock limit: {product.lowStockLimit ?? 0}</p>
                <Link className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover" to={`/supplier/submit-request?product=${product._id}`}>Request Supply</Link>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState title="No products" message="No products are linked to you yet. Contact the admin." />}
      {pages > 1 && <div className="mt-6 flex items-center justify-center gap-3"><button className="h-9 rounded-md border border-app-border bg-app-surface px-3 text-app-text text-sm disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="text-sm text-app-muted">Page {page} of {pages}</span><button className="h-9 rounded-md border border-app-border bg-app-surface px-3 text-app-text text-sm disabled:opacity-50" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </div>
  );
}
