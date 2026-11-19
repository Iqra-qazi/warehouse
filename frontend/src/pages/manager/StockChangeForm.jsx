import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import Input from "../../components/Input.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import Select from "../../components/Select.jsx";
import useDebounce from "../../hooks/useDebounce.js";

export default function StockChangeForm({ direction = "in" }) {
  const isStockIn = direction === "in";
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [product, setProduct] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [validation, setValidation] = useState({});
  const [currentStock, setCurrentStock] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");
  const [stockRefreshKey, setStockRefreshKey] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const debouncedSearch = useDebounce(productSearch);

  const loadOptions = useCallback(async () => {
    setError("");
    try {
      const [productResponse, warehouseResponse] = await Promise.all([
        api.get("/products", {
          params: { search: debouncedSearch || undefined, page: 1, limit: 50 },
        }),
        api.get("/warehouses"),
      ]);
      setProducts(
        Array.isArray(productResponse.data?.products)
          ? productResponse.data.products.filter(Boolean)
          : []
      );
      setWarehouses(
        Array.isArray(warehouseResponse.data?.warehouses)
          ? warehouseResponse.data.warehouses.filter(Boolean)
          : []
      );
      setOptionsLoaded(true);
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || "Unable to load stock change options.";
      setError(message);
      toast.error(message);
      setOptionsLoaded(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  useEffect(() => {
    if (!product || !warehouse) {
      setCurrentStock(null);
      setStockLoading(false);
      setStockError("");
      return undefined;
    }

    let active = true;
    setStockLoading(true);
    setStockError("");
    api.get("/stock", {
      params: { warehouse: String(warehouse), product: String(product) },
    })
      .then(({ data }) => {
        if (!Array.isArray(data?.stock)) {
          throw new Error("The stock response did not include stock records.");
        }
        const record = data.stock.find((item) =>
          String(item?.product?._id ?? item?.product) === String(product) &&
          String(item?.warehouse?._id ?? item?.warehouse) === String(warehouse)
        );
        if (record && !Number.isFinite(Number(record.quantity))) {
          throw new Error("The stock response included an invalid quantity.");
        }
        if (active) setCurrentStock(record ? Number(record.quantity) : 0);
      })
      .catch((requestError) => {
        if (!active) return;
        const message = requestError.response?.data?.message || requestError.message || "Unable to load current stock.";
        setStockError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setStockLoading(false);
      });

    return () => { active = false; };
  }, [product, warehouse, stockRefreshKey]);

  async function submitChange() {
    if (saving) return;
    setSaving(true);
    setSubmitError("");
    try {
      const { data } = await api.post(`/stock/${direction}`, {
        product: String(product),
        warehouse: String(warehouse),
        quantity: Number(quantity),
        note: note.trim() || undefined,
      });
      if (!data?.stock || !Number.isFinite(Number(data.stock.quantity))) {
        throw new Error("The server returned an invalid stock response.");
      }
      const productName = data.stock.product?.name || selectedProduct?.name || "Product";
      const newQuantity = Number(data.stock.quantity);
      toast.success(`${productName} stock is now ${newQuantity}.`);
      setQuantity("");
      setNote("");
      setValidation({});
      setConfirmOpen(false);
      setStockRefreshKey((current) => current + 1);
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || "Unable to update stock.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function openConfirmation(event) {
    event.preventDefault();
    setSubmitError("");
    const parsedQuantity = Number(quantity);
    const errors = {};
    if (!products.some((item) => String(item?._id) === String(product))) {
      errors.product = products.length ? "Select a product." : "No products yet.";
    }
    if (!warehouses.some((item) => String(item?._id) === String(warehouse))) {
      errors.warehouse = warehouses.length
        ? "Select an assigned warehouse."
        : "No warehouse is assigned to you yet. Contact the admin.";
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      errors.quantity = "Quantity must be a positive whole number.";
    }
    if (note.length > 500) errors.note = "Note must be 500 characters or fewer.";
    setValidation(errors);
    if (Object.keys(errors).length) {
      toast.error(Object.values(errors)[0]);
      return;
    }
    setConfirmOpen(true);
  }

  const selectedProduct = products.find((item) => String(item?._id) === String(product));
  const selectedWarehouse = warehouses.find((item) => String(item?._id) === String(warehouse));
  const title = isStockIn ? "Add Stock" : "Remove Stock";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={title}
        subtitle={isStockIn
          ? "Record incoming inventory for an assigned warehouse."
          : "Remove inventory from an assigned warehouse."}
      />
      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger">
          <span>{error}</span>
          <Button
            disabled={saving}
            onClick={loadOptions}
            size="sm"
            variant="danger"
          >
            Retry
          </Button>
        </div>
      )}
      <form className="space-y-5 rounded-lg border border-app-border bg-app-surface p-5 shadow-sm sm:p-7" onSubmit={openConfirmation}>
        {submitError && <p className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger" role="alert">{submitError}</p>}
        <SearchInput
          onChange={setProductSearch}
          placeholder="Search products by name or SKU"
          value={productSearch}
        />
        <Select
          disabled={!products.length}
          error={validation.product}
          hint={optionsLoaded && !products.length
            ? productSearch ? "No products match this search." : "No products yet."
            : undefined}
          label="Product"
          required
          value={product}
          onChange={(event) => {
            setProduct(event.target.value);
            setValidation((current) => ({ ...current, product: "" }));
          }}
        >
          <option value="">Select a product</option>
          {products.map((item) => (
            <option key={String(item?._id)} value={String(item?._id ?? "")}>
              {item?.name || "Product"} ({item?.sku || "No SKU"})
            </option>
          ))}
        </Select>
        <Select
          disabled={!warehouses.length}
          error={validation.warehouse}
          hint={optionsLoaded && !warehouses.length
            ? "No warehouse is assigned to you yet. Contact the admin."
            : undefined}
          label="Assigned warehouse"
          required
          value={warehouse}
          onChange={(event) => {
            setWarehouse(event.target.value);
            setValidation((current) => ({ ...current, warehouse: "" }));
          }}
        >
          <option value="">Select a warehouse</option>
          {warehouses.map((item) => <option key={String(item?._id)} value={String(item?._id ?? "")}>{item?.name}</option>)}
        </Select>
        <Input
          error={validation.quantity}
          label="Quantity"
          min="1"
          onChange={(event) => {
            setQuantity(event.target.value);
            setValidation((current) => ({ ...current, quantity: "" }));
          }}
          required
          step="1"
          type="number"
          value={quantity}
        />
        <Input
          error={validation.note}
          label="Note (optional)"
          maxLength={500}
          onChange={(event) => {
            setNote(event.target.value);
            setValidation((current) => ({ ...current, note: "" }));
          }}
          value={note}
        />
        {selectedProduct && selectedWarehouse && (
          <div className="rounded-lg bg-app-subtle p-3 text-sm text-app-muted" aria-live="polite">
            <p>{selectedProduct.name} at {selectedWarehouse.name}</p>
            {stockLoading
              ? <p className="mt-1">Loading current stock…</p>
              : stockError
                ? <p className="mt-1 text-danger">{stockError}</p>
                : currentStock !== null && <p className="mt-1">Current stock: {currentStock.toLocaleString()}</p>}
          </div>
        )}
        <Button className="w-full sm:w-auto" disabled={saving || !products.length || !warehouses.length} type="submit">
          {title}
        </Button>
      </form>
      <ConfirmDialog
        confirmText={isStockIn ? "Add stock" : "Remove stock"}
        danger={!isStockIn}
        isOpen={confirmOpen}
        loading={saving}
        message={`${isStockIn ? "Add" : "Remove"} ${quantity || 0} units of ${selectedProduct?.name || "the selected product"} ${isStockIn ? "to" : "from"} ${selectedWarehouse?.name || "the selected warehouse"}?`}
        onCancel={() => { if (!saving) setConfirmOpen(false); }}
        onConfirm={submitChange}
        title={`Confirm ${title.toLowerCase()}`}
      />
    </div>
  );
}
