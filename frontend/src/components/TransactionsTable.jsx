import EmptyState from "./EmptyState.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { formatDate, formatNumber } from "../utils/format.js";

export default function TransactionsTable({ transactions = [], loading = false, showPerformedBy = false }) {
  const rows = Array.isArray(transactions) ? transactions.filter(Boolean) : [];
  return (
    <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <thead className="sticky top-0 bg-app-subtle text-xs uppercase tracking-wide text-app-muted">
          <tr>
            <th className="px-4 py-3">Date</th><th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Warehouse</th><th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Note</th>
            {showPerformedBy && <th className="px-4 py-3">Performed By</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border">
          {loading ? <tr><td className="px-4 py-8 text-center text-app-muted" colSpan={showPerformedBy ? 7 : 6}>Loading transactions...</td></tr>
            : rows.length ? rows.map((row) => <tr className="h-11 text-app-text hover:bg-app-subtle" key={row._id}>
              <td className="whitespace-nowrap px-4 py-2">{formatDate(row.date)}</td>
              <td className="px-4 py-2"><p className="font-medium text-app-text">{row.product?.name || "—"}</p><p className="font-mono text-xs text-app-muted">{row.product?.sku || ""}</p></td>
              <td className="px-4 py-2">{row.warehouse?.name || "—"}</td>
              <td className="px-4 py-2"><StatusBadge status={row.transactionType} /></td>
              <td className="px-4 py-2 text-right tabular-nums">{formatNumber(row.quantity ?? 0)}</td>
              <td className="max-w-64 truncate px-4 py-2" title={row.note || ""}>{row.note || "—"}</td>
              {showPerformedBy && <td className="px-4 py-2">{row.performedBy?.name || "—"}</td>}
            </tr>) : <tr><td colSpan={showPerformedBy ? 7 : 6} className="px-4 py-2"><EmptyState message="No stock transactions found." /></td></tr>}
        </tbody>
      </table>
    </div>
  );
}
