import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import LowStockTable from "../../components/LowStockTable.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Select from "../../components/Select.jsx";

export default function LowStock() {
  const [stock, setStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouse, setWarehouse] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/stock/low", {
        params: { warehouse: warehouse || undefined, page, limit: 10 },
      });
      setStock(Array.isArray(data?.stock) ? data.stock : []);
      setTotal(data?.total ?? 0);
      setPages(data?.pages ?? 1);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load low-stock alerts.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [warehouse, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/warehouses/options")
      .then(({ data }) => setWarehouses(Array.isArray(data?.warehouses) ? data.warehouses : []))
      .catch((requestError) => toast.error(requestError.response?.data?.message || "Unable to load warehouses."));
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Low Stock" subtitle="Products at or below their limits in your assigned warehouses." />
      <div className={`mb-5 rounded-lg border p-4 text-sm font-semibold ${total ? "border-warning-border bg-warning-soft text-warning" : "border-app-border bg-success-soft text-success"}`}>
        {total ? `${total} products are at or below their low stock limit` : "All products are sufficiently stocked"}
      </div>
      <div className="mb-4 max-w-sm">
        <Select aria-label="Filter by warehouse" value={warehouse} onChange={(event) => { setPage(1); setWarehouse(event.target.value); }}>
          <option value="">All assigned warehouses</option>
          {warehouses.map((item) => <option key={item?._id} value={item?._id}>{item?.name}</option>)}
        </Select>
      </div>
      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger">
          <span>{error}</span>
          <Button disabled={loading} onClick={load} size="sm" variant="danger">Retry</Button>
        </div>
      )}
      <LowStockTable stock={stock} loading={loading} />
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} variant="secondary">Previous</Button>
          <span className="text-sm text-app-muted">Page {page} of {pages}</span>
          <Button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} variant="secondary">Next</Button>
        </div>
      )}
    </div>
  );
}
