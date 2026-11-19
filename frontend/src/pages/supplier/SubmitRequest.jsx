import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import Input from "../../components/Input.jsx";
import Loader from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Select from "../../components/Select.jsx";

export default function SubmitRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedProduct = searchParams.get("product") || "";
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [product, setProduct] = useState(requestedProduct);
  const [warehouse, setWarehouse] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState({});

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResponse, warehouseResponse] = await Promise.all([
        api.get("/products", { params: { limit: 50 } }),
        api.get("/warehouses/options"),
      ]);
      const ownProducts = Array.isArray(productResponse.data?.products)
        ? productResponse.data.products.filter(Boolean)
        : [];
      const availableWarehouses = Array.isArray(warehouseResponse.data?.warehouses)
        ? warehouseResponse.data.warehouses.filter(Boolean)
        : [];
      setProducts(ownProducts);
      setWarehouses(availableWarehouses);
      setProduct(
        requestedProduct && ownProducts.some((item) => String(item?._id) === String(requestedProduct))
          ? requestedProduct
          : ""
      );
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load request options.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [requestedProduct]);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  function validate() {
    const errors = {};
    if (!products.some((item) => String(item?._id) === String(product))) {
      errors.product = products.length ? "Select a product." : "No products are linked to your account.";
    }
    if (!warehouses.some((item) => String(item?._id) === String(warehouse))) {
      errors.warehouse = warehouses.length ? "Select a warehouse." : "No warehouses are available.";
    }
    if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
      errors.quantity = "Quantity must be a positive integer.";
    }
    if (note.length > 500) errors.note = "Note must be 500 characters or fewer.";
    setValidation(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await api.post("/supply-requests", {
        product: String(product),
        warehouse: String(warehouse),
        quantity: Number(quantity),
        note: note.trim() || undefined,
      });
      toast.success("Supply request submitted");
      navigate("/supplier/requests");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to submit supply request.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Submit Supply Request" subtitle="Request a product delivery to one of the warehouses." />
      {error && <div className="mb-4 flex justify-between rounded-lg border border-danger-soft bg-danger-soft p-4 text-sm text-danger"><span>{error}</span><button className="font-semibold" disabled={loading} onClick={loadOptions}>Retry</button></div>}
      <form className="grid grid-cols-1 gap-5 rounded-lg border border-app-border bg-app-surface p-5 shadow-sm sm:p-7" onSubmit={submit}>
        <Select label="Product *" value={product} error={validation.product} onChange={(event) => { setProduct(event.target.value); setValidation((current) => ({ ...current, product: "" })); }}>
          <option value="">Select your product</option>
          {products.filter(Boolean).map((item) => <option key={item?._id} value={item?._id}>{item?.name} ({item?.sku})</option>)}
        </Select>
        <Select label="Warehouse *" value={warehouse} error={validation.warehouse} onChange={(event) => { setWarehouse(event.target.value); setValidation((current) => ({ ...current, warehouse: "" })); }}>
          <option value="">Select warehouse</option>
          {warehouses.filter(Boolean).map((item) => <option key={item?._id} value={item?._id}>{item?.name}</option>)}
        </Select>
        <Input label="Quantity *" type="number" min="1" step="1" value={quantity}
          error={validation.quantity} onChange={(event) => { setQuantity(event.target.value); setValidation((current) => ({ ...current, quantity: "" })); }} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-app-text" htmlFor="supply-request-note">Note (optional)</label>
          <textarea id="supply-request-note" className={`min-h-24 w-full rounded-lg border px-3 py-2 text-sm ${validation.note ? "border-danger-soft" : "border-app-border"}`} maxLength={500} value={note} onChange={(event) => { setNote(event.target.value); setValidation((current) => ({ ...current, note: "" })); }} />
          {validation.note && <p className="mt-1 text-xs text-danger">{validation.note}</p>}
        </div>
        <div className="flex justify-end"><Button loading={saving} disabled={saving || !products.length || !warehouses.length} type="submit">{saving ? "Submitting..." : "Submit Request"}</Button></div>
      </form>
    </div>
  );
}
