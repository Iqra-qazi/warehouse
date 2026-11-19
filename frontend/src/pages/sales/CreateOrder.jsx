import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import { fetchAllStock } from "../../api/stock.js";
import PageHeader from "../../components/PageHeader.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import OrderItemsTable from "../../components/OrderItemsTable.jsx";
import Button from "../../components/Button.jsx";
import Loader from "../../components/Loader.jsx";
import { formatCurrency } from "../../utils/format.js";

export default function CreateOrder() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [warehouse, setWarehouse] = useState(params.get("warehouse") || "");
  const [pendingWarehouse, setPendingWarehouse] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(params.get("product") || "");
  const [quantity, setQuantity] = useState("1");
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [showWarehouseConfirm, setShowWarehouseConfirm] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError("");
    try {
      const [warehousesResponse, stockRecords] = await Promise.all([
        api.get("/warehouses/options"),
        fetchAllStock(),
      ]);
      setWarehouses(Array.isArray(warehousesResponse.data?.warehouses) ? warehousesResponse.data.warehouses : []);
      setStock(stockRecords);
    } catch (error) {
      const message = error.response?.data?.message || "Unable to load order options.";
      setOptionsError(message);
      toast.error(message);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const availableRows = useMemo(() => stock.filter((row) =>
    warehouse && String(row.warehouse?._id ?? row.warehouse) === String(warehouse) &&
    row.product && Number(row.quantity) > 0
  ), [stock, warehouse]);

  const availability = useMemo(() => Object.fromEntries(cart.map((item) => {
    const row = availableRows.find((row) => String(row.product._id) === String(item.product._id));
    return [item.product._id, Number(row?.quantity ?? 0)];
  })), [cart, availableRows]);
  const quantities = useMemo(() => Object.fromEntries(cart.map((item) => [item.product._id, item.quantity])), [cart]);
  const grandTotal = cart.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.product.price || 0), 0);
  const phoneValid = /^[0-9+\-\s]{7,15}$/.test(customerPhone) &&
    (customerPhone.match(/\d/g)?.length ?? 0) >= 7 &&
    (customerPhone.match(/\d/g)?.length ?? 0) <= 15;
  const cartValid = cart.length > 0 && cart.every((item) => {
    const max = availability[item.product._id];
    return Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= max;
  });

  const changeWarehouse = (next) => {
    if (cart.length && next !== warehouse) {
      setPendingWarehouse(next); setShowWarehouseConfirm(true);
    } else setWarehouse(next);
  };

  const addProduct = () => {
    const row = availableRows.find((item) => String(item.product._id) === String(selectedProduct));
    const amount = Number(quantity);
    if (!row) {
      const message = "Select an available product.";
      setValidation((current) => ({ ...current, selectedProduct: message }));
      toast.error(message);
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      const message = "Quantity must be a positive integer.";
      setValidation((current) => ({ ...current, quantity: message }));
      toast.error(message);
      return;
    }
    if (amount > Number(row.quantity)) {
      const message = `Only ${row.quantity} available`;
      setValidation((current) => ({ ...current, quantity: message }));
      toast.error(message);
      return;
    }
    const existing = cart.find((item) => String(item.product._id) === String(row.product._id));
    if (existing && Number(existing.quantity) + amount > Number(row.quantity)) {
      const message = `Only ${row.quantity} available`;
      setValidation((current) => ({ ...current, quantity: message }));
      toast.error(message);
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => String(item.product._id) === String(row.product._id));
      if (existing) return current.map((item) => String(item.product._id) === String(row.product._id)
        ? { ...item, quantity: Number(existing.quantity) + amount }
        : item);
      return [...current, { product: row.product, quantity: amount }];
    });
    setValidation((current) => ({ ...current, selectedProduct: "", quantity: "", cart: "" }));
  };

  const updateQuantity = (id, value) => {
    setCart((current) => current.map((item) => String(item.product._id) === String(id)
      ? { ...item, quantity: value === "" ? "" : Number(value) } : item));
    setValidation((current) => ({ ...current, cart: "" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const errors = {};
    if (!customerName.trim()) errors.customerName = "Customer name is required.";
    if (!phoneValid) errors.customerPhone = "Enter a valid phone number with 7–15 digits.";
    if (!warehouse) errors.warehouse = warehouses.length ? "Select a warehouse." : "No warehouses are available.";
    if (!cart.length) errors.cart = "Add at least one product to the order.";
    else if (!cartValid) errors.cart = "Check quantities; each must be a positive whole number within available stock.";
    setValidation(errors);
    if (Object.keys(errors).length) {
      toast.error(Object.values(errors)[0]);
      return;
    }
    setSubmitError("");
    setSaving(true);
    try {
      const { data } = await api.post("/orders", {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        warehouse: String(warehouse),
        products: cart.map((item) => ({
          product: String(item.product._id),
          quantity: Number(item.quantity),
        })),
      });
      if (!data?.order?._id) throw new Error("The server returned an invalid order response.");
      toast.success(data.order.orderNumber ? `Order ${data.order.orderNumber} created` : "Order created");
      navigate(`/sales/orders/${data.order._id}`);
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Unable to place order.";
      setSubmitError(message);
      toast.error(message);
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Create Order" subtitle="Build a sales order for a customer." />
      {optionsError && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger">
          <span>{optionsError}</span>
          <Button disabled={optionsLoading} onClick={loadOptions} size="sm" variant="danger">Retry</Button>
        </div>
      )}
      {optionsLoading && <div className="mb-4"><Loader /></div>}
      {submitError && <p className="mb-4 rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger" role="alert">{submitError}</p>}
      <form onSubmit={submit} className="space-y-5">
        <section className="grid grid-cols-1 gap-4 rounded-lg border border-app-border bg-app-surface p-5 md:grid-cols-3">
          <label className="text-sm font-medium text-app-text">Customer name *<input aria-invalid={Boolean(validation.customerName)} className="mt-1 h-9 w-full rounded-md border border-app-border bg-app-surface px-3 text-app-text" value={customerName} onChange={(event) => { setCustomerName(event.target.value); setValidation((current) => ({ ...current, customerName: "" })); }} />{validation.customerName && <span className="mt-1 block text-xs text-danger" role="alert">{validation.customerName}</span>}</label>
          <label className="text-sm font-medium text-app-text">Customer phone *<input aria-invalid={Boolean(validation.customerPhone)} className="mt-1 h-9 w-full rounded-md border border-app-border bg-app-surface px-3 text-app-text" value={customerPhone} onChange={(event) => { setCustomerPhone(event.target.value); setValidation((current) => ({ ...current, customerPhone: "" })); }} /><span className="mt-1 block text-xs font-normal text-app-muted">Use 7–15 digits; spaces, + and - allowed</span>{validation.customerPhone && <span className="mt-1 block text-xs text-danger" role="alert">{validation.customerPhone}</span>}</label>
          <label className="text-sm font-medium text-app-text">Warehouse *<select aria-invalid={Boolean(validation.warehouse)} className="mt-1 h-9 w-full rounded-md border border-app-border bg-app-surface px-3 text-app-text" value={warehouse} onChange={(event) => { changeWarehouse(event.target.value); setValidation((current) => ({ ...current, warehouse: "" })); }} disabled={optionsLoading}><option value="">Select warehouse</option>{warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>{validation.warehouse && <span className="mt-1 block text-xs text-danger" role="alert">{validation.warehouse}</span>}</label>
        </section>
        <section className="rounded-lg border border-app-border bg-app-surface p-5">
          <h2 className="mb-3 font-semibold text-app-text">Add product</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_auto]">
            <select aria-invalid={Boolean(validation.selectedProduct)} className="h-9 rounded-md border border-app-border bg-app-surface px-3 text-app-text" value={selectedProduct} onChange={(event) => { setSelectedProduct(event.target.value); setValidation((current) => ({ ...current, selectedProduct: "" })); }} disabled={!warehouse || optionsLoading}>
              <option value="">{availableRows.length ? "Select a product with stock" : warehouse ? "No stock in this warehouse" : "Select a warehouse first"}</option>{availableRows.map((row) => <option key={row.product._id} value={row.product._id}>{row.product.name} ({row.product.sku}) — {row.quantity} available — {formatCurrency(row.product.price)}</option>)}
            </select>
            <input aria-invalid={Boolean(validation.quantity)} className="h-9 rounded-md border border-app-border bg-app-surface px-3 text-app-text" type="number" min="1" step="1" value={quantity} onChange={(event) => { setQuantity(event.target.value); setValidation((current) => ({ ...current, quantity: "" })); }} />
            <Button onClick={addProduct} disabled={!warehouse || !selectedProduct}>Add to order</Button>
          </div>
          {(validation.selectedProduct || validation.quantity) && <p className="mt-2 text-sm text-danger" role="alert">{validation.selectedProduct || validation.quantity}</p>}
          {warehouse && !optionsLoading && !optionsError && availableRows.length === 0 && (
            <p className="mt-2 text-sm text-app-muted" role="status">No stock in this warehouse.</p>
          )}
        </section>
        <section className="rounded-lg border border-app-border bg-app-surface p-5">
          <OrderItemsTable items={cart.map((item) => ({ ...item, product: item.product }))} editable quantities={quantities} availability={availability}
            onQuantityChange={updateQuantity} onRemove={(id) => setCart((current) => current.filter((item) => String(item.product._id) !== String(id)))} />
          {!cart.length && <p className="py-8 text-center text-sm text-app-muted">No products added</p>}
          {validation.cart && <p className="mt-2 text-sm text-danger" role="alert">{validation.cart}</p>}
          <div className="mt-5 flex flex-col gap-3 border-t border-app-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-app-muted">Items: <strong className="text-app-text">{cart.length}</strong></div>
            <div className="text-lg font-bold text-app-text">Grand Total: {formatCurrency(grandTotal)}</div>
            <Button type="submit" loading={saving} disabled={saving || optionsLoading}>Place Order</Button>
          </div>
        </section>
      </form>
      <ConfirmDialog isOpen={showWarehouseConfirm} title="Change warehouse?" message="Changing the warehouse will clear all items from the current cart." confirmText="Clear cart"
        danger onCancel={() => { setShowWarehouseConfirm(false); setPendingWarehouse(""); }} onConfirm={() => { setCart([]); setWarehouse(pendingWarehouse); setSelectedProduct(""); setShowWarehouseConfirm(false); setPendingWarehouse(""); }} />
    </div>
  );
}
