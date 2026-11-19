import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import EmptyState from "../../components/EmptyState.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Button from "../../components/Button.jsx";

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/warehouses");
      setWarehouses(Array.isArray(data?.warehouses) ? data.warehouses : []);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load your warehouses.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="My Warehouses" subtitle="Warehouses assigned to your manager account." />
      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger">
          <span>{error}</span>
          <Button disabled={loading} onClick={load} size="sm" variant="danger">Retry</Button>
        </div>
      )}
      {loading ? (
        <div className="rounded-lg border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">Loading warehouses...</div>
      ) : warehouses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {warehouses.map((warehouse) => (
            <article className="rounded-lg border border-app-border bg-app-surface p-5 shadow-sm" key={warehouse?._id}>
              <h2 className="text-lg font-semibold text-app-text">{warehouse?.name || "Warehouse"}</h2>
              <p className="mt-2 text-sm text-app-muted">{warehouse?.location || "Location not provided"}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-app-border pt-4 text-sm">
                <div>
                  <dt className="text-app-muted">Capacity</dt>
                  <dd className="mt-1 font-medium text-app-text">{warehouse?.capacity ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-app-muted">Manager</dt>
                  <dd className="mt-1 font-medium text-app-text">{warehouse?.manager?.name || "You"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No warehouses are assigned to your account." />
      )}
    </div>
  );
}
