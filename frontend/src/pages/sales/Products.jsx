import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import { fetchAllStock } from "../../api/stock.js";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import Modal from "../../components/Modal.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Loader from "../../components/Loader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { formatCurrency, formatNumber } from "../../utils/format.js";

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [availability, setAvailability] = useState("All");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [productRes, stockRes, warehouseRes, categoryRes] = await Promise.all([
        api.get("/products", { params: { search, category, page, limit: 12 } }),
        fetchAllStock(),
        api.get("/warehouses/options"),
        api.get("/products/categories"),
      ]);
      setProducts(Array.isArray(productRes.data?.products) ? productRes.data.products : []);
      setPages(productRes.data?.pages || 1);
      setStock(stockRes);
      setWarehouses(Array.isArray(warehouseRes.data?.warehouses) ? warehouseRes.data.warehouses : []);
      setCategories(Array.isArray(categoryRes.data?.categories) ? categoryRes.data.categories : []);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load products.";
      setError(message); toast.error(message);
    } finally { setLoading(false); }
  }, [search, category, page, warehouse]);

  useEffect(() => { load(); }, [load]);

  const quantityFor = (product) => {
    if (warehouse) return stock.find((row) => String(row.product?._id ?? row.product) === String(product._id) && String(row.warehouse?._id ?? row.warehouse) === String(warehouse))?.quantity ?? 0;
    return stock.filter((row) => String(row.product?._id ?? row.product) === String(product._id)).reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  };
  const hasStockForView = stock.length > 0 && (
    !warehouse || stock.some((row) => String(row.warehouse?._id ?? row.warehouse) === String(warehouse))
  );
  const visibleProducts = products.filter((product) => {
    const quantity = quantityFor(product);
    if (availability === "In stock") return quantity > 0;
    if (availability === "Out of stock") return quantity === 0;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Products" subtitle="Browse products and warehouse availability." />
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <SearchInput value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search name or SKU" />
        <select className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm" value={category} onChange={(event) => { setPage(1); setCategory(event.target.value); }}>
          <option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm" value={warehouse} onChange={(event) => { setPage(1); setWarehouse(event.target.value); }}>
          <option value="">All warehouses</option>{warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
        <select className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm" value={availability} onChange={(event) => setAvailability(event.target.value)}>
          {["All", "In stock", "Out of stock"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {error && <div className="mb-4 flex items-center justify-between rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><button className="font-semibold" onClick={load}>Retry</button></div>}
      {loading ? <Loader /> : !hasStockForView ? (
        <EmptyState
          title={warehouse ? "No stock in this warehouse" : "No stock in any warehouse"}
          message="Stock availability will appear here after stock is received."
        />
      ) : visibleProducts.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => {
            const quantity = quantityFor(product);
            const low = quantity > 0 && quantity <= (Number(product.lowStockLimit) || 0);
            const status = quantity <= 0 ? "Out of Stock" : low ? "Low Stock" : "In Stock";
            return (
              <article className="app-product-card rounded-lg border border-app-border bg-app-surface p-4 shadow-sm" key={product._id}>
                <div className="mb-3 flex h-40 items-center justify-center overflow-hidden rounded-lg bg-app-subtle">
                  {product.imageUrl ? <img className="h-full w-full object-cover" src={product.imageUrl} alt={product.name} /> : <span className="text-app-muted">No image</span>}
                </div>
                <h3 className="truncate font-semibold text-app-text" title={product.name}>{product.name}</h3><p className="font-mono text-xs text-app-muted">{product.sku} · {product.category}</p>
                <p className="mt-2 font-bold text-app-text">{formatCurrency(product.price)}</p>
                <div className="mt-2 flex items-center justify-between"><span className="text-sm tabular-nums text-app-muted">Available: {formatNumber(quantity)}</span><StatusBadge status={status} /></div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 h-9 rounded-md border border-app-border bg-app-surface px-3 text-app-text text-sm font-semibold" onClick={() => setSelected(product)}>View Details</button>
                  <button disabled={quantity <= 0} className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast disabled:opacity-50"
                    onClick={() => navigate(`/sales/create-order?product=${product._id}${warehouse ? `&warehouse=${warehouse}` : ""}`)}>Order</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : <EmptyState title="No products" message="No products match your filters." />}
      {pages > 1 && <div className="mt-6 flex justify-center gap-2"><button disabled={page <= 1} className="rounded-lg border px-3 py-2" onClick={() => setPage((value) => value - 1)}>Previous</button><span className="px-3 py-2 text-sm">Page {page} of {pages}</span><button disabled={page >= pages} className="rounded-lg border px-3 py-2" onClick={() => setPage((value) => value + 1)}>Next</button></div>}
      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name} size="lg">
        {selected && <div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg bg-app-subtle">{selected.imageUrl ? <img className="max-h-80 w-full object-contain" src={selected.imageUrl} alt={selected.name} /> : "No image"}</div>
            <div><p className="text-sm text-app-muted">{selected.sku} · {selected.category}</p><p className="mt-2 text-xl font-bold">{formatCurrency(selected.price)}</p><p className="mt-3 text-sm text-app-muted">{selected.description || "No description"}</p></div>
          </div>
          <h3 className="mt-5 mb-2 font-semibold">Stock per warehouse</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-app-subtle"><tr><th className="px-3 py-2 text-left">Warehouse</th><th className="px-3 py-2 text-right">Quantity</th></tr></thead><tbody>{stock.filter((row) => String(row.product?._id) === String(selected._id)).map((row) => <tr key={row._id} className="border-t border-app-border"><td className="px-3 py-2">{row.warehouse?.name || "—"}</td><td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.quantity)}</td></tr>)}</tbody></table></div>
        </div>}
      </Modal>
    </div>
  );
}
