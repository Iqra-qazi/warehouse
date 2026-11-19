import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import Select from "../../components/Select.jsx";
import TransactionsTable from "../../components/TransactionsTable.jsx";
import Button from "../../components/Button.jsx";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0 });
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/transactions", {
        params: {
          search: search || undefined,
          warehouse: warehouse || undefined,
          type: type || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit: 10,
        },
      });
      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
      setPages(data?.pages ?? 1);
      setSummary({
        totalIn: data?.summary?.totalIn ?? 0,
        totalOut: data?.summary?.totalOut ?? 0,
      });
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load stock transactions.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [search, warehouse, type, from, to, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/warehouses/options")
      .then(({ data }) => setWarehouses(Array.isArray(data?.warehouses) ? data.warehouses : []))
      .catch((requestError) => toast.error(requestError.response?.data?.message || "Unable to load warehouses."));
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Stock Transactions" subtitle="Review stock movements across all warehouses." />
      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <article className="rounded-lg border border-app-border bg-app-surface p-4"><p className="text-sm font-medium text-app-muted">Stock-in units</p><p className="mt-1 text-2xl font-semibold tabular-nums text-app-text">{summary.totalIn.toLocaleString()}</p></article>
        <article className="rounded-lg border border-app-border bg-app-surface p-4"><p className="text-sm font-medium text-app-muted">Stock-out units</p><p className="mt-1 text-2xl font-semibold tabular-nums text-app-text">{summary.totalOut.toLocaleString()}</p></article>
      </section>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SearchInput value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search product name or SKU" />
        <Select aria-label="Filter by warehouse" value={warehouse} onChange={(event) => { setPage(1); setWarehouse(event.target.value); }}>
          <option value="">All warehouses</option>{warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </Select>
        <Select aria-label="Filter by transaction type" value={type} onChange={(event) => { setPage(1); setType(event.target.value); }}>
          <option value="">All types</option><option value="stock-in">Stock-in</option><option value="stock-out">Stock-out</option>
        </Select>
        <label className="flex items-center gap-2 text-sm text-app-muted">From<input aria-label="From date" className="min-w-0 flex-1 h-9 rounded-md border border-app-border bg-app-surface px-2 text-app-text" type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} /></label>
        <label className="flex items-center gap-2 text-sm text-app-muted">To<input aria-label="To date" className="min-w-0 flex-1 h-9 rounded-md border border-app-border bg-app-surface px-2 text-app-text" type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} /></label>
      </div>
      {error && <div className="mb-4 flex items-center justify-between rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><Button disabled={loading} onClick={load} size="sm" variant="danger">Retry</Button></div>}
      <TransactionsTable transactions={transactions} loading={loading} showPerformedBy />
      {pages > 1 && <div className="mt-4 flex items-center justify-center gap-3"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm text-app-muted">Page {page} of {pages}</span><Button variant="secondary" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
    </div>
  );
}
