import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { formatNumber } from "../../utils/format.js";
import SearchInput from "../../components/SearchInput.jsx";
import Select from "../../components/Select.jsx";
import useDebounce from "../../hooks/useDebounce.js";

export default function Inventory() {
  const [stock, setStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/stock", {
        params: {
          search: debouncedSearch || undefined,
          warehouse: warehouse || undefined,
          page,
          limit: 10,
        },
      });
      setStock(Array.isArray(data?.stock) ? data.stock : []);
      setTotal(data?.total ?? 0);
      setPages(data?.pages ?? 1);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load inventory.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, warehouse]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/warehouses/options")
      .then(({ data }) => setWarehouses(Array.isArray(data?.warehouses) ? data.warehouses : []))
      .catch((requestError) => toast.error(requestError.response?.data?.message || "Unable to load warehouses."));
  }, []);

  const columns = useMemo(() => [
    {
      key: "product",
      header: "Product",
      render: (row) => (
        <div>
          <p className="font-medium text-app-text">{row?.product?.name || "Unknown product"}</p>
          <p className="font-mono text-xs text-app-muted">{row?.product?.sku || "—"}</p>
        </div>
      ),
    },
    { key: "warehouse", header: "Warehouse", render: (row) => row?.warehouse?.name || "—" },
    { key: "quantity", header: "Quantity", render: (row) => formatNumber(row?.quantity ?? 0) },
    {
      key: "lowStockLimit",
      header: "Low-stock limit",
      render: (row) => row?.product?.lowStockLimit ?? 0,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => row?.isLowStock
        ? <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">Low stock</span>
        : <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success">In stock</span>,
    },
  ], []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Inventory" subtitle={`${total.toLocaleString()} stock records in your assigned warehouses.`} />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SearchInput
          placeholder="Search product name or SKU"
          value={search}
          onChange={(value) => { setPage(1); setSearch(value); }}
        />
        <Select
          aria-label="Filter by warehouse"
          value={warehouse}
          onChange={(event) => { setPage(1); setWarehouse(event.target.value); }}
        >
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
      <DataTable columns={columns} data={stock} loading={loading} emptyMessage="No inventory records found." />
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
