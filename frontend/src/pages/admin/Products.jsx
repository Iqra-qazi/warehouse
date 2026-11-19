import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import DataTable from "../../components/DataTable.jsx";
import ImageUploader from "../../components/ImageUploader.jsx";
import Input from "../../components/Input.jsx";
import Modal from "../../components/Modal.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import Select from "../../components/Select.jsx";

const pageSize = 10;

function emptyForm() {
  return {
    name: "",
    sku: "",
    description: "",
    category: "",
    price: "",
    lowStockLimit: "10",
    supplier: "",
    imageUrl: "",
    imageFileId: "",
  };
}

function getArray(data, key) {
  if (Array.isArray(data)) return data.filter(Boolean);
  if (Array.isArray(data?.[key])) return data[key].filter(Boolean);
  if (Array.isArray(data?.data?.[key])) return data.data[key].filter(Boolean);
  return [];
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) ? `Rs. ${price.toLocaleString("en-PK")}` : "—";
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [imageTouched, setImageTouched] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const [productsResponse, categoriesResponse, suppliersResponse] = await Promise.all([
        api.get("/products", {
          params: {
            search: search || undefined,
            category: category || undefined,
            page,
            limit: pageSize,
          },
        }),
        api.get("/products/categories"),
        api.get("/users", { params: { role: "supplier" } }),
      ]);

      const productData = productsResponse.data;
      const nextProducts = Array.isArray(productData?.products)
        ? productData.products
        : getArray(productData, "products");
      const nextPages = Number.isInteger(productData?.pages) && productData.pages >= 0
        ? productData.pages
        : 0;
      const responsePage = Number.isInteger(productData?.page) && productData.page > 0
        ? productData.page
        : page;

      setProducts(nextProducts);
      setCategories(getArray(categoriesResponse.data, "categories"));
      setSuppliers(getArray(suppliersResponse.data, "users"));
      setTotal(Number.isFinite(productData?.total) ? productData.total : nextProducts.length);
      setPages(nextPages);
      setPage(nextPages ? Math.min(responsePage, nextPages) : 1);
    } catch (error) {
      const message = getErrorMessage(error, "Unable to load products.");
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [category, page, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreateModal() {
    setEditingProduct(null);
    setForm(emptyForm());
    setFormErrors({});
    setImageTouched(false);
    setModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);
    setForm({
      name: product?.name || "",
      sku: product?.sku || "",
      description: product?.description || "",
      category: product?.category || "",
      price: product?.price === undefined ? "" : String(product.price),
      lowStockLimit: String(product?.lowStockLimit ?? 10),
      supplier: String(product?.supplier?._id || product?.supplier || ""),
      imageUrl: product?.imageUrl || "",
      imageFileId: product?.imageFileId || "",
    });
    setFormErrors({});
    setImageTouched(false);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving || uploadingImage) return;
    setModalOpen(false);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: "" }));
  }

  function validateForm() {
    const errors = {};
    if (!form.name.trim()) errors.name = "Product name is required.";
    if (!form.sku.trim()) errors.sku = "SKU is required.";
    if (!form.category.trim()) errors.category = "Category is required.";

    const price = Number(form.price);
    if (form.price.trim() === "" || !Number.isFinite(price) || price < 0) {
      errors.price = "Price must be a number greater than or equal to 0.";
    }

    const lowStockLimit = Number(form.lowStockLimit);
    if (
      form.lowStockLimit.trim() === "" ||
      !Number.isInteger(lowStockLimit) ||
      lowStockLimit < 0
    ) {
      errors.lowStockLimit = "Low stock limit must be a non-negative integer.";
    }
    if (form.supplier && !suppliers.some((supplier) => String(supplier?._id) === String(form.supplier))) {
      errors.supplier = "Select an existing supplier.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    if (uploadingImage) {
      toast.error("Wait for the image upload to finish.");
      return;
    }
    if (!validateForm()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      description: form.description.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      lowStockLimit: Number(form.lowStockLimit),
    };
    if (form.supplier) {
      payload.supplier = String(form.supplier);
    } else if (editingProduct?._id) {
      payload.supplier = null;
    }
    if (form.imageUrl && form.imageFileId) {
      payload.imageUrl = form.imageUrl;
      payload.imageFileId = form.imageFileId;
    } else if (imageTouched && editingProduct?._id) {
      payload.imageUrl = null;
      payload.imageFileId = null;
    }

    setSaving(true);
    try {
      if (editingProduct?._id) {
        await api.put(`/products/${editingProduct._id}`, payload);
        toast.success("Product updated successfully.");
      } else {
        await api.post("/products", payload);
        toast.success("Product created successfully.");
      }
      setModalOpen(false);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save product."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!productToDelete?._id || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${productToDelete._id}`);
      toast.success("Product deleted successfully.");
      setProductToDelete(null);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete product."));
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: "product",
      header: "Product",
      render: (product) => (
        <div className="flex min-w-48 items-center gap-3">
          {product?.imageUrl ? (
            <img
              alt=""
              className="size-11 rounded-lg border border-app-border object-cover"
              src={product.imageUrl}
            />
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft font-bold text-accent">
              {product?.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-app-text">{product?.name || "—"}</p>
            <p className="mt-0.5 text-xs text-app-muted">{product?.sku || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (product) => product?.category || "—" },
    { key: "price", header: "Price", render: (product) => formatPrice(product?.price) },
    {
      key: "lowStockLimit",
      header: "Low Stock Limit",
      render: (product) => product?.lowStockLimit ?? 10,
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (product) => product?.supplier?.name || "Unassigned",
    },
    {
      key: "actions",
      header: "Actions",
      render: (product) => (
        <div className="flex items-center gap-2">
          <Button onClick={() => openEditModal(product)} size="sm" variant="secondary">
            Edit
          </Button>
          <Button onClick={() => setProductToDelete(product)} size="sm" variant="danger">
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        action={<Button onClick={openCreateModal}>Add Product</Button>}
        subtitle="Manage product details, pricing, supplier links, and stock thresholds."
        title="Products"
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <SearchInput
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by product name or SKU..."
          value={search}
        />
        <Select
          aria-label="Filter products by category"
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          value={category}
        >
          <option value="">All categories</option>
          {categories.map((categoryName) => (
            <option key={categoryName} value={categoryName}>{categoryName}</option>
          ))}
        </Select>
      </div>

      {listError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-danger-soft bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-danger">{listError}</p>
          <Button disabled={loading} onClick={loadData} size="sm" variant="danger">
            Retry
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={products}
        emptyMessage="No products match these filters."
        loading={loading}
      />

      <div className="mt-4 flex flex-col gap-3 text-sm text-app-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{total} product{total === 1 ? "" : "s"}</p>
        {pages > 0 && (
          <div className="flex items-center justify-end gap-3">
            <Button
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              size="sm"
              variant="secondary"
            >
              Previous
            </Button>
            <span aria-live="polite">Page {page} of {pages}</span>
            <Button
              disabled={loading || page >= pages}
              onClick={() => setPage((current) => Math.min(pages, current + 1))}
              size="sm"
              variant="secondary"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <Modal
        closeOnBackdrop={!saving && !uploadingImage}
        closeOnEscape={!saving && !uploadingImage}
        isOpen={modalOpen}
        onClose={closeModal}
        size="lg"
        title={editingProduct ? "Edit Product" : "Add Product"}
      >
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              error={formErrors.name}
              label="Product name"
              name="name"
              onChange={updateField}
              required
              value={form.name}
            />
            <Input
              error={formErrors.sku}
              label="SKU"
              name="sku"
              onChange={updateField}
              required
              value={form.sku}
            />
            <Input
              error={formErrors.category}
              label="Category"
              list="product-categories"
              name="category"
              onChange={updateField}
              required
              value={form.category}
            />
            <datalist id="product-categories">
              {categories.map((categoryName) => (
                <option key={categoryName} value={categoryName} />
              ))}
            </datalist>
            <Input
              error={formErrors.price}
              label="Price (Rs.)"
              min="0"
              name="price"
              onChange={updateField}
              required
              step="0.01"
              type="number"
              value={form.price}
            />
            <Input
              error={formErrors.lowStockLimit}
              label="Low stock limit"
              min="0"
              name="lowStockLimit"
              onChange={updateField}
              required
              step="1"
              type="number"
              value={form.lowStockLimit}
            />
            <Select
              error={formErrors.supplier}
              hint={suppliers.length ? undefined : "No suppliers yet. Create one in Users first."}
              label="Supplier"
              name="supplier"
              onChange={updateField}
              value={form.supplier}
            >
              <option value="">Unassigned</option>
              {suppliers.map((supplier) => (
                <option key={String(supplier?._id)} value={String(supplier?._id ?? "")}>
                  {supplier?.name || supplier?.email || "Supplier"}
                </option>
              ))}
            </Select>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-app-text" htmlFor="product-description">
                Description
              </label>
              <textarea
                className="block min-h-24 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-sm outline-none transition placeholder:text-app-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
                id="product-description"
                name="description"
                onChange={updateField}
                value={form.description}
              />
            </div>
            <div className="md:col-span-2">
              <ImageUploader
                disabled={saving || uploadingImage}
                folder="products"
                label="Product Image"
                onUploadingChange={setUploadingImage}
                onUpload={(image) => {
                  setImageTouched(true);
                  setForm((current) => ({
                    ...current,
                    imageUrl: image?.url || "",
                    imageFileId: image?.fileId || "",
                  }));
                }}
                value={{ url: form.imageUrl, fileId: form.imageFileId }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-app-border pt-4">
            <Button disabled={saving || uploadingImage} onClick={closeModal} variant="secondary">
              Cancel
            </Button>
            <Button disabled={uploadingImage} loading={saving} type="submit">
              {saving ? "Saving..." : editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmText="Delete Product"
        danger
        isOpen={Boolean(productToDelete)}
        loading={deleting}
        message={`Delete ${productToDelete?.name || "this product"}? Products linked to stock, orders, or supply requests cannot be deleted.`}
        onCancel={() => {
          if (!deleting) setProductToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Product"
      />
    </div>
  );
}
