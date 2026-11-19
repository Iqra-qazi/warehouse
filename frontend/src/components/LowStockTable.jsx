import EmptyState from "./EmptyState.jsx";
import { formatNumber } from "../utils/format.js";

export default function LowStockTable({ stock = [], loading = false }) {
  const rows = Array.isArray(stock) ? stock.filter(Boolean) : [];
  return (
    <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
      <table className="w-full min-w-[700px] text-left text-[13px]">
        <thead className="sticky top-0 bg-app-subtle text-xs uppercase tracking-wide text-app-muted">
          <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Warehouse</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Low Stock Limit</th></tr>
        </thead>
        <tbody className="divide-y divide-app-border">
          {loading ? <tr><td className="px-4 py-8 text-center text-app-muted" colSpan="5">Loading low-stock items...</td></tr>
            : rows.length ? rows.map((row) => <tr className="h-11 text-app-text hover:bg-app-subtle" key={row._id}>
              <td className="px-4 py-2"><div className="flex items-center gap-3">{row.product?.imageUrl && <img alt="" className="size-8 rounded-md object-cover" src={row.product.imageUrl} />}<span className="font-medium text-app-text">{row.product?.name || "—"}</span></div></td>
              <td className="px-4 py-2 font-mono text-xs">{row.product?.sku || "—"}</td><td className="px-4 py-2">{row.warehouse?.name || "—"}</td>
              <td className="px-4 py-2 font-medium tabular-nums">{formatNumber(row.quantity ?? 0)}</td><td className="px-4 py-2 tabular-nums">{formatNumber(row.lowStockLimit ?? row.product?.lowStockLimit ?? 0)}</td>
            </tr>) : <tr><td colSpan="5" className="px-4 py-2"><EmptyState message="No low-stock items found." /></td></tr>}
        </tbody>
      </table>
    </div>
  );
}
