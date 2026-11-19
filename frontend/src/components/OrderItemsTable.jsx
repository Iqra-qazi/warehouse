import { formatCurrency, formatNumber } from "../utils/format.js";

export default function OrderItemsTable({ items = [], editable = false, quantities = {}, availability = {}, onQuantityChange, onRemove }) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="overflow-x-auto rounded-lg border border-app-border bg-app-surface">
      <table className="w-full min-w-[680px] text-left text-[13px]">
        <thead className="sticky top-0 bg-app-subtle text-xs uppercase text-app-muted">
          <tr>
            <th className="px-4 py-3">Product</th><th className="px-4 py-3">Unit Price</th>
            <th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Line Total</th>
            {editable && <th className="px-4 py-3">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border">
          {safeItems.map((item, index) => {
            const product = item.product || item;
            const id = product._id || item.product;
            const quantity = editable ? Number(quantities[id] ?? item.quantity ?? 0) : Number(item.quantity ?? 0);
            const price = Number(item.price ?? product.price ?? 0);
            const max = availability[id];
            return (
              <tr className="h-11 text-app-text hover:bg-app-subtle" key={id || index}>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    {product.imageUrl && <img alt="" className="size-8 rounded-md object-cover" src={product.imageUrl} />}
                    <div><p className="font-medium">{product.name || "Product"}</p><p className="font-mono text-xs text-app-muted">{product.sku || "—"}</p></div>
                  </div>
                </td>
                <td className="px-4 py-2 tabular-nums">{formatCurrency(price)}</td>
                <td className="px-4 py-2 tabular-nums">
                  {editable ? (
                    <div>
                      <input className="h-9 w-24 rounded-md border border-app-border bg-app-surface px-3 text-app-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" min="1" max={max} type="number" step="1"
                        value={quantities[id] ?? item.quantity ?? 1} onChange={(event) => onQuantityChange?.(id, event.target.value)} />
                      {Number.isInteger(quantity) && quantity > 0 && max !== undefined && quantity > max &&
                        <p className="mt-1 text-xs font-medium text-danger">Only {max} available</p>}
                    </div>
                  ) : formatNumber(quantity)}
                </td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">{formatCurrency(quantity * price)}</td>
                {editable && <td className="px-4 py-2"><button className="text-sm font-medium text-danger hover:underline" type="button" onClick={() => onRemove?.(id)}>Remove</button></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
